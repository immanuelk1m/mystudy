
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Book, MoreVertical, Edit, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import ChapterSelectionDialog from './ChapterSelectionDialog';
import { updateNotebook, deleteNotebook } from '../../services/api';

interface NotebookCardProps {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
  filesCount: number;
  onUpdate?: () => void; // 업데이트 후 부모 컴포넌트에서 목록을 새로고침하기 위한 콜백
}

const NotebookCard = ({ id, title, description, lastUpdated, filesCount, onUpdate }: NotebookCardProps) => {
  const [showChapterSelection, setShowChapterSelection] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSaveEdit = async () => {
    if (editTitle.trim() === '') {
      toast.error('제목을 입력해주세요.');
      return;
    }

    if (editTitle === title) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await updateNotebook(id, editTitle);
      toast.success('노트북 제목이 수정되었습니다.');
      setIsEditing(false);
      onUpdate?.(); // 부모 컴포넌트에 업데이트 알림
    } catch (error) {
      console.error('Failed to update notebook:', error);
      toast.error('노트북 수정에 실패했습니다.');
      setEditTitle(title); // 원래 제목으로 되돌리기
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(title);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteNotebook(id);
      toast.success('노트북이 삭제되었습니다.');
      onUpdate?.(); // 부모 컴포넌트에 업데이트 알림
    } catch (error) {
      console.error('Failed to delete notebook:', error);
      toast.error('노트북 삭제에 실패했습니다.');
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className="nota-card">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="bg-secondary p-2 rounded-md">
              <Book className="h-6 w-6 text-primary" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)} disabled={isLoading}>
                  <Edit className="mr-2 h-4 w-4" />
                  제목 수정
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)} 
                  disabled={isLoading}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="노트북 제목을 입력하세요"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={isLoading}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <CardTitle className="text-lg font-medium mt-2 line-clamp-1">{title}</CardTitle>
          )}
          
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        </CardHeader>
        
        <CardContent className="pb-2">
          <div className="text-sm text-muted-foreground">
            <p>{filesCount}개 파일</p>
            <p>마지막 업데이트: {lastUpdated}</p>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setShowChapterSelection(true)}
            disabled={isLoading || isEditing}
          >
            노트북 열기
          </Button>
        </CardFooter>
      </Card>

      <ChapterSelectionDialog 
        open={showChapterSelection}
        onOpenChange={setShowChapterSelection}
        notebookId={id}
        notebookTitle={title}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>노트북 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{title}" 노트북을 삭제하시겠습니까? 
              이 작업은 되돌릴 수 없으며, 모든 챕터와 파일이 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NotebookCard;
