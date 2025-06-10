
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book } from 'lucide-react';
import ChapterSelectionDialog from './ChapterSelectionDialog';

interface NotebookCardProps {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
  filesCount: number;
}

const NotebookCard = ({ id, title, description, lastUpdated, filesCount }: NotebookCardProps) => {
  const [showChapterSelection, setShowChapterSelection] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Card className="nota-card">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="bg-secondary p-2 rounded-md">
              <Book className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-lg font-medium mt-2 line-clamp-1">{title}</CardTitle>
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
    </>
  );
};

export default NotebookCard;
