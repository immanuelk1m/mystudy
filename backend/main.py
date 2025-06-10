import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import notebooks, batch_processing
from pathlib import Path
import os

def read_json_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notebooks.router, prefix="/api/notebooks", tags=["notebooks"])
app.include_router(batch_processing.router, prefix="/api/batch-process-pdfs", tags=["batch-processing"])

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

# @app.get("/api/notebooks")
# def get_notebooks():
#     """
#     notebooks.json 파일의 내용을 반환합니다.
#     """
#     try:
#         notebooks_file = DATA_DIR / "notebooks.json"
#         with open(notebooks_file, "r", encoding="utf-8") as f:
#             return json.load(f)
#     except FileNotFoundError:
#         raise HTTPException(status_code=404, detail="Notebooks not found")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/api/notebooks/{notebook_id}")
# async def get_notebook(notebook_id: str):
#     """특정 ID를 가진 노트북의 상세 정보를 반환합니다."""
#     try:
#         notebooks = read_json_file(os.path.join(DATA_DIR, "notebooks.json"))
        
#         # notebook_id를 문자열로 직접 비교하여 타입 불일치 문제를 해결합니다.
#         for notebook in notebooks:
#             if notebook.get("id") == notebook_id:
#                 return notebook
        
#         # 일치하는 노트북이 없을 경우 404 에러를 발생시킵니다.
#         raise HTTPException(status_code=404, detail=f"Notebook with id {notebook_id} not found")
#     except HTTPException as e:
#         # 이미 처리된 HTTP 예외는 그대로 다시 발생시킵니다.
#         raise e
#     except Exception as e:
#         # 그 외의 모든 예외는 500 에러로 처리합니다.
#         raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# @app.get("/api/notebooks/{notebook_id}/chapters")
# async def get_chapters(notebook_id: str):
#     """특정 노트북의 '완전한' 챕터 목록만을 반환합니다."""
#     try:
#         data = read_json_file(os.path.join(DATA_DIR, "chapters", f"{notebook_id}.json"))
#         chapter_titles = data.get("chapters", [])

#         if not isinstance(chapter_titles, list):
#             raise HTTPException(status_code=500, detail="Invalid chapter data format")

#         valid_chapters = []
#         for title in chapter_titles:
#             match = re.match(r"^\s*(\d+)", title)
#             if match:
#                 chapter_id = match.group(1)
                
#                 # --- START: CRITICAL FIX ---
#                 # content와 structure 파일이 모두 존재하는지 확인합니다.
#                 content_path = os.path.join(DATA_DIR, "content", notebook_id, f"{chapter_id}.json")
#                 structure_path = os.path.join(DATA_DIR, "structure", notebook_id, f"{chapter_id}.json")

#                 if os.path.exists(content_path) and os.path.exists(structure_path):
#                     valid_chapters.append({"id": int(chapter_id), "title": title.strip()})
#                 # --- END: CRITICAL FIX ---
        
#         return valid_chapters
#     except HTTPException as e:
#         raise e
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"An unexpected error occurred in get_chapters: {str(e)}")

# @app.get("/api/notebooks/{notebook_id}/content/{chapter_id}")
# def get_content(notebook_id: int, chapter_id: int):
#     """
#     특정 챕터의 컨텐츠를 반환합니다.
#     """
#     try:
#         content_file = DATA_DIR / "content" / str(notebook_id) / f"{chapter_id}.json"
#         with open(content_file, "r", encoding="utf-8") as f:
#             return json.load(f)
#     except FileNotFoundError:
#         raise HTTPException(status_code=404, detail=f"Content for notebook {notebook_id}, chapter {chapter_id} not found")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/api/notebooks/{notebook_id}/structure/{chapter_id}")
# def get_structure(notebook_id: int, chapter_id: int):
#     """
#     특정 챕터의 구조를 반환합니다.
#     """
#     try:
#         structure_file = DATA_DIR / "structure" / str(notebook_id) / f"{chapter_id}.json"
#         with open(structure_file, "r", encoding="utf-8") as f:
#             return json.load(f)
#     except FileNotFoundError:
#         raise HTTPException(status_code=404, detail=f"Structure for notebook {notebook_id}, chapter {chapter_id} not found")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
