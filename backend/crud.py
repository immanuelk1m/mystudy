import json
import shutil
import uuid
from typing import List, Optional, Dict, Any, Tuple
from fastapi import UploadFile
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload, subqueryload
import os

from . import models
from .database import SessionLocal

# Base directory for the backend application
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOADS_DIR = os.path.join(STATIC_DIR, 'uploads')

if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

# --- Database-backed CRUD for Notebooks ---

def get_notebooks(db: Session) -> List[models.Notebook]:
    """Retrieves all notebooks from the database."""
    return db.query(models.Notebook).all()

def get_notebook_by_id(db: Session, notebook_id: int) -> Optional[models.Notebook]:
    """
    Retrieves a single notebook by its ID, with its chapters, files, and content
    eagerly loaded.
    """
    return db.query(models.Notebook).options(
        joinedload(models.Notebook.chapters).subqueryload(models.Chapter.files),
        joinedload(models.Notebook.chapters).subqueryload(models.Chapter.contents)
    ).filter(models.Notebook.id == notebook_id).first()

def create_notebook(db: Session, title: str, description: str) -> models.Notebook:
    """Creates a new notebook in the database."""
    new_notebook = models.Notebook(
        title=title,
        description=description,
        lastUpdated=datetime.now(),
        filesCount=0
    )
    db.add(new_notebook)
    db.commit()
    db.refresh(new_notebook)
    return new_notebook

def get_or_create_notebook(db: Session, title: str) -> models.Notebook:
    """Gets a notebook by title if it exists, otherwise creates a new one."""
    notebook = db.query(models.Notebook).filter(models.Notebook.title == title).first()
    if notebook:
        return notebook
    
    # Create new notebook if not found
    return create_notebook(db, title, f"Notebook for {title}.")

def get_all_notebook_titles(db: Session) -> List[str]:
    """Retrieves a list of all notebook titles from the database."""
    notebooks = get_notebooks(db)
    return [nb.title for nb in notebooks]

def get_chapter_by_id(db: Session, chapter_id: int) -> Optional[models.Chapter]:
    """Retrieves a single chapter by its ID, with its contents eagerly loaded."""
    return db.query(models.Chapter).options(
        joinedload(models.Chapter.contents)
    ).filter(models.Chapter.id == chapter_id).first()

def update_chapter_game_html(db: Session, chapter_id: int, game_html: str) -> Optional[models.Chapter]:
    """Updates the game_html content for a specific chapter."""
    chapter = db.query(models.Chapter).filter(models.Chapter.id == chapter_id).first()
    if chapter:
        chapter.game_html = game_html
        db.commit()
        db.refresh(chapter)
        return chapter
    return None

# The functions below still use the JSON file system.
# They will need to be migrated to a database-backed approach if chapters,
# documents, and file structures are to be stored in the database as well.
# For now, we leave them as they are to focus on the notebook migration.

def get_chapters_for_notebook(db: Session, notebook_id: int) -> List[models.Chapter]:
    """Retrieve all chapters for a given notebook from the database."""
    return db.query(models.Chapter).filter(models.Chapter.notebook_id == notebook_id).order_by(models.Chapter.order).all()

def _transform_outline_item(item: Dict[str, Any]) -> None:
    """Recursively transforms 'title' to 'text' in an outline item and its children."""
    if 'title' in item:
        item['text'] = item.pop('title') # Rename 'title' to 'text'

    if 'children' in item and isinstance(item['children'], list):
        for child in item['children']:
            if isinstance(child, dict):
                _transform_outline_item(child) # Recursively call for children

def get_document_content(db: Session, notebook_id: int, chapter_order: int) -> Optional[models.DocumentContent]:
    """Retrieves the document content for a specific chapter from the database."""
    content = db.query(models.Content).join(models.Chapter).filter(
        models.Chapter.notebook_id == notebook_id,
        models.Chapter.order == chapter_order
    ).first()

    if content and content.data:
        # The transformation logic for 'aiNotes' can be applied here if still needed
        content_data = dict(content.data)
        if 'aiNotes' in content_data and isinstance(content_data['aiNotes'], dict) and \
           'outline' in content_data['aiNotes'] and isinstance(content_data['aiNotes']['outline'], list):
            for item in content_data['aiNotes']['outline']:
                if isinstance(item, dict):
                    _transform_outline_item(item)

        # Include game_html from the related chapter
        game_html = content.chapter.game_html if content.chapter else None
        content_data['game_html'] = game_html

        try:
            return models.DocumentContent(**content_data)
        except Exception as e:
            print(f"Error parsing DocumentContent for notebook {notebook_id}, chapter order {chapter_order}: {e}")
            return None
    return None

def get_file_structure(db: Session, notebook_id: int, chapter_order: int) -> List[models.FileStructureItem]:
    """Retrieves the file structure for a specific chapter from the database."""
    files = db.query(models.File).join(models.Chapter).filter(
        models.Chapter.notebook_id == notebook_id,
        models.Chapter.order == chapter_order
    ).all()
    
    return [models.FileStructureItem(name=f.name, type=f.type, path=f.path, children=None) for f in files]

# --- Functions for AI features ---

def update_document_ai_notes(db: Session, notebook_id: int, chapter_order: int, ai_notes: models.AINotes) -> bool:
    """Updates the AINotes for a specific document content in the database."""
    content = db.query(models.Content).join(models.Chapter).filter(
        models.Chapter.notebook_id == notebook_id,
        models.Chapter.order == chapter_order
    ).first()

    if not content:
        print(f"Content not found for notebook {notebook_id}, chapter order {chapter_order}")
        return False

    # Create a copy of the data to modify
    content_data = dict(content.data)
    content_data['aiNotes'] = ai_notes.dict(exclude_none=True)
    
    content.data = content_data
    db.commit()
    return True

def save_uploaded_pdf(notebook_id: str, uploaded_file: UploadFile) -> Optional[Tuple[str, str, str]]:
    """Saves an uploaded PDF to a notebook-specific folder and returns its web path, file system path, and original filename."""
    try:
        original_filename = uploaded_file.filename
        _, extension = os.path.splitext(original_filename)
        unique_suffix = uuid.uuid4().hex[:8] # Shorter UUID for readability
        # Sanitize original filename slightly for directory name, or use a simpler scheme
        safe_original_base = "".join(c if c.isalnum() or c in (' ', '_', '-') else '_' for c in os.path.splitext(original_filename)[0])
        # Keep filenames somewhat recognizable but unique
        unique_filename = f"{safe_original_base}_{unique_suffix}{extension if extension else '.pdf'}"
        
        # Define per-notebook upload directory (not per-chapter, as chapter number is not known yet for new uploads)
        notebook_upload_dir = os.path.join(UPLOADS_DIR, notebook_id)
        os.makedirs(notebook_upload_dir, exist_ok=True)
        
        file_system_path = os.path.join(notebook_upload_dir, unique_filename)
        
        with open(file_system_path, "wb") as buffer:
            shutil.copyfileobj(uploaded_file.file, buffer)
        
        # Construct web-accessible path (relative to static mount point)
        web_path = f"/static/uploads/{notebook_id}/{unique_filename}"
        return web_path, file_system_path, original_filename
    except Exception as e:
        print(f"Error saving uploaded PDF {uploaded_file.filename}: {e}")
        return None
    finally:
        if uploaded_file and hasattr(uploaded_file, 'file') and not uploaded_file.file.closed:
             uploaded_file.file.close()


def move_temp_pdf_to_notebook_storage(temp_pdf_path: str, notebook_id: str, original_filename: str) -> Optional[Tuple[str, str]]:
    """Moves a PDF from a temporary path to a notebook-specific folder and returns its web path and new file system path."""
    try:
        _, extension = os.path.splitext(original_filename)
        unique_suffix = uuid.uuid4().hex[:8]
        safe_original_base = "".join(c if c.isalnum() or c in (' ', '_', '-') else '_' for c in os.path.splitext(original_filename)[0])
        unique_filename = f"{safe_original_base}_{unique_suffix}{extension if extension else '.pdf'}"
        
        notebook_upload_dir = os.path.join(UPLOADS_DIR, notebook_id)
        os.makedirs(notebook_upload_dir, exist_ok=True)
        
        final_file_system_path = os.path.join(notebook_upload_dir, unique_filename)
        
        shutil.move(temp_pdf_path, final_file_system_path) # Move the file
        
        web_path = f"/static/uploads/{notebook_id}/{unique_filename}"
        return web_path, final_file_system_path
    except Exception as e:
        print(f"Error moving temp PDF {original_filename} (from {temp_pdf_path}) to notebook {notebook_id}: {e}")
        # If move fails, the original temp file might still exist at temp_pdf_path
        # Consider if temp_pdf_path should be cleaned up by the caller in case of failure here.
        return None

def create_notebook_and_chapters_from_processing(
    db: Session,
    notebook_title: str,
    generated_contents: List[models.DocumentContent]
) -> Optional[str]:
    """
    Creates a notebook (or gets an existing one) and then creates all chapters
    from a list of generated DocumentContent objects.
    This function now accepts a db session to allow for transactional control.
    """
    try:
        # 1. Get or create the notebook
        notebook = get_or_create_notebook(db, title=notebook_title)
        if not notebook:
            print(f"Failed to get or create notebook with title: {notebook_title}")
            return None
        
        # Start chapter creation
        chapter_order = 1
        for content_item in generated_contents:
            # Create Chapter
            new_chapter = models.Chapter(
                title=content_item.title or f"Chapter {chapter_order}",
                order=chapter_order,
                notebook_id=notebook.id
            )
            db.add(new_chapter)
            db.flush() # Flush to get the new_chapter.id

            # Create Content
            new_content = models.Content(
                data=content_item.dict(),
                chapter_id=new_chapter.id
            )
            db.add(new_content)

            # Create File
            original_pdf_filename = "source.pdf" # Default
            if content_item.metadata and "Source: " in content_item.metadata:
                try:
                    original_pdf_filename = content_item.metadata.split(',')[0].replace('Source: ', '').strip()
                except Exception:
                    pass
            
            placeholder_path = f"/static/uploads/{notebook.id}/{original_pdf_filename}"
            new_file = models.File(
                name=original_pdf_filename,
                type="file",
                path=placeholder_path,
                chapter_id=new_chapter.id
            )
            db.add(new_file)
            
            chapter_order += 1

        # Update notebook metadata
        notebook.filesCount = len(generated_contents)
        notebook.lastUpdated = datetime.now()
        
        db.commit()
        db.refresh(notebook)
        return str(notebook.id)

    except Exception as e:
        print(f"An error occurred during notebook and chapter creation from processing: {e}")
        db.rollback()
        raise # Re-raise the exception to be caught by the caller
