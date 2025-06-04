import json
import os
import shutil # For file operations
import uuid # For unique filenames
from typing import List, Optional, Dict, Any, Tuple
from fastapi import UploadFile # For type hinting

from . import models # Use relative import

# Base directory for the backend application
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
UPLOADS_DIR = os.path.join(STATIC_DIR, 'uploads')

# Ensure upload directories exist (though main.py also does this for static/uploads)
# Specific subdirectories per notebook/chapter for uploads will be created on demand
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

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

def _save_json(file_path: str, data: Any) -> bool:
    """Helper function to save data to a JSON file."""
    try:
        # Ensure parent directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving JSON to {file_path}: {e}")
        return False

def get_notebooks() -> List[models.Notebook]:
    notebooks_data = load_json(os.path.join(DATA_DIR, 'notebooks.json'))
    if notebooks_data:
        return [models.Notebook(**nb) for nb in notebooks_data]
    return []

def get_notebook_by_id(notebook_id: str) -> Optional[models.Notebook]:
    notebooks_data = load_json(os.path.join(DATA_DIR, 'notebooks.json'))
    if notebooks_data:
        for nb_data in notebooks_data:
            if nb_data.get('id') == notebook_id:
                return models.Notebook(**nb_data)
    return None

def get_chapters_for_notebook(notebook_id: str) -> Optional[models.ChapterList]:
    chapters_data = load_json(os.path.join(DATA_DIR, 'chapters', f'{notebook_id}.json'))
    if chapters_data:
        return models.ChapterList(**chapters_data)
    return None

def get_document_content(notebook_id: str, chapter_number: str) -> Optional[models.DocumentContent]:
    # Assuming chapter_number in path is 1-indexed as per frontend examples
    # and matches the JSON file names (e.g., 1.json, 2.json)
    content_path = os.path.join(DATA_DIR, 'content', notebook_id, f'{chapter_number}.json')
    content_data = load_json(content_path)
    if content_data:
        return models.DocumentContent(**content_data)
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

def _get_next_chapter_number_and_path_params(notebook_id: str) -> Tuple[str, str, str, str, str]:
    """Determines the next chapter number and paths for a given notebook."""
    chapters_file_path = os.path.join(DATA_DIR, 'chapters', f'{notebook_id}.json')
    chapters_data = load_json(chapters_file_path)
    
    next_chapter_num = 1
    if chapters_data and 'chapters' in chapters_data:
        next_chapter_num = len(chapters_data['chapters']) + 1
    str_next_chapter_num = str(next_chapter_num)
    
    # Define paths for the new chapter's content, structure
    # Ensure subdirectories for content/structure per notebook_id exist
    os.makedirs(os.path.join(DATA_DIR, 'content', notebook_id), exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, 'structure', notebook_id), exist_ok=True)

    new_content_path = os.path.join(DATA_DIR, 'content', notebook_id, f'{str_next_chapter_num}.json')
    new_structure_path = os.path.join(DATA_DIR, 'structure', notebook_id, f'{str_next_chapter_num}.json')
    
    return str_next_chapter_num, chapters_file_path, new_content_path, new_structure_path

def create_new_chapter_from_data(
    notebook_id: str, 
    generated_content: models.DocumentContent, 
    pdf_web_path: str, 
    original_pdf_filename: str
) -> Optional[str]:
    """Creates all necessary files and updates for a new chapter based on AI generation and PDF upload."""
    
    str_next_chapter_num, chapters_file_path, new_content_path, new_structure_path = _get_next_chapter_number_and_path_params(notebook_id)

    # 1. Save the new DocumentContent (AI-generated)
    # Pydantic model to dict, ensuring datetime is handled if it were present (though not in DocumentContent directly)
    if not _save_json(new_content_path, generated_content.dict(exclude_none=True)):
        print(f"Failed to save new chapter content for notebook {notebook_id}, chapter {str_next_chapter_num}")
        return None
        
    # 2. Update the main chapter list for the notebook
    chapters_data = load_json(chapters_file_path)
    if not chapters_data or 'chapters' not in chapters_data:
        chapters_data = {'chapters': []} # Initialize if not exists or malformed
    
    # Use the title from the AI-generated content
    new_chapter_title = generated_content.title if generated_content.title else f"Chapter {str_next_chapter_num} - {original_pdf_filename}"
    chapters_data['chapters'].append(new_chapter_title)
    if not _save_json(chapters_file_path, chapters_data):
        print(f"Failed to update chapter list for notebook {notebook_id}")
        # Consider rollback or error handling for partial creation
        return None
        
    # 3. Create the new structure file for the chapter, linking to the PDF
    structure_content = [
        {
            "name": original_pdf_filename,
            "type": "file",
            "path": pdf_web_path
        }
        # Add more structure items if needed, e.g., if LLM generates folder structures
    ]
    if not _save_json(new_structure_path, structure_content):
        print(f"Failed to save new chapter structure for notebook {notebook_id}, chapter {str_next_chapter_num}")
        # Consider rollback
        return None
        
    return str_next_chapter_num
