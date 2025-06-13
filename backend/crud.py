import json
import os
import shutil
import uuid
from typing import List, Optional, Dict, Any, Tuple
from fastapi import UploadFile
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload, subqueryload

from . import models

# Base directory for the backend application
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOADS_DIR = os.path.join(STATIC_DIR, 'uploads')

if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

LOGS_DIR = os.path.join(DATA_DIR, 'logs')
RUN_LOGS_DIR = os.path.join(LOGS_DIR, 'runs')
os.makedirs(RUN_LOGS_DIR, exist_ok=True)

def load_json(file_path: str) -> Any:
    """Helper function to load a JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error in {file_path}: {e}")
        return None

def convert_to_serializable(obj: Any) -> Any:
    """
    Recursively converts an object to a JSON-serializable format.
    Pydantic models are converted to dictionaries.
    """
    if isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_to_serializable(i) for i in obj]
    if isinstance(obj, BaseModel):
        return obj.dict()
    return obj

def _save_json(file_path: str, data: Any) -> bool:
    """Helper function to save data to a JSON file."""
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving JSON to {file_path}: {e}")
        return False

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

# The functions below still use the JSON file system.
# They will need to be migrated to a database-backed approach if chapters,
# documents, and file structures are to be stored in the database as well.
# For now, we leave them as they are to focus on the notebook migration.

def get_chapters_for_notebook(db: Session, notebook_id: int) -> Optional[models.ChapterList]:
    """Retrieves all chapters for a given notebook from the database."""
    chapters = db.query(models.Chapter).filter(models.Chapter.notebook_id == notebook_id).all()
    if not chapters:
        return None
    return models.ChapterList(chapters=chapters)

def _transform_outline_item(item: Dict[str, Any]) -> None:
    """Recursively transforms 'title' to 'text' in an outline item and its children."""
    if 'title' in item:
        item['text'] = item.pop('title') # Rename 'title' to 'text'

    if 'children' in item and isinstance(item['children'], list):
        for child in item['children']:
            if isinstance(child, dict):
                _transform_outline_item(child) # Recursively call for children

def get_document_content(notebook_id: str, chapter_number: str) -> Optional[models.DocumentContent]:
    content_path = os.path.join(DATA_DIR, 'content', notebook_id, f'{chapter_number}.json')
    content_data = load_json(content_path)

    if content_data:
        # Transform aiNotes.outline if it exists
        if 'aiNotes' in content_data and isinstance(content_data['aiNotes'], dict) and \
           'outline' in content_data['aiNotes'] and isinstance(content_data['aiNotes']['outline'], list):

            for item in content_data['aiNotes']['outline']:
                if isinstance(item, dict):
                    _transform_outline_item(item) # Call the recursive transformation function

        # Now, parse the (potentially modified) content_data
        try:
            return models.DocumentContent(**content_data)
        except Exception as e: # Catch potential Pydantic validation errors or other issues post-transformation
            print(f"Error parsing DocumentContent for notebook {notebook_id}, chapter {chapter_number} after outline transformation: {e}")
            # Depending on policy, you might raise a custom error, return None, or let it propagate
            # For now, let it propagate if it's a Pydantic error, or handle specific cases.
            # If load_json can return None for other reasons than FileNotFoundError (e.g. permission),
            # this part might still error. load_json seems to handle JSONDecodeError by returning None.
            # Re-raising or returning None would be options.
            # Given the error was a ValidationError, this try-except is good for debugging.
            # For now, if transformation is correct, this should pass.
            # If it still fails, the error will be logged by the calling router's try-except.
            raise # Re-raise the exception if parsing fails after transformation.

    return None

def get_file_structure(notebook_id: str, chapter_number: str) -> Optional[List[models.FileStructureItem]]:
    structure_path = os.path.join(DATA_DIR, 'structure', notebook_id, f'{chapter_number}.json')
    structure_data = load_json(structure_path)
    if structure_data:
        # The structure data is a list of items directly
        return [models.FileStructureItem(**item) for item in structure_data]
    return [] # Return empty list if not found, as per frontend expectation

# --- Functions for AI features ---

def update_document_ai_notes(notebook_id: str, chapter_number: str, ai_notes: models.AINotes) -> bool:
    """Updates the AINotes for a specific document content file."""
    content_path = os.path.join(DATA_DIR, 'content', notebook_id, f'{chapter_number}.json')
    content_data = load_json(content_path)
    if not content_data:
        print(f"Content file not found: {content_path}")
        return False
    
    # Update the aiNotes field - Pydantic model needs to be converted to dict for JSON serialization
    content_data['aiNotes'] = ai_notes.dict(exclude_none=True) # exclude_none to keep JSON clean
    
    return _save_json(content_path, content_data)

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

def _get_next_chapter_number_and_path_params(notebook_id: str) -> Tuple[str, str, str, str, Dict[str, Any]]:
    """
    Determines the next chapter number, creates necessary paths, and returns them
    along with the current chapter data. This makes it easier to manage state
    in the calling function without re-reading files.
    """
    chapters_file_path = os.path.join(DATA_DIR, 'chapters', f'{notebook_id}.json')
    chapters_data = load_json(chapters_file_path)
    
    # Initialize if file doesn't exist or is empty/malformed
    if not chapters_data or 'chapters' not in chapters_data:
        chapters_data = {'chapters': []}
    
    next_chapter_num = len(chapters_data['chapters']) + 1
    str_next_chapter_num = str(next_chapter_num)
    
    # Define paths and ensure directories exist
    content_dir = os.path.join(DATA_DIR, 'content', notebook_id)
    structure_dir = os.path.join(DATA_DIR, 'structure', notebook_id)
    os.makedirs(content_dir, exist_ok=True)
    os.makedirs(structure_dir, exist_ok=True)

    new_content_path = os.path.join(content_dir, f'{str_next_chapter_num}.json')
    new_structure_path = os.path.join(structure_dir, f'{str_next_chapter_num}.json')
    
    return str_next_chapter_num, chapters_file_path, new_content_path, new_structure_path, chapters_data

def create_new_chapter_from_data(
    notebook_id: str,
    generated_content: models.DocumentContent,
    pdf_web_path: str,
    original_pdf_filename: str
) -> Optional[str]:
    """Creates all necessary files and updates for a new chapter based on AI generation and PDF upload."""
    
    str_next_chapter_num, chapters_file_path, new_content_path, new_structure_path, chapters_data = _get_next_chapter_number_and_path_params(notebook_id)

    # 1. Save the new DocumentContent
    if not _save_json(new_content_path, generated_content.dict(exclude_none=True)):
        print(f"Failed to save new chapter content for notebook {notebook_id}, chapter {str_next_chapter_num}")
        return None
        
    # 2. Update the main chapter list
    new_chapter_title = generated_content.title if generated_content.title else f"Chapter {str_next_chapter_num} - {original_pdf_filename}"
    chapters_data['chapters'].append(new_chapter_title)
    if not _save_json(chapters_file_path, chapters_data):
        print(f"Failed to update chapter list for notebook {notebook_id}")
        return None
        
    # 3. Create the new structure file
    structure_content = [
        {
            "name": original_pdf_filename,
            "type": "file",
            "path": pdf_web_path
        }
    ]
    if not _save_json(new_structure_path, structure_content):
        print(f"Failed to save new chapter structure for notebook {notebook_id}, chapter {str_next_chapter_num}")
        return None
        
    return str_next_chapter_num


def create_notebook_and_chapters_from_processing(
    notebook_title: str,
    generated_contents: List[models.DocumentContent]
) -> Optional[str]:
    """
    Creates a notebook (or gets an existing one) and then creates all chapters
    from a list of generated DocumentContent objects.
    """
    try:
        # 1. Get or create the notebook
        notebook = get_or_create_notebook(notebook_title)
        if not notebook:
            print(f"Failed to get or create notebook with title: {notebook_title}")
            return None
        
        notebook_id = notebook.id

        # 2. Iterate through generated contents and create a chapter for each
        for content_item in generated_contents:
            # By calling this inside the loop, we re-evaluate the next chapter number
            # based on the *current* state of the chapters file, ensuring correctness
            # even if a previous iteration failed.
            str_next_chapter_num, chapters_file_path, new_content_path, new_structure_path, chapters_data = _get_next_chapter_number_and_path_params(notebook_id)

            # 2a. Save the new DocumentContent
            if not _save_json(new_content_path, content_item.dict(exclude_none=True)):
                print(f"Failed to save content for chapter {str_next_chapter_num} in notebook {notebook_id}")
                continue

            # 2b. Update the main chapter list
            new_chapter_title = content_item.title if content_item.title else f"Chapter {str_next_chapter_num}"
            chapters_data['chapters'].append(new_chapter_title)
            if not _save_json(chapters_file_path, chapters_data):
                print(f"Failed to update chapter list for notebook {notebook_id}")
                continue

            # 2c. Create the structure file
            original_pdf_filename = "source.pdf" # Default
            if content_item.metadata and "Source: " in content_item.metadata:
                try:
                    # Parse filename from metadata like "Source: my_file.pdf, ..."
                    original_pdf_filename = content_item.metadata.split(',')[0].replace('Source: ', '').strip()
                except Exception:
                    pass # Keep default if parsing fails

            # This path is a placeholder; real-world implementation might need a more robust way
            # to link generated content back to a specific uploaded file if multiple files are processed at once.
            placeholder_path = f"/static/uploads/{notebook_id}/{original_pdf_filename}"
            structure_content = [{
                "name": original_pdf_filename,
                "type": "file",
                "path": placeholder_path
            }]
            if not _save_json(new_structure_path, structure_content):
                print(f"Failed to save structure for chapter {str_next_chapter_num} in notebook {notebook_id}")
                continue
        
        # 3. Update the filesCount for the notebook
        # Re-load the final chapters data to get the accurate count
        final_chapters_data = load_json(os.path.join(DATA_DIR, 'chapters', f'{notebook_id}.json'))
        files_count = 0
        if final_chapters_data and 'chapters' in final_chapters_data:
            files_count = len(final_chapters_data['chapters'])
        
        all_notebooks = load_json(os.path.join(DATA_DIR, 'notebooks.json'))
        if all_notebooks:
            for nb in all_notebooks:
                if nb['id'] == notebook_id:
                    nb['filesCount'] = files_count
                    nb['lastUpdated'] = datetime.now().isoformat()
                    break
            _save_json(os.path.join(DATA_DIR, 'notebooks.json'), all_notebooks)

        return notebook_id

    except Exception as e:
        print(f"An error occurred during notebook and chapter creation from processing: {e}")
        return None

# --- Functions for Run Logs ---

def save_run_log(run_id: str, log_data: list) -> bool:
   """Saves the log data for a specific run to a JSON file."""
   log_file_path = os.path.join(RUN_LOGS_DIR, f"{run_id}.json")
   return _save_json(log_file_path, log_data)

def get_run_log(run_id: str) -> Optional[list]:
   """Retrieves the log data for a specific run."""
   log_file_path = os.path.join(RUN_LOGS_DIR, f"{run_id}.json")
   return load_json(log_file_path)
