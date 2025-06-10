const API_BASE_URL = 'http://localhost:8000/api'; // 백엔드 API 기본 URL

interface GenerateAiNotesResponse {
  message: string;
  // 백엔드가 current_ai_notes_placeholder를 반환하므로, 필요하다면 해당 타입도 정의할 수 있습니다.
  // current_ai_notes_placeholder?: any; 
}

interface UploadPdfResponse {
  message: string;
  notebook_id: string;
  new_chapter_number: string;
  new_chapter_title: string;
  pdf_path: string;
  generated_content_preview: {
    title: string;
    metadata: string;
    ai_summary: string;
  };
}

/**
 * 특정 챕터에 대한 AI 노트 생성을 요청합니다.
 * @param notebookId 노트북 ID
 * @param chapterNumber 챕터 번호 (문자열 형태)
 * @returns 백엔드 응답 (AI 노트 생성 시작 메시지)
 */
export const generateAiNotes = async (
  notebookId: string,
  chapterNumber: string
): Promise<GenerateAiNotesResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/notebooks/${notebookId}/content/${chapterNumber}/generate-ai-notes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // 이 엔드포인트는 body를 요구하지 않지만, 필요시 추가할 수 있습니다.
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to generate AI notes. Unknown error.' }));
    throw new Error(errorData.detail || 'Failed to generate AI notes');
  }
  return response.json();
};

/**
 * PDF 파일을 업로드하여 새 챕터 생성을 요청합니다.
 * @param notebookId 노트북 ID
 * @param file 업로드할 PDF 파일 객체
 * @returns 새로 생성된 챕터 정보
 */
export const uploadPdfAndCreateChapter = async (
  notebookId: string,
  file: File
): Promise<UploadPdfResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/notebooks/${notebookId}/upload-and-create-chapter`,
    {
      method: 'POST',
      // 'Content-Type': 'multipart/form-data' 헤더는 FormData 사용 시 브라우저가 자동으로 설정합니다.
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to upload PDF and create chapter. Unknown error.' }));
    throw new Error(errorData.detail || 'Failed to upload PDF and create chapter');
  }
  return response.json();
};

// 새로운 인터페이스 및 함수 추가 시작
interface BatchProcessPdfsResponse {
  message: string;
  // 백엔드에서 작업 ID 등을 반환할 경우 추가할 수 있습니다.
  // taskId?: string;
  // processed_files_count?: number;
  // failed_files_count?: number;
}

/**
 * 여러 PDF 파일을 백엔드로 업로드하여 일괄 처리를 요청합니다.
 * @param files 업로드할 PDF 파일 객체 배열
 * @returns 백엔드 응답 (일괄 처리 시작 메시지 등)
 */
export const uploadMultiplePdfs = async (
  files: File[]
): Promise<BatchProcessPdfsResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file); // 백엔드에서 받을 때 'files'라는 키로 여러 파일을 받게 됩니다.
  });

  const response = await fetch(
    `${API_BASE_URL}/batch-process-pdfs/`, // 새 엔드포인트 경로
    {
      method: 'POST',
      // 'Content-Type': 'multipart/form-data' 헤더는 FormData 사용 시 브라우저가 자동으로 설정합니다.
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      detail: 'Failed to upload multiple PDFs. Unknown error.' 
    }));
    throw new Error(errorData.detail || 'Failed to upload multiple PDFs');
  }
  return response.json();
};
// 새로운 인터페이스 및 함수 추가 끝


// 추가적인 인터페이스 정의
export interface Notebook {
  id: number;
  title: string;
  // 백엔드 모델에 따라 필드를 추가/수정하세요.
  // 예: created_at: string;
}

export interface Chapter {
  id: number;
  title: string;
  notebook_id: number;
  // 예: chapter_number: number;
}


export interface ChapterContent {
  // 챕터 내용에 대한 타입을 정의합니다.
  // 예: title: string; summary: string; etc.
  [key: string]: any; // 우선 간단하게 정의
}

export interface ChapterStructure {
  // 챕터 구조에 대한 타입을 정의합니다.
  [key: string]: any; // 우선 간단하게 정의
}

// 기존 함수들...

// --- 데이터 로딩을 위한 새 API 함수들 ---

/**
 * 모든 노트북 목록을 가져옵니다.
 */
export const getNotebooks = async (): Promise<Notebook[]> => {
  const response = await fetch(`${API_BASE_URL}/notebooks`);
  if (!response.ok) {
    throw new Error('Failed to fetch notebooks');
  }
  return response.json();
};

/**
 * 특정 노트북의 정보를 가져옵니다.
 * @param notebookId 노트북 ID
 */
export const getNotebook = async (notebookId: string): Promise<Notebook> => {
  const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch notebook ${notebookId}`);
  }
  return response.json();
};

/**
 * 특정 노트북의 챕터 목록을 가져옵니다.
 * @param notebookId 노트북 ID
 */
export const getChapters = async (notebookId: string): Promise<Chapter[]> => {
  const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/chapters`);
  if (!response.ok) {
    throw new Error(`Failed to fetch chapters for notebook ${notebookId}`);
  }
  return response.json();
};

/**
 * 특정 챕터의 컨텐츠를 가져옵니다.
 * @param notebookId 노트북 ID
 * @param chapterId 챕터 ID
 */
export const getChapterContent = async (notebookId: string, chapterId: string): Promise<ChapterContent> => {
  const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/content?path=${chapterId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch content for chapter ${chapterId}`);
  }
  return response.json();
};

/**
 * 특정 챕터의 구조를 가져옵니다.
 * @param notebookId 노트북 ID
 * @param chapterId 챕터 ID
 */
export const getChapterStructure = async (notebookId: string, chapterId: string): Promise<ChapterStructure> => {
    const response = await fetch(`${API_BASE_URL}/notebooks/${notebookId}/structure?path=${chapterId}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch structure for chapter ${chapterId}`);
    }
    return response.json();
};
