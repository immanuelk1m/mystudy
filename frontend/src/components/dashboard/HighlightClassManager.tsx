import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X,
  Settings
} from 'lucide-react';
import { useHighlight, HighlightClass } from '@/contexts/HighlightContext';
import { toast } from 'sonner';

const HighlightClassManager: React.FC = () => {
  const {
    highlightClasses,
    addHighlightClass,
    updateHighlightClass,
    removeHighlightClass,
    highlights,
  } = useHighlight();

  const [isOpen, setIsOpen] = useState(false);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#000000');
  const [newClassBgColor, setNewClassBgColor] = useState('#ffff00');

  const handleAddClass = () => {
    if (!newClassName.trim()) {
      toast.error('클래스 이름을 입력해주세요.');
      return;
    }

    addHighlightClass(newClassName.trim(), newClassColor, newClassBgColor);
    resetForm();
    toast.success('새 하이라이트 클래스가 추가되었습니다.');
  };

  const handleEditClass = (classItem: HighlightClass) => {
    setEditingClassId(classItem.id);
    setNewClassName(classItem.name);
    setNewClassColor(classItem.color);
    setNewClassBgColor(classItem.backgroundColor);
    setIsAddingClass(false);
  };

  const handleUpdateClass = () => {
    if (!editingClassId || !newClassName.trim()) {
      toast.error('클래스 이름을 입력해주세요.');
      return;
    }

    updateHighlightClass(editingClassId, newClassName.trim(), newClassColor, newClassBgColor);
    resetForm();
    toast.success('하이라이트 클래스가 수정되었습니다.');
  };

  const handleRemoveClass = (classId: string) => {
    const classItem = highlightClasses.find(c => c.id === classId);
    const highlightCount = highlights.filter(h => h.classId === classId).length;
    
    if (highlightClasses.length <= 1) {
      toast.error('최소 하나의 하이라이트 클래스는 필요합니다.');
      return;
    }

    if (highlightCount > 0) {
      const confirmMessage = `"${classItem?.name}" 클래스를 삭제하면 ${highlightCount}개의 하이라이트도 함께 삭제됩니다. 계속하시겠습니까?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    removeHighlightClass(classId);
    toast.success('하이라이트 클래스가 삭제되었습니다.');
  };

  const resetForm = () => {
    setIsAddingClass(false);
    setEditingClassId(null);
    setNewClassName('');
    setNewClassColor('#000000');
    setNewClassBgColor('#ffff00');
  };

  const getClassUsageCount = (classId: string): number => {
    return highlights.filter(h => h.classId === classId).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          하이라이트 클래스 관리
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            하이라이트 클래스 관리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 새 클래스 추가 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                새 클래스 추가
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-class-name">클래스 이름</Label>
                  <Input
                    id="new-class-name"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="예: 중요한 부분, 복습 필요 등"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-text-color">글자 색상</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="new-text-color"
                        type="color"
                        value={newClassColor}
                        onChange={(e) => setNewClassColor(e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={newClassColor}
                        onChange={(e) => setNewClassColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="new-bg-color">배경 색상</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="new-bg-color"
                        type="color"
                        value={newClassBgColor}
                        onChange={(e) => setNewClassBgColor(e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={newClassBgColor}
                        onChange={(e) => setNewClassBgColor(e.target.value)}
                        placeholder="#ffff00"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                
                {/* 미리보기 */}
                <div className="p-3 border rounded-lg bg-muted">
                  <Label className="text-sm text-muted-foreground">미리보기:</Label>
                  <div className="mt-2">
                    <span
                      className="px-2 py-1 rounded"
                      style={{
                        backgroundColor: newClassBgColor,
                        color: newClassColor,
                      }}
                    >
                      {newClassName || '클래스 이름'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingClassId ? (
                    <>
                      <Button onClick={handleUpdateClass} className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        수정 완료
                      </Button>
                      <Button variant="outline" onClick={resetForm} className="flex items-center gap-2">
                        <X className="h-4 w-4" />
                        취소
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleAddClass} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      클래스 추가
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 기존 클래스 목록 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">기존 클래스 목록</h3>
            <div className="space-y-3">
              {highlightClasses.map((classItem) => {
                const usageCount = getClassUsageCount(classItem.id);
                
                return (
                  <Card key={classItem.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-6 h-6 rounded border-2"
                          style={{ backgroundColor: classItem.backgroundColor }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{classItem.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {usageCount}개 사용 중
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <span
                              className="px-2 py-1 rounded text-xs"
                              style={{
                                backgroundColor: classItem.backgroundColor,
                                color: classItem.color,
                              }}
                            >
                              미리보기 텍스트
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClass(classItem)}
                          className="flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          편집
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveClass(classItem.id)}
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          삭제
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 통계 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">통계</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{highlightClasses.length}</div>
                  <div className="text-sm text-muted-foreground">총 클래스 수</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{highlights.length}</div>
                  <div className="text-sm text-muted-foreground">총 하이라이트 수</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HighlightClassManager;