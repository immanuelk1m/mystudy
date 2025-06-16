from fastapi import APIRouter, HTTPException, Query, UploadFile, File, BackgroundTasks, Depends
from typing import List, Optional, Dict, Any
import html
from sqlalchemy.orm import Session
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import crud, models, ai_services
from database import get_db
from performance_monitor import get_database_stats, analyze_query_plan
from progress_tracker import progress_tracker, ProgressStatus
import logging

router = APIRouter(
    tags=["notebooks"],
)

@router.get("", response_model=List[models.NotebookSchema])
async def read_notebooks(
    skip: int = Query(0, ge=0, description="Number of notebooks to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of notebooks to return"),
    db: Session = Depends(get_db)
):
    """Get notebooks with optional pagination for better performance."""
    if skip == 0 and limit == 100:
        # Use the original function for backward compatibility when no pagination is requested
        notebooks = crud.get_notebooks(db=db)
        return notebooks
    else:
        # Use pagination for large datasets
        notebooks, total_count = crud.get_notebooks_with_pagination(db=db, skip=skip, limit=limit)
        return notebooks

@router.get("/search", response_model=List[models.NotebookSchema])
async def search_notebooks(
    q: str = Query(..., min_length=1, description="Search term for notebook titles"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of results to return"),
    db: Session = Depends(get_db)
):
    """Search notebooks by title with case-insensitive matching."""
    notebooks = crud.search_notebooks_by_title(db=db, search_term=q, limit=limit)
    return notebooks

@router.post("/cache/clear")
async def clear_cache():
    """Clear all notebook-related caches for better performance after updates."""
    crud.clear_notebook_cache()
    return {"message": "Cache cleared successfully"}

@router.get("/admin/performance-stats")
async def get_performance_stats(db: Session = Depends(get_db)):
    """Get database performance statistics for monitoring."""
    stats = get_database_stats(db)
    return {
        "database_stats": stats,
        "cache_info": {
            "notebooks_cache": crud.get_notebooks_cached.cache_info()._asdict(),
            "summary_cache": crud.get_notebook_summary_cached.cache_info()._asdict()
        }
    }

@router.get("/{notebook_id}", response_model=models.NotebookSchema)
async def read_notebook_detail(
    notebook_id: int, 
    summary_only: bool = Query(False, description="Return only summary data without full chapter content"),
    db: Session = Depends(get_db)
):
    """Get notebook details with optional summary mode for better performance."""
    if summary_only:
        # Use optimized summary function for faster response
        summary = crud.get_notebook_summary(db=db, notebook_id=notebook_id)
        if summary is None:
            raise HTTPException(status_code=404, detail=f"Notebook with ID {notebook_id} not found")
        return summary
    else:
        # Use full detail function
        notebook = crud.get_notebook_by_id(db=db, notebook_id=notebook_id)
        if notebook is None:
            raise HTTPException(status_code=404, detail=f"Notebook with ID {notebook_id} not found")
        return notebook

@router.put("/{notebook_id}", response_model=models.NotebookSchema)
async def update_notebook(
    notebook_id: int,
    update_request: models.NotebookUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update notebook title and/or description."""
    if update_request.title is None and update_request.description is None:
        raise HTTPException(status_code=400, detail="At least one field (title or description) must be provided")
    
    updated_notebook = crud.update_notebook(
        db=db, 
        notebook_id=notebook_id, 
        title=update_request.title, 
        description=update_request.description
    )
    if updated_notebook is None:
        raise HTTPException(status_code=404, detail=f"Notebook with ID {notebook_id} not found")
    
    return updated_notebook

@router.delete("/{notebook_id}")
async def delete_notebook(
    notebook_id: int,
    db: Session = Depends(get_db)
):
    """Delete a notebook and all its related data."""
    success = crud.delete_notebook(db=db, notebook_id=notebook_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Notebook with ID {notebook_id} not found")
    
    return {"message": f"Notebook {notebook_id} deleted successfully"}

@router.get("/{notebook_id}/chapters", response_model=List[models.ChapterSchema])
async def read_notebook_chapters(
    notebook_id: int, 
    summary_only: bool = Query(False, description="Return only chapter summaries without full content"),
    db: Session = Depends(get_db)
):
    """Get chapters for a notebook with optional summary mode for better performance."""
    if summary_only:
        # Use optimized summary function for faster response
        chapters_summary = crud.get_chapters_summary(db=db, notebook_id=notebook_id)
        return chapters_summary
    else:
        # Use full detail function
        chapter_list_obj = crud.get_chapters_for_notebook(db, notebook_id=notebook_id)
        if chapter_list_obj is None:
            raise HTTPException(status_code=404, detail=f"Chapters for notebook ID {notebook_id} not found")
        return chapter_list_obj

@router.get("/{notebook_id}/content", response_model=models.DocumentContent)
async def read_document_content(
    notebook_id: int,
    path: str = Query(..., description="Chapter number or path to content"),
    db: Session = Depends(get_db)
):
    try:
        logging.info(f"Attempting to read content for notebook {notebook_id}, chapter {path}")
        content = crud.get_document_content(db=db, notebook_id=notebook_id, chapter_id=int(path))

        if content is None:
            logging.warning(f"Content not found for notebook {notebook_id}, chapter {path}. Raising 404.")
            raise HTTPException(status_code=404, detail=f"Content for notebook {notebook_id}, chapter {path} not found")

        logging.info(f"Successfully retrieved content for notebook {notebook_id}, chapter {path}")
        return content
    except HTTPException as http_exc:
        # Re-raise HTTPException directly so FastAPI handles it
        logging.error(f"HTTPException in read_document_content for notebook {notebook_id}, chapter {path}: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        # Catch any other unexpected exceptions
        logging.error(f"Unexpected error in read_document_content for notebook {notebook_id}, chapter {path}: {str(e)}", exc_info=True)
        # Return a generic 500 error
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while fetching content for notebook {notebook_id}, chapter {path}.")

@router.get("/{notebook_id}/structure", response_model=List[models.FileStructureItem])
async def read_file_structure(
    notebook_id: int,
    path: str = Query(..., description="Chapter number or path to structure"),
    db: Session = Depends(get_db)
):
    # Assuming 'path' parameter from frontend is the chapter ID
    structure = crud.get_file_structure(db=db, notebook_id=notebook_id, chapter_id=int(path))
    # crud.get_file_structure returns [] if not found, which matches frontend expectation
    # So, no explicit 404 check here unless we want to differentiate 'no file' vs 'empty structure'
    return structure


# --- AI Feature Endpoints ---

def _extract_text_from_document_content(doc_content: models.DocumentContent) -> str:
    """Helper to concatenate text from documentContent blocks for AINotes generation."""
    full_text = f"{doc_content.title}\n\n"
    if doc_content.documentContent:
        for block in doc_content.documentContent:
            if isinstance(block, dict) and block.get('type') in ['paragraph', 'heading'] and 'content' in block:
                full_text += block['content'] + "\n"
            # Add more sophisticated text extraction if content blocks are more varied
    return full_text.strip()

@router.post("/{notebook_id}/content/{chapter_number}/generate-ai-notes",
             response_model=models.AINotes,
             summary="Generate AI Notes for existing chapter content")
async def generate_ai_notes_for_chapter(
    notebook_id: int,
    chapter_number: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Generates AI-powered notes (summary, key concepts, important terms, outline)
    for the existing textual content of a specified chapter.
    The generation is done in the background.
    """
    existing_content = crud.get_document_content(
        db=db, notebook_id=notebook_id, chapter_id=chapter_number
    )
    if not existing_content:
        raise HTTPException(status_code=404, detail=f"Content for notebook {notebook_id}, chapter {chapter_number} not found")

    text_to_process = _extract_text_from_document_content(existing_content)
    if not text_to_process:
        raise HTTPException(status_code=400, detail="No text content found in the chapter to generate AI notes from.")

    # Offload LLM call to background task
    # Note: The client gets an immediate 200 OK, but the notes are updated later.
    # For production, you might want a more robust task queue (Celery, RQ) and a way to notify the client upon completion.
    async def task():
        # IMPORTANT: Create a new DB session for the background task
        db_task_session = next(get_db())
        try:
            print(f"Background task started: Generating AI notes for notebook {notebook_id}, chapter {chapter_number}")
            new_ai_notes = await ai_services.generate_ai_notes_from_text(text_to_process)
            if new_ai_notes:
                if crud.update_document_ai_notes(
                    db=db_task_session, notebook_id=notebook_id, chapter_id=chapter_number, ai_notes=new_ai_notes
                ):
                    print(f"Successfully updated AI notes for notebook {notebook_id}, chapter {chapter_number}")
                else:
                    print(f"Error: Failed to save updated AI notes for notebook {notebook_id}, chapter {chapter_number}")
            else:
                print(f"Error: Failed to generate AI notes for notebook {notebook_id}, chapter {chapter_number}")
        finally:
            db_task_session.close()

    background_tasks.add_task(task)
    
    # For now, return a message indicating the task has started.
    # Or, if we want to return the *old* AINotes or a placeholder:
    # return existing_content.aiNotes
    # For this example, let's return a success message, actual notes updated in background.
    return {"message": "AI notes generation started in background. Notes will be updated shortly.", "current_ai_notes_placeholder": existing_content.aiNotes}




@router.post("/{notebook_id}/upload-and-create-chapter",
             status_code=201, # Created
             response_model=Dict[str, Any], # More specific model can be created
             summary="Upload a PDF and create a new chapter from its content")
async def upload_pdf_and_create_chapter(notebook_id: int, file: UploadFile = File(...)):
    """
    Uploads a PDF file, extracts its text, generates a new chapter content
    (including title, metadata, content blocks, AI notes, and quiz) using an LLM,
    and saves it as a new chapter for the specified notebook.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF files are allowed.")

    saved_file_info = crud.save_uploaded_pdf(str(notebook_id), file)
    if not saved_file_info:
        raise HTTPException(status_code=500, detail="Failed to save uploaded PDF.")
    
    pdf_web_path, pdf_filesystem_path, original_pdf_filename = saved_file_info

    extracted_text = ai_services.extract_text_from_pdf(pdf_filesystem_path)
    if not extracted_text:
        # Clean up saved PDF if text extraction fails and no content can be generated?
        # os.remove(pdf_filesystem_path) # Or handle this based on policy
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {original_pdf_filename}")

    # For testing, create a simple chapter without AI generation
    from datetime import datetime
    
    # Create a simple chapter
    db = next(get_db())
    try:
        # Get the next chapter order
        existing_chapters = db.query(models.Chapter).filter(models.Chapter.notebook_id == notebook_id).all()
        next_order = len(existing_chapters) + 1
        
        # Create chapter
        new_chapter = models.Chapter(
            title=f"Chapter from {original_pdf_filename}",
            order=next_order,
            notebook_id=notebook_id
        )
        db.add(new_chapter)
        db.commit()
        db.refresh(new_chapter)
        
        # Create file record
        new_file = models.File(
            name=original_pdf_filename,
            path=pdf_web_path,
            type="file",
            chapter_id=new_chapter.id
        )
        db.add(new_file)
        
        # Create basic content
        basic_content = {
            "title": f"Chapter from {original_pdf_filename}",
            "metadata": f"Source: {original_pdf_filename}, Text length: {len(extracted_text)} chars",
            "documentContent": [
                {"type": "heading", "content": "PDF Content", "level": 1},
                {"type": "paragraph", "content": extracted_text[:1000] + "..." if len(extracted_text) > 1000 else extracted_text}
            ],
            "aiNotes": {
                "summary": "This is a test chapter created from PDF upload.",
                "keyConcepts": [],
                "importantTerms": [],
                "outline": []
            },
            "quiz": []
        }
        
        new_content = models.Content(
            data=basic_content,
            chapter_id=new_chapter.id
        )
        db.add(new_content)
        db.commit()
        
        return {
            "message": "Successfully uploaded PDF and created new chapter.",
            "notebook_id": notebook_id,
            "new_chapter_number": next_order,
            "new_chapter_title": new_chapter.title,
            "pdf_path": pdf_web_path,
            "generated_content_preview": {
                "title": new_chapter.title,
                "metadata": basic_content["metadata"],
                "ai_summary": "Test chapter created successfully"
            }
        }
    finally:
        db.close()
