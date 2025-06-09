from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from typing import List
import os # For path operations
from .. import crud, ai_services # Import necessary modules
from ..graph_processor import run_graph

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
    """
    Processes a single PDF file using the langgraph pipeline.
    This function is called in the background.
    """
    print(f"[TASK START] Processing with langgraph: {original_filename} from path: {temp_pdf_path}")
    
    try:
        # Run the langgraph pipeline
        # The run_graph function now encapsulates all processing steps.
        result = await run_graph(temp_pdf_path)
        print(f"[TASK SUCCESS] langgraph processing finished for {original_filename}.")
        print(f"Final state: {result}")

    except Exception as e:
        print(f"[TASK EXCEPTION] An unexpected error occurred while processing {original_filename} with langgraph: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up the temporary file. This is crucial.
        if os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
                print(f"[TASK INFO] Cleaned up temporary file: {temp_pdf_path}")
            except OSError as e_remove:
                print(f"[TASK ERROR] Error deleting temporary file {temp_pdf_path}: {e_remove}")

