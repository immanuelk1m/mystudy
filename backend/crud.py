import json
import shutil
import uuid
from typing import List, Optional, Dict, Any, Tuple
from fastapi import UploadFile
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload, subqueryload, selectinload
from sqlalchemy import and_, or_, func
from functools import lru_cache
import os

import models
from database import SessionLocal
from performance_monitor import monitor_query_performance, QueryProfiler

# Base directory for the backend application
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOADS_DIR = os.path.join(STATIC_DIR, 'uploads')

if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

# --- Database-backed CRUD for Notebooks ---

# --- Caching functions ---

@lru_cache(maxsize=128)
def get_notebooks_cached(db_id: int) -> List[models.Notebook]:
    """캐시된 노트북 목록 조회 (내부용)"""
    db = SessionLocal()
    try:
        return db.query(models.Notebook).options(
            selectinload(models.Notebook.chapters)
        ).all()
    finally:
        db.close()

@lru_cache(maxsize=256)
def get_notebook_summary_cached(notebook_id: int) -> Optional[Dict[str, Any]]:
    """캐시된 노트북 요약 정보 조회"""
    db = SessionLocal()
    try:
        return get_notebook_summary(db, notebook_id)
    finally:
        db.close()

def clear_notebook_cache():
    """노트북 관련 캐시 클리어"""
    get_notebooks_cached.cache_clear()
    get_notebook_summary_cached.cache_clear()

@monitor_query_performance
def get_notebooks(db: Session) -> List[models.Notebook]:
    """Retrieves all notebooks from the database with optimized loading."""
    return db.query(models.Notebook).options(
        selectinload(models.Notebook.chapters)
    ).all()

@monitor_query_performance
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
    """Retrieves a list of all notebook titles from the database with optimized query."""
    # Only select the title column to reduce data transfer
    titles = db.query(models.Notebook.title).all()
    return [title[0] for title in titles]

def update_notebook(db: Session, notebook_id: int, title: str = None, description: str = None) -> Optional[models.Notebook]:
    """Updates a notebook's title and/or description."""
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if not notebook:
        return None
    
    if title is not None:
        notebook.title = title
    if description is not None:
        notebook.description = description
    
    notebook.lastUpdated = datetime.now()
    db.commit()
    db.refresh(notebook)
    
    # Clear cache after update
    clear_notebook_cache()
    
    return notebook

def delete_notebook(db: Session, notebook_id: int) -> bool:
    """Deletes a notebook and all its related data (chapters, files, contents)."""
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if not notebook:
        return False
    
    # Delete all related chapters, files, and contents (cascade should handle this)
    # But we'll be explicit for safety
    chapters = db.query(models.Chapter).filter(models.Chapter.notebook_id == notebook_id).all()
    for chapter in chapters:
        # Delete contents for this chapter
        db.query(models.Content).filter(models.Content.chapter_id == chapter.id).delete()
        # Delete files for this chapter
        db.query(models.File).filter(models.File.chapter_id == chapter.id).delete()
    
    # Delete chapters
    db.query(models.Chapter).filter(models.Chapter.notebook_id == notebook_id).delete()
    
    # Delete the notebook itself
    db.delete(notebook)
    db.commit()
    
    # Clear cache after deletion
    clear_notebook_cache()
    
    return True

def get_chapter_by_id(db: Session, chapter_id: int) -> Optional[models.Chapter]:
    """Retrieves a single chapter by its ID, with its contents and files eagerly loaded."""
    return db.query(models.Chapter).options(
        joinedload(models.Chapter.contents),
        joinedload(models.Chapter.files)
    ).filter(models.Chapter.id == chapter_id).first()

# --- Optimized query functions ---

def get_notebook_summary(db: Session, notebook_id: int) -> Optional[Dict[str, Any]]:
    """Get notebook summary with chapter count and basic info without loading all data."""
    notebook = db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()
    if not notebook:
        return None
    
    chapter_count = db.query(func.count(models.Chapter.id)).filter(
        models.Chapter.notebook_id == notebook_id
    ).scalar()
    
    return {
        "id": notebook.id,
        "title": notebook.title,
        "description": notebook.description,
        "lastUpdated": notebook.lastUpdated,
        "filesCount": notebook.filesCount,
        "chapterCount": chapter_count
    }

def get_chapters_summary(db: Session, notebook_id: int) -> List[Dict[str, Any]]:
    """Get chapters summary without loading full content data."""
    chapters = db.query(
        models.Chapter.id,
        models.Chapter.title,
        models.Chapter.order,
        models.Chapter.notebook_id
    ).filter(models.Chapter.notebook_id == notebook_id).order_by(models.Chapter.order).all()
    
    return [
        {
            "id": chapter.id,
            "title": chapter.title,
            "order": chapter.order,
            "notebook_id": chapter.notebook_id
        }
        for chapter in chapters
    ]

def bulk_update_notebooks_last_updated(db: Session, notebook_ids: List[int]) -> bool:
    """Bulk update lastUpdated timestamp for multiple notebooks."""
    try:
        db.query(models.Notebook).filter(
            models.Notebook.id.in_(notebook_ids)
        ).update(
            {models.Notebook.lastUpdated: datetime.now()},
            synchronize_session=False
        )
        db.commit()
        return True
    except Exception as e:
        print(f"Error in bulk update: {e}")
        db.rollback()
        return False

def get_notebooks_with_pagination(db: Session, skip: int = 0, limit: int = 10) -> Tuple[List[models.Notebook], int]:
    """Get notebooks with pagination and total count."""
    total_count = db.query(func.count(models.Notebook.id)).scalar()
    notebooks = db.query(models.Notebook).options(
        selectinload(models.Notebook.chapters)
    ).offset(skip).limit(limit).all()
    
    return notebooks, total_count

def search_notebooks_by_title(db: Session, search_term: str, limit: int = 20) -> List[models.Notebook]:
    """Search notebooks by title with case-insensitive matching."""
    return db.query(models.Notebook).filter(
        models.Notebook.title.ilike(f"%{search_term}%")
    ).limit(limit).all()


# The functions below still use the JSON file system.
# They will need to be migrated to a database-backed approach if chapters,
# documents, and file structures are to be stored in the database as well.
# For now, we leave them as they are to focus on the notebook migration.

@monitor_query_performance
def get_chapters_for_notebook(db: Session, notebook_id: int) -> List[models.Chapter]:
    """Retrieve all chapters for a given notebook from the database with optimized loading."""
    return db.query(models.Chapter).options(
        selectinload(models.Chapter.files),
        selectinload(models.Chapter.contents)
    ).filter(models.Chapter.notebook_id == notebook_id).order_by(models.Chapter.order).all()

def _transform_outline_item(item: Dict[str, Any]) -> None:
    """Recursively transforms 'title' to 'text' in an outline item and its children."""
    if 'title' in item:
        item['text'] = item.pop('title') # Rename 'title' to 'text'

    if 'children' in item and isinstance(item['children'], list):
        for child in item['children']:
            if isinstance(child, dict):
                _transform_outline_item(child) # Recursively call for children

def get_document_content(db: Session, notebook_id: int, chapter_id: int) -> Optional[models.DocumentContent]:
    """Retrieves the document content for a specific chapter from the database with optimized query."""
    content = db.query(models.Content).join(models.Chapter).filter(
        and_(
            models.Chapter.notebook_id == notebook_id,
            models.Chapter.id == chapter_id
        )
    ).first()

    if content and content.data:
        # The transformation logic for 'aiNotes' can be applied here if still needed
        content_data = dict(content.data)
        if 'aiNotes' in content_data and isinstance(content_data['aiNotes'], dict) and \
           'outline' in content_data['aiNotes'] and isinstance(content_data['aiNotes']['outline'], list):
            for item in content_data['aiNotes']['outline']:
                if isinstance(item, dict):
                    _transform_outline_item(item)


        try:
            return models.DocumentContent(**content_data)
        except Exception as e:
            print(f"Error parsing DocumentContent for notebook {notebook_id}, chapter id {chapter_id}: {e}")
            return None
    return None

def get_file_structure(db: Session, notebook_id: int, chapter_id: int) -> List[models.FileStructureItem]:
    """Retrieves the file structure for a specific chapter from the database with optimized query."""
    files = db.query(models.File).join(models.Chapter).filter(
        and_(
            models.Chapter.notebook_id == notebook_id,
            models.Chapter.id == chapter_id
        )
    ).all()
    
    return [models.FileStructureItem(name=f.name, type=f.type, path=f.path, children=None) for f in files]

# --- Functions for AI features ---

def update_document_ai_notes(db: Session, notebook_id: int, chapter_id: int, ai_notes: models.AINotes) -> bool:
    """Updates the AINotes for a specific document content in the database with optimized query."""
    content = db.query(models.Content).join(models.Chapter).filter(
        and_(
            models.Chapter.notebook_id == notebook_id,
            models.Chapter.id == chapter_id
        )
    ).first()

    if not content:
        print(f"Content not found for notebook {notebook_id}, chapter id {chapter_id}")
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
