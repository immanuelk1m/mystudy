from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from typing import List
import os # For path operations
from .. import crud, ai_services # Import necessary modules

router = APIRouter(
    prefix="/api",
    tags=["batch_processing"],
)

@router.post("/batch-process-pdfs/", status_code=202) # 202 Accepted for async tasks
async def batch_process_pdfs_endpoint(files: List[UploadFile] = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    Accepts multiple PDF files for batch processing.
    Currently, this endpoint only logs the names of the uploaded files.
    Actual processing (notebook classification, chapter creation) will be done in background tasks.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    file_names = [file.filename for file in files]
    print(f"Received {len(file_names)} files for batch processing: {', '.join(file_names)}")

    for uploaded_file in files:
        # UploadFile.file is a SpooledTemporaryFile. We can pass its path or read it.
        # For text extraction, ai_services.extract_text_from_pdf expects a file path.
        # We need to save the UploadFile to a temporary path first, or adapt extract_text_from_pdf.
        # Let's assume we save it temporarily for now.
        
        # Create a unique temporary file path
        # This is a simplified approach. For production, use tempfile module for robustness.
        temp_dir = "temp_pdf_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, uploaded_file.filename)
        
        try:
            with open(temp_file_path, "wb") as buffer:
                buffer.write(await uploaded_file.read())
            await uploaded_file.close() # Close the uploaded file
            
            # Add to background tasks
            background_tasks.add_task(process_single_pdf, temp_file_path, uploaded_file.filename)
        except Exception as e:
            print(f"Error saving temporary file {uploaded_file.filename}: {e}")
            # Optionally, clean up if partial save occurred, though with 'wb' it's less likely an issue.
            # If a file fails to save, it won't be processed. Consider how to report this.

    return {
        "message": f"Received {len(file_names)} files. Batch processing initiated for successfully saved files.",
        "filenames_submitted_for_processing": file_names # This might need adjustment if some files fail to save
    }

async def process_single_pdf(temp_pdf_path: str, original_filename: str):
    print(f"[TASK START] Processing: {original_filename} from path: {temp_pdf_path}")
    actual_pdf_web_path = None
    notebook_id_for_cleanup = None # For potential cleanup if PDF move fails but notebook was created

    try:
        # 1. Extract text from PDF
        extracted_text = ai_services.extract_text_from_pdf(temp_pdf_path)
        if not extracted_text:
            print(f"[TASK ERROR] Failed to extract text from {original_filename}. Skipping.")
            return
        print(f"[TASK INFO] Extracted text from {original_filename} (length: {len(extracted_text)})")

        # 2. Get existing notebook titles
        existing_titles = crud.get_all_notebook_titles()
        print(f"[TASK INFO] Existing notebook titles: {existing_titles}")

        # 3. AI Suggests Notebook Title
        suggested_title = await ai_services.suggest_notebook_for_text(extracted_text, existing_titles)
        if not suggested_title:
            print(f"[TASK WARNING] AI did not suggest a notebook title for {original_filename}. Using a default.")
            # Sanitize filename to be a somewhat reasonable title
            base_name, _ = os.path.splitext(original_filename)
            safe_base_name = "".join(c if c.isalnum() or c in (' ', '_', '-') else '_' for c in base_name)
            suggested_title = f"Notebook - {safe_base_name[:50]}" # Truncate if too long
        print(f"[TASK INFO] Using notebook title: '{suggested_title}' for {original_filename}")

        # 4. Get or Create Notebook
        try:
            notebook = crud.get_or_create_notebook(suggested_title)
            notebook_id_for_cleanup = notebook.id # Store for potential cleanup
        except IOError as e:
            print(f"[TASK CRITICAL] Failed to get or create notebook '{suggested_title}': {e}. Skipping {original_filename}.")
            return # Cannot proceed without a notebook
        print(f"[TASK INFO] Using Notebook ID: {notebook.id} (Title: '{notebook.title}') for {original_filename}")

        # 5. Move PDF to final storage
        pdf_paths = crud.move_temp_pdf_to_notebook_storage(temp_pdf_path, notebook.id, original_filename)
        if not pdf_paths:
            print(f"[TASK CRITICAL] Failed to move PDF {original_filename} to notebook storage for notebook ID {notebook.id}. Skipping.")
            # If PDF move fails, the temp file still exists. It will be cleaned up by the finally block.
            # Consider if the newly created notebook (if it was new) should be cleaned up or marked as incomplete.
            return
        actual_pdf_web_path, final_fs_path = pdf_paths
        print(f"[TASK INFO] PDF {original_filename} moved to {final_fs_path} (web: {actual_pdf_web_path})")
        # temp_pdf_path is now invalid as the file has been moved.

        # 6. Generate chapter content using AI
        print(f"[TASK INFO] Generating chapter content for {original_filename}...")
        generated_document_content = await ai_services.generate_chapter_from_pdf_text(extracted_text, original_filename)
        if not generated_document_content:
            print(f"[TASK ERROR] Failed to generate chapter content for {original_filename}. Skipping chapter creation.")
            return
        print(f"[TASK INFO] Successfully generated chapter content for {original_filename}: {generated_document_content.title}")

        # 7. Create and save the new chapter data
        print(f"[TASK INFO] Creating new chapter for {original_filename} in notebook {notebook.id}...")
        new_chapter_number = crud.create_new_chapter_from_data(
            notebook_id=notebook.id,
            generated_content=generated_document_content,
            pdf_web_path=actual_pdf_web_path, # Use the actual web path
            original_pdf_filename=original_filename
        )

        if not new_chapter_number:
            print(f"[TASK ERROR] Failed to create new chapter files for {original_filename} in notebook {notebook.id}.")
            return
        
        # Update filesCount for the notebook
        # This is a simplified update. A more robust way would be to re-read, update, and save notebooks.json
        # or have a dedicated crud.update_notebook_files_count(notebook_id, increment) function.
        current_notebooks = crud.load_json(os.path.join(crud.DATA_DIR, 'notebooks.json'))
        if current_notebooks:
            for nb_data in current_notebooks:
                if nb_data.get('id') == notebook.id:
                    nb_data['filesCount'] = nb_data.get('filesCount', 0) + 1
                    nb_data['lastUpdated'] = crud.datetime.now().isoformat()
                    break
            crud._save_json(os.path.join(crud.DATA_DIR, 'notebooks.json'), current_notebooks)
            print(f"[TASK INFO] Updated filesCount for notebook {notebook.id}")

        print(f"[TASK SUCCESS] Successfully created chapter {new_chapter_number} ('{generated_document_content.title}') for {original_filename} in notebook {notebook.id}.")

    except Exception as e:
        print(f"[TASK EXCEPTION] An unexpected error occurred while processing {original_filename}: {e}")
        # Log full traceback for debugging if possible
        import traceback
        traceback.print_exc()
    finally:
        # 6. Clean up the temporary file if it still exists (e.g., if move_temp_pdf_to_notebook_storage failed)
        if os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
                print(f"[TASK INFO] Cleaned up temporary file: {temp_pdf_path}")
            except OSError as e_remove:
                print(f"[TASK ERROR] Error deleting temporary file {temp_pdf_path}: {e_remove}")
        
        # The temporary directory itself (e.g., temp_pdf_uploads) cleanup should ideally be managed 
        # by the caller (batch_process_pdfs_endpoint) or using Python's tempfile module for 
        # automatic cleanup. For now, individual task does not remove the main temp_dir.
        # If process_single_pdf is the only one using files in a specific sub-temp-dir, it could clean that.
        # However, the current temp_dir is shared by all uploads in a batch.
        # Let's ensure the specific temp_dir for this task (if it was unique) is cleaned if empty.
        # The current `temp_dir` in `batch_process_pdfs_endpoint` is `temp_pdf_uploads`.
        # The `temp_pdf_path` is `temp_pdf_uploads/original_filename`.
        # So, `os.path.dirname(temp_pdf_path)` is `temp_pdf_uploads`.
        # We should not remove this directory here as other tasks might be using it.
        # A better approach: each task gets its own unique temporary sub-directory, or use `tempfile.NamedTemporaryFile`.
        pass # Directory cleanup is complex and better handled by a central mechanism or tempfile module.

