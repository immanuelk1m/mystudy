# Backend API Specifications and Implementation Details

This document outlines the backend API endpoints, data structures, and key considerations for the project, based on the analysis of frontend requirements and mock data.

## 1. API Endpoints and Data Formats

### 1.1. `GET /api/notebooks`
-   **Description**: Fetches a list of all notebooks.
-   **Response Body**: Array of Notebook objects.
    ```json
    [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "lastUpdated": "string", // ISO 8601 date format recommended (e.g., "2025-06-15T10:00:00Z")
        "filesCount": "number"
      }
      // ... more notebook objects
    ]
    ```

### 1.2. `GET /api/notebooks/{notebookId}`
-   **Description**: Fetches detailed information for a specific notebook.
-   **Path Parameter**: `notebookId` (string) - The ID of the notebook.
-   **Response Body**: Single Notebook object.
    ```json
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "lastUpdated": "string",
      "filesCount": "number"
    }
    ```

### 1.3. `GET /api/notebooks/{notebookId}/chapters`
-   **Description**: Fetches a list of chapters for a given notebook.
-   **Path Parameter**: `notebookId` (string) - The ID of the notebook.
-   **Response Body**:
    ```json
    {
      "chapters": ["Chapter Title 1", "Chapter Title 2", "..."]
    }
    ```

### 1.4. `GET /api/notebooks/{notebookId}/content`
-   **Description**: Fetches the content of a specific chapter/document within a notebook.
-   **Path Parameter**: `notebookId` (string) - The ID of the notebook.
-   **Query Parameter**: `path` (string) - Identifier for the chapter or document (e.g., chapter number as used by frontend: "1", "2", or a more specific file path if applicable).
-   **Response Body**: `DocumentContent` object.
    ```json
    {
      "title": "string",
      "metadata": "string",
      "documentContent": [ // Array of typed content blocks
        // Example structure (NEEDS CLARIFICATION WITH FRONTEND)
        // Based on frontend type: Array<{ type: string; level?: number; text?: string; items?: string[] }>
        { "type": "paragraph", "text": "This is a paragraph." },
        { "type": "heading", "level": 1, "text": "Main Heading" },
        { "type": "list", "items": ["item1", "item2"] }
        // ... other content types like image (e.g., { "type": "image", "src": "url/to/image.png", "alt": "description" }), 
        // code block (e.g., { "type": "code", "language": "python", "text": "print('hello')" }) etc.
      ],
      "aiNotes": {
        "summary": "string",
        "keyConcepts": [
          {
            "term": "string",
            // Definition can be a simple string or an object with difficulty levels
            "definition": "string OR { \"easy\": \"string\", \"medium\": \"string\", \"hard\": \"string\" }"
          }
          // ... more key concepts
        ],
        "importantTerms": [
          { "term": "string", "definition": "string" }
          // ... more important terms
        ],
        "outline": [ // Can be nested, representing a table of contents
          { "title": "string", "id": "string", "children": [ /* ... recursive outline structure ... */ ] }
          // ... more outline items
        ]
      },
      "quiz": [
        {
          "question": "string",
          "options": ["string"],
          "answerIndex": "number",
          "explanation": "string"
        }
        // ... more quiz items
      ]
    }
    ```
    -   **Critical Note**: The structure of `documentContent` is paramount and requires detailed discussion and agreement with the frontend team. The current mock data from the frontend did not fully specify this part.

### 1.5. `GET /api/notebooks/{notebookId}/structure`
-   **Description**: Fetches the file/directory structure for a specific chapter or path within a notebook.
-   **Path Parameter**: `notebookId` (string) - The ID of the notebook.
-   **Query Parameter**: `path` (string) - Identifier for the chapter or document (e.g., chapter number as used by frontend: "1", "2", or a more specific folder path).
-   **Response Body**: Array of `FileStructureItem` objects.
    ```json
    [
      {
        "name": "string", // Display name of the file or folder
        "type": "'file' | 'folder'",
        "path": "string", // Actual file access path, URL, or unique identifier for fetching
        "children": [ /* Array of FileStructureItem, if type is 'folder' */ ]
      }
      // ... more file/folder items
    ]
    ```

## 2. Data Storage and Management

-   **Notebook Metadata**: (`id`, `title`, `description`, `lastUpdated`, `filesCount`)
    -   **Storage**: Consider a database (e.g., PostgreSQL, MongoDB) for scalability and querying, or JSON files in a structured directory if the dataset is small and managed manually.
-   **Chapter Information**: (List of chapter titles per notebook)
    -   **Storage**: Can be part of the notebook metadata document/row or a separate related table/collection.
-   **Document Content (`DocumentContent`)**: (`title`, `metadata`, `documentContent` array, `aiNotes`, `quiz`)
    -   **Storage**: JSON files per chapter/document (e.g., `data/content/{notebookId}/{chapterPathPart}.json`) are a direct way to map current mock data. For larger systems, a database is preferable. The `documentContent` array itself might store rich text as Markdown, HTML, or a structured JSON format (e.g., similar to Draft.js or TipTap's internal format).
-   **File Structure Information (`FileStructureItem`)**:
    -   **Storage**: JSON files per chapter/structure scope (e.g., `data/structure/{notebookId}/{chapterPathPart}.json`) or derived dynamically if actual files are stored in a discoverable file system.
-   **Actual Files (Assets)**: (PDFs, PPTX, MP4s, images, etc., referenced in `structure` or `documentContent`)
    -   **Storage**: A dedicated file storage solution is necessary. Options:
        -   Local file system served by a static file server (e.g., Nginx, or a route in the backend framework).
        -   Cloud storage (e.g., AWS S3, Google Cloud Storage, Azure Blob Storage) for scalability, durability, and CDN integration.
    -   The `path` in `FileStructureItem` or image sources in `documentContent` should resolve to accessible URLs for these assets.

## 3. Key Implementation Considerations

-   **`documentContent` Field Definition (CRITICAL ACTION)**:
    -   Collaborate urgently with the frontend team to finalize the `documentContent` array's item structures. Define all supported `type` values (e.g., `paragraph`, `heading`, `image`, `codeblock`, `list`, `video_embed`) and their respective properties (e.g., `text`, `level`, `src`, `alt`, `language`, `items`, `embedUrl`).
-   **AI Notes Generation (`aiNotes`)**:
    -   Determine how `summary`, `keyConcepts`, `importantTerms`, and `outline` will be created and updated. Possible approaches:
        -   Manual authoring by content creators.
        -   Integration with external AI/NLP APIs (e.g., OpenAI, Cohere).
        -   Development of custom in-house models (longer term).
-   **File Serving and Access Control**: 
    -   Implement robust file serving for assets. If cloud storage is used, generate pre-signed URLs for secure, temporary access if needed.
    -   Consider access control for sensitive files.
-   **Data Path Mapping**: 
    -   The frontend uses `notebookId` and `chapterNumber` (derived from chapter title like "1. Chapter Name" -> "1") for `path` query parameters. The backend must reliably map these to the correct data files or database records.
-   **Authentication and Authorization (Future Scope)**:
    -   Plan for user authentication and authorization if content access needs to be restricted.
-   **Error Handling**: 
    -   Implement comprehensive error handling for API requests (e.g., 404 for not found, 400 for bad requests, 500 for server errors).
-   **Data Consistency and Updates**: 
    -   Define how content updates will be managed. If using files, consider versioning or a clear update process. If using a database, transactions and proper indexing are important.

## 4. Development Workflow Suggestions

1.  **Core APIs First**: Implement `GET /api/notebooks` and `GET /api/notebooks/{notebookId}`. Use simple in-memory data or flat files initially for rapid prototyping.
2.  **Chapters & Basic Structure**: Implement `GET /api/notebooks/{notebookId}/chapters` and `GET /api/notebooks/{notebookId}/structure` (returning basic file/folder lists).
3.  **Content API - Iterative Approach**:
    a.  Start `GET /api/notebooks/{notebookId}/content` by returning `title`, `metadata`, `aiNotes` (from mock data), and `quiz`.
    b.  **Crucially, work with the frontend team to define and implement the `documentContent` structure in parallel.**
    c.  Incrementally add backend logic to process and serve different `documentContent` types as they are defined.
4.  **Static File Serving**: Set up a basic mechanism to serve a few test PDF or image files referenced by the `structure` API.
5.  **Database/Persistent Storage Integration**: Transition from mock/flat-file data to a chosen database or persistent storage solution.
6.  **Refine and Test**: Continuously test API endpoints with tools like Postman or directly with the frontend as it develops.

This document should serve as a living guide and be updated as development progresses and requirements evolve.
