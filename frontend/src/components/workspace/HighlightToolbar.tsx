import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Highlighter, 
  Plus, 
  Palette, 
  Edit3, 
  Trash2, 
  Check, 
  X 
} from 'lucide-react';
import { useHighlight, HighlightClass } from '@/contexts/HighlightContext';
import { toast } from 'sonner';

interface HighlightToolbarProps {
  className?: string;
}

const HighlightToolbar: React.FC<HighlightToolbarProps> = ({ className }) => {
  const {
    highlightClasses,
    addHighlightClass,
    updateHighlightClass,
    removeHighlightClass,
    selectedClassId,
    setSelectedClassId,
    isHighlightMode,
    setIsHighlightMode,
  } = useHighlight();

  const [isAddingClass, setIsAddingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#000000');
  const [newClassBgColor, setNewClassBgColor] = useState('#ffff00');

  const handleToggleHighlightMode = () => {
    setIsHighlightMode(!isHighlightMode);
    if (!isHighlightMode && !selectedClassId && highlightClasses.length > 0) {
      setSelectedClassId(highlightClasses[0].id);
    }
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) {
      toast.error('클래스 이름을 입력해주세요.');
      return;
    }

    const id = addHighlightClass(newClassName.trim(), newClassColor, newClassBgColor);
    setSelectedClassId(id);
    setNewClassName('');
    setNewClassColor('#000000');
    setNewClassBgColor('#ffff00');
    setIsAddingClass(false);
    toast.success('새 하이라이트 클래스가 추가되었습니다.');
  };

  const handleEditClass = (classItem: HighlightClass) => {
    setEditingClassId(classItem.id);
    setNewClassName(classItem.name);
    setNewClassColor(classItem.color);
    setNewClassBgColor(classItem.backgroundColor);
  };

  const handleUpdateClass = () => {
    if (!editingClassId || !newClassName.trim()) {
      toast.error('클래스 이름을 입력해주세요.');
      return;
    }

    updateHighlightClass(editingClassId, newClassName.trim(), newClassColor, newClassBgColor);
    setEditingClassId(null);
    setNewClassName('');
    setNewClassColor('#000000');
    setNewClassBgColor('#ffff00');
    toast.success('하이라이트 클래스가 수정되었습니다.');
  };

  const handleRemoveClass = (classId: string) => {
    if (highlightClasses.length <= 1) {
      toast.error('최소 하나의 하이라이트 클래스는 필요합니다.');
      return;
    }

    removeHighlightClass(classId);
    toast.success('하이라이트 클래스가 삭제되었습니다.');
  };

  const cancelEdit = () => {
    setEditingClassId(null);
    setIsAddingClass(false);
    setNewClassName('');
    setNewClassColor('#000000');
    setNewClassBgColor('#ffff00');
  };

  return (
    <div className={`flex items-center gap-2 p-2 bg-background border rounded-lg ${className}`}>
      {/* 하이라이트 모드 토글 */}
      <Button
        variant={isHighlightMode ? "default" : "outline"}
        size="sm"
        onClick={handleToggleHighlightMode}
        className="flex items-center gap-2"
      >
        <Highlighter className="h-4 w-4" />
        {isHighlightMode ? '하이라이트 ON' : '하이라이트 OFF'}
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* 하이라이트 클래스 선택 */}
      <div className="flex items-center gap-2 flex-wrap">
        {highlightClasses.map((classItem) => (
          <div key={classItem.id} className="flex items-center gap-1">
            <Button
              variant={selectedClassId === classItem.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedClassId(classItem.id)}
              className="flex items-center gap-2 min-w-0"
              style={{
                backgroundColor: selectedClassId === classItem.id ? classItem.backgroundColor : undefined,
                color: selectedClassId === classItem.id ? classItem.color : undefined,
                borderColor: classItem.backgroundColor,
              }}
            >
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: classItem.backgroundColor }}
              />
              <span className="truncate max-w-20">{classItem.name}</span>
            </Button>
            
            {/* 클래스 편집/삭제 버튼 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Edit3 className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">클래스 편집</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveClass(classItem.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {editingClassId === classItem.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="edit-name">이름</Label>
                        <Input
                          id="edit-name"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          placeholder="클래스 이름"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor="edit-text-color">글자 색상</Label>
                          <Input
                            id="edit-text-color"
                            type="color"
                            value={newClassColor}
                            onChange={(e) => setNewClassColor(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-bg-color">배경 색상</Label>
                          <Input
                            id="edit-bg-color"
                            type="color"
                            value={newClassBgColor}
                            onChange={(e) => setNewClassBgColor(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdateClass}>
                          <Check className="h-4 w-4 mr-1" />
                          저장
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: classItem.backgroundColor }}
                        />
                        <span>{classItem.name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClass(classItem)}
                        className="w-full"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        편집
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* 새 클래스 추가 */}
      <Popover open={isAddingClass} onOpenChange={setIsAddingClass}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            클래스 추가
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium">새 하이라이트 클래스</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="new-name">이름</Label>
                <Input
                  id="new-name"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="클래스 이름 (예: 중요한 부분)"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="new-text-color">글자 색상</Label>
                  <Input
                    id="new-text-color"
                    type="color"
                    value={newClassColor}
                    onChange={(e) => setNewClassColor(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-bg-color">배경 색상</Label>
                  <Input
                    id="new-bg-color"
                    type="color"
                    value={newClassBgColor}
                    onChange={(e) => setNewClassBgColor(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddClass}>
                  <Check className="h-4 w-4 mr-1" />
                  추가
                </Button>
                <Button size="sm" variant="outline" onClick={cancelEdit}>
                  <X className="h-4 w-4 mr-1" />
                  취소
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 현재 선택된 클래스 표시 */}
      {isHighlightMode && selectedClassId && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <Badge variant="secondary" className="flex items-center gap-2">
            <Palette className="h-3 w-3" />
            선택됨: {highlightClasses.find(c => c.id === selectedClassId)?.name}
          </Badge>
        </>
      )}
    </div>
  );
};

export default HighlightToolbar;