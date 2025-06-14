from fastapi import APIRouter, HTTPException, Query, UploadFile, File, BackgroundTasks, Depends
from typing import List, Optional, Dict, Any
import html
from sqlalchemy.orm import Session
from .. import crud, models, ai_services
from ..database import get_db
import os
import logging

router = APIRouter(
    tags=["notebooks"],
)

@router.get("", response_model=List[models.NotebookSchema])
async def read_notebooks(db: Session = Depends(get_db)):
    notebooks = crud.get_notebooks(db=db)
    return notebooks

@router.get("/{notebook_id}", response_model=models.NotebookSchema)
async def read_notebook_detail(notebook_id: int, db: Session = Depends(get_db)):
    notebook = crud.get_notebook_by_id(db=db, notebook_id=notebook_id)
    if notebook is None:
        raise HTTPException(status_code=404, detail=f"Notebook with ID {notebook_id} not found")
    return notebook

@router.get("/{notebook_id}/chapters", response_model=List[models.ChapterSchema])
async def read_notebook_chapters(notebook_id: int, db: Session = Depends(get_db)):
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
        content = crud.get_document_content(db=db, notebook_id=notebook_id, chapter_order=int(path))

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
    # Assuming 'path' parameter from frontend is the chapter number
    structure = crud.get_file_structure(db=db, notebook_id=notebook_id, chapter_order=int(path))
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
        db=db, notebook_id=notebook_id, chapter_order=chapter_number
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
                    db=db_task_session, notebook_id=notebook_id, chapter_order=chapter_number, ai_notes=new_ai_notes
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


@router.post("/chapters/{chapter_id}/generate-game",
             response_model=models.ChapterSchema,
             summary="Generate an interactive game for a chapter")
async def generate_chapter_game(chapter_id: int, db: Session = Depends(get_db)):
    """
    Generates an interactive story game in HTML based on the chapter's content.
    The generated HTML is then saved back to the chapter's `game_html` field.
    """
    # 1. Fetch the chapter from the database
    chapter = crud.get_chapter_by_id(db, chapter_id=chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail=f"Chapter with ID {chapter_id} not found")

    # 2. Extract content for the game generation
    content_entry = db.query(models.Content).filter(models.Content.chapter_id == chapter_id).first()
    
    if not content_entry:
        raise HTTPException(status_code=400, detail="Chapter content is empty or invalid.")

    content_data = content_entry.data
    if not isinstance(content_data, dict) or "text" not in content_data:
        raise HTTPException(status_code=400, detail="Invalid content format: 'text' field missing.")
    
    chapter_text_content = content_data["text"]

    if not chapter_text_content.strip():
        raise HTTPException(status_code=400, detail="Chapter content text is empty.")

    # 3. Generate the game HTML using the AI service
    game_html = await ai_services.generate_story_game_html(
        chapter_title=chapter.title,
        chapter_content=chapter_text_content.strip()
    )

    if not game_html:
        raise HTTPException(status_code=500, detail="Failed to generate game HTML using AI service.")

    # 4. Unescape and save the generated HTML to the database
    unescaped_html = html.unescape(game_html)
    
    updated_chapter = crud.update_chapter_game_html(
        db=db,
        chapter_id=chapter_id,
        game_html=unescaped_html
    )

    if not updated_chapter:
        # This case should be rare if the initial chapter fetch succeeded
        raise HTTPException(status_code=500, detail="Failed to save the generated game to the database.")

    return {"message": "Game generated successfully", "game_html": updated_chapter.game_html}


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

    saved_file_info = crud.save_uploaded_pdf(notebook_id, file)
    if not saved_file_info:
        raise HTTPException(status_code=500, detail="Failed to save uploaded PDF.")
    
    pdf_web_path, pdf_filesystem_path, original_pdf_filename = saved_file_info

    extracted_text = ai_services.extract_text_from_pdf(pdf_filesystem_path)
    if not extracted_text:
        # Clean up saved PDF if text extraction fails and no content can be generated?
        # os.remove(pdf_filesystem_path) # Or handle this based on policy
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {original_pdf_filename}")

    generated_document_content = await ai_services.generate_chapter_from_pdf_text(extracted_text, original_pdf_filename)
    if not generated_document_content:
        # os.remove(pdf_filesystem_path) # Or handle this based on policy
        raise HTTPException(status_code=500, detail=f"Failed to generate chapter content from PDF using AI: {original_pdf_filename}")

    new_chapter_number = crud.create_new_chapter_from_data(
        notebook_id=notebook_id,
        generated_content=generated_document_content,
        pdf_web_path=pdf_web_path,
        original_pdf_filename=original_pdf_filename
    )

    if not new_chapter_number:
        # os.remove(pdf_filesystem_path) # Or handle this based on policy
        raise HTTPException(status_code=500, detail="Failed to create new chapter files.")

    return {
        "message": "Successfully uploaded PDF and created new chapter.",
        "notebook_id": notebook_id,
        "new_chapter_number": new_chapter_number,
        "new_chapter_title": generated_document_content.title,
        "pdf_path": pdf_web_path,
        "generated_content_preview": {
            "title": generated_document_content.title,
            "metadata": generated_document_content.metadata,
            "ai_summary": generated_document_content.aiNotes.summary[:200] + "..." if generated_document_content.aiNotes else "N/A"
        }
    }
