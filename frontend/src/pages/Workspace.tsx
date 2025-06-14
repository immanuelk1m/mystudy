import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Sidebar from '../components/workspace/Sidebar';
import DocumentViewer from '../components/workspace/DocumentViewer';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  getNotebook,
  getChapters,
  getChapterContent,
  getChapterStructure,
  Chapter,
  ChapterContent,
  ChapterStructure,
  Notebook,
} from '../services/api';

// --- Type Definitions ---
// DocumentViewer가 요구하는 타입과 일치시킵니다.
interface DocumentContent {
  title: string;
  metadata: string;
  documentContent: Array<{ type: string; level?: number; text?: string; items?: string[] }>;
  aiNotes: {
    summary: string;
    keyConcepts: Array<{ term: string; definition: string }>;
    importantTerms: Array<{ term: string; definition: string }>;
    outline: Array<{ title: string; id: string }>;
  };
  quiz: Array<{
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }>;
  game_html?: string;
}

// Sidebar에 필요한 파일 구조 타입. Chapter 데이터를 이 형태로 변환합니다.
interface FileStructureItem {
  name: string;
  type: 'file' | 'folder';
  path: string; // chapter ID
  children?: FileStructureItem[];
  notebookId: string;
  selectedChapter: string | null;
}

// --- End Type Definitions ---

const Workspace = () => {
  const { id: notebookId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const chapterId = searchParams.get('chapter');

  const [documentData, setDocumentData] = useState<DocumentContent | null>(null);
  const [fileStructure, setFileStructure] = useState<FileStructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [selectedView, setSelectedView] = useState<string>('document');

  useEffect(() => {
    if (!notebookId) {
      setError("노트북 ID가 없습니다.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [notebookData, chaptersResponse] = await Promise.all([
          getNotebook(notebookId),
          getChapters(notebookId),
        ]);

        setNotebook(notebookData);

        // API가 직접 Chapter[]를 반환하므로 변환 로직이 불필요합니다.
        // chaptersResponse를 직접 사용하여 사이드바 구조를 만듭니다.
        const transformedStructure = chaptersResponse.map(chap => ({
            name: chap.title,
            type: 'file' as const,
            path: chap.id.toString(),
            notebookId: notebookId,
            selectedChapter: chapterId,
        }));
        setFileStructure(transformedStructure);
        
        // 표시할 챕터 ID를 결정합니다. (URL 파라미터 우선)
        const targetChapterId = chapterId || (chaptersResponse.length > 0 ? chaptersResponse[0].id.toString() : null);

        if (targetChapterId) {
            const [contentData, structureData] = await Promise.all([
                getChapterContent(notebookId, targetChapterId),
                getChapterStructure(notebookId, targetChapterId)
            ]);

            const chapterInfo = chaptersResponse.find(ch => ch.id.toString() === targetChapterId);

            const transformedData: DocumentContent = {
                title: contentData.title || '제목 없음',
                metadata: contentData.metadata || '',
                documentContent: structureData.nodes || [],
                aiNotes: contentData.aiNotes || { summary: '', keyConcepts: [], importantTerms: [], outline: [] },
                quiz: contentData.quiz || [],
                game_html: chapterInfo?.game_html || contentData.game_html,
                ...contentData,
            };
            setDocumentData(transformedData);
        } else {
            setDocumentData(null);
        }

      } catch (err: any) {
        console.error("Workspace 데이터 로딩 중 에러 발생:", err);
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 에러 발생';
        setError(`데이터를 불러오는 데 실패했습니다: ${errorMessage}`);
        toast.error(`데이터 로딩 실패: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [notebookId, chapterId]);

  const handleSelectView = (view: string) => {
    setSelectedView(view);
  };

  // --- Render Logic ---
  return (
     <MainLayout>
       {loading && (
         <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
       )}
       {!loading && error && (
         <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-destructive p-4 text-center">
           <p className="mb-4">{error}</p>
            <a href="/" className="text-primary hover:underline mt-4 block">
                 대시보드로 돌아가기
            </a>
         </div>
       )}
       {!loading && !error && notebookId && (
         <div className="h-[calc(100vh-4rem)] flex">
           <div className="w-64 h-full flex-shrink-0 border-r bg-muted/40">
             <Sidebar
               notebookId={notebookId}
               selectedChapter={chapterId}
               fileStructure={fileStructure}
               aiOutline={documentData?.aiNotes?.outline || []}
               notebookTitle={notebook?.title || `Notebook ${notebookId}`}
             />
           </div>
           <div className="flex-1 min-w-0 overflow-hidden">
             {chapterId && documentData ? (
                selectedView === 'document' && (
                 <DocumentViewer
                   notebookId={notebookId}
                   selectedChapter={chapterId}
                   documentData={documentData}
                   fileStructure={fileStructure}
                 />
               )
             ) : (
                <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">왼쪽 사이드바에서 챕터를 선택해주세요.</p>
                </div>
             )}
           </div>
         </div>
       )}
     </MainLayout>
   );
};

export default Workspace;