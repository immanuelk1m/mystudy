
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload } from 'lucide-react';
import FileUploader from '../uploads/FileUploader';

const UploadButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-4 w-4" />
        파일 업로드
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">학습 자료 업로드</DialogTitle>
          </DialogHeader>
          
          <FileUploader onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UploadButton;
