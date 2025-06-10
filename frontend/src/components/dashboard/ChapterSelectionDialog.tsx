import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getChapters, Chapter } from '@/services/api'; // getChapters와 Chapter 타입을 api.ts에서 가져옵니다.

interface ChapterSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId: string;
  notebookTitle: string;
}

const ChapterSelectionDialog = ({
  open,
  onOpenChange,
  notebookId,
  notebookTitle
}: ChapterSelectionDialogProps) => {
  // 이제 챕터의 ID(숫자)를 저장합니다.
  const [selectedChapterId, setSelectedChapterId] = useState<string>(""); 
  // Chapter 객체 배열을 저장합니다.
  const [chapters, setChapters] = useState<Chapter[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !notebookId) {
      setChapters([]);
      setSelectedChapterId("");
      return;
    }

    const fetchChapters = async () => {
      setLoading(true);
      setError(null);
      try {
        // 새로 만든 백엔드 API를 호출합니다.
        const chaptersData = await getChapters(notebookId);
        setChapters(chaptersData || []);
      } catch (err) {
        console.error(`Failed to fetch chapters for notebook ${notebookId}:`, err);
        const errorMessage = err instanceof Error ? err.message : "알 수 없는 에러가 발생했습니다.";
        setError(`챕터 목록을 불러오는 데 실패했습니다: ${errorMessage}`);
        toast.error(`챕터 목록 로딩 실패: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [open, notebookId]);

  const handleOpenWorkspace = () => {
    if (!selectedChapterId) {
      toast.error("계속하려면 챕터를 선택해주세요");
      return;
    }
    
    // 이제 chapter의 ID를 URL 파라미터로 사용합니다.
    navigate(`/workspace/${notebookId}?chapter=${selectedChapterId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">"{notebookTitle}"에서 챕터 선택</DialogTitle>
          <DialogDescription>학습할 챕터를 선택해주세요.</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center text-destructive">{error}</div>
          ) : chapters.length === 0 ? (
            <div className="text-center text-muted-foreground">사용 가능한 챕터가 없습니다.</div>
          ) : (
            <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="챕터 선택" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  // key와 value에 chapter.id를 사용합니다.
                  <SelectItem key={chapter.id} value={chapter.id.toString()}>
                    {chapter.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              취소
            </Button>
            <Button onClick={handleOpenWorkspace} disabled={!selectedChapterId || loading}>
              챕터 열기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChapterSelectionDialog;