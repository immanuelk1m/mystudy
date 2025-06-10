from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from typing import List, Optional
import os
import uuid
from .. import crud
from ..graph_processor import run_graph

router = APIRouter(
    prefix="/api/batch-process-pdfs",
    tags=["batch_processing"],
)

@router.post("/", status_code=202)
async def upload_and_process_pdfs(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Accepts multiple PDF files, starts processing for each in the background,
    and immediately returns a list of tracking run IDs.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    run_ids = []
    temp_dir = "temp_pdf_uploads"
    os.makedirs(temp_dir, exist_ok=True)

    for file in files:
        run_id = str(uuid.uuid4())
        run_ids.append(run_id)
        
        temp_file_path = os.path.join(temp_dir, f"{run_id}_{file.filename}")

        try:
            with open(temp_file_path, "wb") as buffer:
                buffer.write(await file.read())
            
            # 각 파일에 대해 별도의 백그라운드 작업 시작
            background_tasks.add_task(process_single_pdf, run_id, temp_file_path, file.filename)

        except Exception as e:
            # 특정 파일 저장 실패 시 로그를 남기고 계속 진행할 수 있습니다.
            # 또는 즉시 오류를 반환하도록 선택할 수도 있습니다.
            # 여기서는 로그를 남기고 다음 파일로 넘어갑니다.
            print(f"Error saving temporary file {file.filename}: {e}")
            # 필요하다면 실패한 파일 목록을 만들어 반환할 수도 있습니다.
            continue # 다음 파일 처리로 넘어감

    if not run_ids:
        raise HTTPException(status_code=500, detail="Failed to process any of the uploaded files.")

    return {
        "message": f"Started processing for {len(run_ids)} PDF file(s).",
        "run_ids": run_ids
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

async def process_single_pdf(run_id: str, temp_pdf_path: str, original_filename: str):
    """
    Processes a single PDF file using the langgraph pipeline.
    This function is called in the background.
    """
    print(f"[TASK START] Run ID: {run_id} - Processing with langgraph: {original_filename}")
    
    try:
        # Run the langgraph pipeline with the run_id
        result = await run_graph(run_id=run_id, pdf_file_path=temp_pdf_path)
        print(f"[TASK SUCCESS] Run ID: {run_id} - langgraph processing finished for {original_filename}.")
        print(f"Final state: {result.get('final_result', 'No final result message.')}")

    except Exception as e:
        print(f"[TASK EXCEPTION] Run ID: {run_id} - An unexpected error occurred while processing {original_filename}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_pdf_path):
            try:
                os.remove(temp_pdf_path)
                print(f"[TASK INFO] Run ID: {run_id} - Cleaned up temporary file: {temp_pdf_path}")
            except OSError as e_remove:
                print(f"[TASK ERROR] Run ID: {run_id} - Error deleting temporary file {temp_pdf_path}: {e_remove}")

