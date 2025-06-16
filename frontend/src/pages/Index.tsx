import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import NotebookCard from '../components/dashboard/NotebookCard';
import CreateNotebookButton from '../components/dashboard/CreateNotebookButton';
import UploadButton from '../components/dashboard/UploadButton';
import HighlightClassManager from '../components/dashboard/HighlightClassManager';
import UploadProgressTracker from '@/components/uploads/UploadProgressTracker';
import EnhancedUploadProgressTracker from '@/components/uploads/EnhancedUploadProgressTracker';
import ProgressNotificationSystem from '@/components/uploads/ProgressNotificationSystem';
import ProgressStatistics from '@/components/uploads/ProgressStatistics';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getNotebooks, Notebook } from '../services/api'; // api.ts에서 getNotebooks와 Notebook 타입을 가져옵니다.

const Index = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotebooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotebooks(); // API 함수를 호출합니다.
      setNotebooks(data);
    } catch (err) {
      console.error("Failed to fetch notebooks:", err);
      setError("노트북 목록을 불러오는 데 실패했습니다.");
      toast.error("노트북 목록을 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">내 수강목록</h1>
          <div className="flex items-center gap-3">
            <HighlightClassManager />
            <UploadButton />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-60">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">노트북을 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-destructive">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <CreateNotebookButton />

            {notebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                id={notebook.id.toString()} // ID를 문자열로 변환
                title={notebook.title}
                // 백엔드 응답에 맞게 description, lastUpdated, filesCount를 수정해야 합니다.
                // 현재 백엔드 Notebook 모델에는 해당 필드가 없으므로 임시 값을 사용하거나
                // NotebookCard 컴포넌트를 수정해야 합니다. 우선 빈 값으로 전달합니다.
                description={notebook.description || ""}
                lastUpdated={notebook.lastUpdated ? new Date(notebook.lastUpdated).toLocaleDateString() : ""}
                filesCount={notebook.filesCount || 0}
                onUpdate={fetchNotebooks} // 업데이트 후 목록 새로고침
              />
            ))}
          </div>
        )}
        
        {/* 진행 상황 통계 */}
        <div className="mt-8">
          <ProgressStatistics />
        </div>
        
        {/* 업로드 진행 상황 추적기 */}
        <div className="mt-4">
          <EnhancedUploadProgressTracker />
        </div>
        
        {/* 진행 상황 알림 시스템 */}
        <ProgressNotificationSystem />
      </div>
    </MainLayout>
  );
};

export default Index;