from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from typing import List, Optional
import os
import uuid
from .. import crud
from ..graph_processor import run_graph

router = APIRouter(
    tags=["batch_processing"],
)

@router.post("/", status_code=202)
async def upload_and_process_pdfs(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Accepts multiple PDF files, saves them, and starts a single background task
    to process them all together. Returns a single run ID for tracking the batch.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    run_id = str(uuid.uuid4())
    temp_dir = "temp_pdf_uploads"
    os.makedirs(temp_dir, exist_ok=True)

    temp_file_paths = []
    original_filenames = []
    for file in files:
        # Use a unique filename for each temporary file to avoid collisions
        temp_file_path = os.path.join(temp_dir, f"{run_id}_{uuid.uuid4()}_{file.filename}")
        try:
            with open(temp_file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            temp_file_paths.append(temp_file_path)
            original_filenames.append(file.filename)
        except Exception as e:
            # If any file fails to save, log it and decide whether to abort or continue
            print(f"Error saving temporary file {file.filename}: {e}")
            # For now, we'll abort if any file fails to save to ensure complete processing
            raise HTTPException(status_code=500, detail=f"Failed to save file: {file.filename}")

    if not temp_file_paths:
        raise HTTPException(status_code=500, detail="Failed to process any of the uploaded files.")

    # Start one background task for the entire batch
    background_tasks.add_task(process_all_pdfs_together, run_id, temp_file_paths, original_filenames)

    return {
        "message": f"Started processing for a batch of {len(files)} PDF file(s).",
        "run_id": run_id
    }

@router.get("/logs/{run_id}")
async def get_processing_log(run_id: str):
    """
    Retrieves the processing log for a given run ID.
    """
    log_data = crud.get_run_log(run_id)
    if log_data is None:
        raise HTTPException(status_code=404, detail="Log not found for the given run ID.")
    return log_data

async def process_all_pdfs_together(run_id: str, temp_pdf_paths: List[str], original_filenames: List[str]):
    """
    Processes a batch of PDF files together using the langgraph pipeline.
    This function is called in the background.
    """
    filenames_str = ", ".join(original_filenames)
    print(f"[TASK START] Run ID: {run_id} - Processing batch with langgraph: {filenames_str}")
    
    try:
        # The graph now receives a list of paths
        result = await run_graph(run_id=run_id, pdf_file_paths=temp_pdf_paths)
        print(f"[TASK SUCCESS] Run ID: {run_id} - langgraph processing finished for batch: {filenames_str}.")
        print(f"Final state: {result.get('final_result', 'No final result message.')}")

    except Exception as e:
        print(f"[TASK EXCEPTION] Run ID: {run_id} - An unexpected error occurred while processing batch {filenames_str}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up all temporary files
        for temp_path in temp_pdf_paths:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    print(f"[TASK INFO] Run ID: {run_id} - Cleaned up temporary file: {temp_path}")
                except OSError as e_remove:
                    print(f"[TASK ERROR] Run ID: {run_id} - Error deleting temporary file {temp_path}: {e_remove}")

