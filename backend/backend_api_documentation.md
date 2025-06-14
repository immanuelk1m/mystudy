# API 문서

이 문서는 FastAPI 백엔드 애플리케이션의 모든 API 엔드포인트를 설명합니다.

## Notebooks API

**기본 경로:** `/api/notebooks`

---

### 1. 모든 노트북 목록 조회

-   **엔드포인트:** `GET /`
-   **설명:** 시스템에 저장된 모든 노트북의 목록을 조회합니다.
-   **경로 파라미터:** 없음
-   **쿼리 파라미터:** 없음
-   **요청 본문:** 없음
-   **응답 본문:** `List[NotebookSchema]`
    ```json
    [
      {
        "id": 1,
        "title": "My First Notebook",
        "description": "A notebook for general notes.",
        "lastUpdated": "2023-10-27T10:00:00Z",
        "filesCount": 5,
        "chapters": []
      }
    ]
    ```

### 2. 특정 노트북 상세 정보 조회

-   **엔드포인트:** `GET /{notebook_id}`
-   **설명:** 지정된 `notebook_id`를 가진 노트북의 상세 정보를 조회합니다. 챕터, 파일, 콘텐츠 정보가 포함됩니다.
-   **경로 파라미터:**
    -   `notebook_id` (int): 조회할 노트북의 ID.
-   **쿼리 파라미터:** 없음
-   **요청 본문:** 없음
-   **응답 본문:** `NotebookSchema`
    ```json
    {
      "id": 1,
      "title": "My First Notebook",
      "description": "A notebook for general notes.",
      "lastUpdated": "2023-10-27T10:00:00Z",
      "filesCount": 5,
      "chapters": [
        {
          "id": 1,
          "title": "Chapter 1",
          "order": 1,
          "game_html": null,
          "files": [],
          "contents": []
        }
      ]
    }
    ```

### 3. 노트북의 챕터 목록 조회

-   **엔드포인트:** `GET /{notebook_id}/chapters`
-   **설명:** 특정 노트북에 속한 모든 챕터의 목록을 조회합니다.
-   **경로 파라미터:**
    -   `notebook_id` (int): 챕터를 조회할 노트북의 ID.
-   **쿼리 파라미터:** 없음
-   **요청 본문:** 없음
-   **응답 본문:** `List[ChapterSchema]`

### 4. 문서 내용 조회

-   **엔드포인트:** `GET /{notebook_id}/content`
-   **설명:** 특정 노트북의 특정 챕터에 대한 상세 내용을 조회합니다.
-   **경로 파라미터:**
    -   `notebook_id` (str): 노트북의 ID.
-   **쿼리 파라미터:**
    -   `path` (str, 필수): 조회할 챕터의 번호.
-   **요청 본문:** 없음
-   **응답 본문:** `DocumentContent`
    ```json
    {
      "title": "Chapter Title",
      "metadata": "Source: source.pdf",
      "documentContent": [
        {"type": "heading", "content": "Section 1", "level": 1}
      ],
      "aiNotes": {
        "summary": "This is a summary.",
        "keyConcepts": [{"term": "Concept", "definition": "..."}],
        "importantTerms": [{"term": "Term", "definition": "..."}],
        "outline": [{"text": "Outline Item", "id": "1", "children": []}]
      },
      "quiz": [
        {"question": "What is...?", "options": ["A", "B"], "answerIndex": 0, "explanation": "..."}
      ]
    }
    ```

### 5. 파일 구조 조회

-   **엔드포인트:** `GET /{notebook_id}/structure`
-   **설명:** 특정 노트북의 특정 챕터와 관련된 파일 및 폴더 구조를 조회합니다.
-   **경로 파라미터:**
    -   `notebook_id` (str): 노트북의 ID.
-   **쿼리 파라미터:**
    -   `path` (str, 필수): 조회할 챕터의 번호.
-   **요청 본문:** 없음
-   **응답 본문:** `List[FileStructureItem]`
    ```json
    [
      {
        "name": "source.pdf",
        "type": "file",
        "path": "/static/uploads/1/source.pdf",
        "children": null
      }
    ]
    ```

### 6. AI 노트 생성

-   **엔드포인트:** `POST /{notebook_id}/content/{chapter_number}/generate-ai-notes`
-   **설명:** 기존 챕터의 텍스트 내용을 기반으로 AI 노트(요약, 핵심 개념 등)를 생성합니다. 이 작업은 백그라운드에서 비동기적으로 처리됩니다.
-   **경로 파라미터:**
    -   `notebook_id` (str): 노트북의 ID.
    -   `chapter_number` (str): AI 노트를 생성할 챕터의 번호.
-   **쿼리 파라미터:** 없음
-   **요청 본문:** 없음
-   **응답 본문:** `JSON`
    ```json
    {
      "message": "AI notes generation started in background. Notes will be updated shortly.",
      "current_ai_notes_placeholder": { ... }
    }
    ```

### 7. 챕터 게임 생성

-   **엔드포인트:** `POST /chapters/{chapter_id}/generate-game`
-   **설명:** 챕터 내용을 기반으로 대화형 스토리 게임(HTML 형식)을 생성하고 데이터베이스에 저장합니다.
-   **경로 파라미터:**
    -   `chapter_id` (int): 게임을 생성할 챕터의 ID.
-   **쿼리 파라미터:** 없음
-   **요청 본문:** 없음
-   **응답 본문:** `ChapterSchema` (업데이트된 `game_html` 필드 포함)

### 8. PDF 업로드 및 새 챕터 생성

-   **엔드포인트:** `POST /{notebook_id}/upload-and-create-chapter`
-   **설명:** PDF 파일을 업로드 받아 텍스트를 추출하고, AI를 사용하여 새로운 챕터(콘텐츠, AI 노트, 퀴즈 포함)를 생성한 후 저장합니다.
-   **경로 파라미터:**
    -   `notebook_id` (str): 챕터를 추가할 노트북의 ID.
-   **쿼리 파라미터:** 없음
-   **요청 본문:** `multipart/form-data`
    -   `file` (UploadFile): 업로드할 PDF 파일.
-   **응답 본문:** `Dict[str, Any]`
    ```json
    {
      "message": "Successfully uploaded PDF and created new chapter.",
      "notebook_id": "1",
      "new_chapter_number": "3",
      "new_chapter_title": "New Chapter from PDF",
      "pdf_path": "/static/uploads/1/document.pdf",
      "generated_content_preview": { ... }
    }
    ```

---

## Batch Processing PDFs API

**기본 경로:** `/api/batch-process-pdfs`

---

### 1. PDF 일괄 업로드 및 처리

-   **엔드포인트:** `POST /`
-   **설명:** 여러 개의 PDF 파일을 동시에 업로드하고, 백그라운드에서 모든 파일을 일괄 처리하는 작업을 시작합니다. 작업 추적을 위한 `run_id`를 반환합니다.
-   **경로 파라미터:** 없음
-   **쿼리 파라미터:** 없음
-   **요청 본문:** `multipart/form-data`
    -   `files` (List[UploadFile]): 업로드할 PDF 파일 목록.
-   **응답 본문:** `JSON`
    ```json
    {
      "message": "Started processing for a batch of 2 PDF file(s).",
      "run_id": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
    }
    ```

### 2. 처리 로그 조회

-   **엔드포인트:** `GET /logs/{run_id}`
-   **설명:** 지정된 `run_id`에 해당하는 일괄 처리 작업의 로그를 조회합니다.
-   **경로 파라미터:**
    -   `run_id` (str): 조회할 작업의 실행 ID.
-   **쿼리 파라미터:** 없음
-   **요청 본문:** 없음
-   **응답 본문:** `List` (로그 데이터 배열)
