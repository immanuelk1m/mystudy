import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
const CreateNotebookButton = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      // In a real app, we would create a notebook here
      toast.success('노트북이 성공적으로 생성되었습니다!');
      setOpen(false);
      // Reset form
      setTitle('');
      setDescription('');

      // Refresh the page to show the new notebook
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };
  return <>
      

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">새 노트북 만들기</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title">노트북 제목</Label>
              <Input id="title" placeholder="예: 생물학 101" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택 사항)</Label>
              <Textarea id="description" placeholder="이 노트북은 무엇에 관한 것인가요?" value={description} onChange={e => setDescription(e.target.value)} className="min-h-[100px]" />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button type="submit">노트북 만들기</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>;
};
export default CreateNotebookButton;