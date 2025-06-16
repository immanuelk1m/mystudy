import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, MousePointer, MousePointer2 } from 'lucide-react';
import { useHighlight } from '@/contexts/HighlightContext';

const HighlightGuide: React.FC = () => {
  const { isHighlightMode, selectedClassId, getHighlightClass } = useHighlight();

  if (!isHighlightMode) return null;

  const selectedClass = selectedClassId ? getHighlightClass(selectedClassId) : null;

  return (
    <Alert className="mb-4 bg-blue-50 border-blue-200">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="space-y-2">
          <div className="font-medium">하이라이트 모드가 활성화되었습니다</div>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <MousePointer className="h-3 w-3" />
              <span>텍스트를 드래그하여 선택하면 하이라이트가 적용됩니다</span>
            </div>
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-3 w-3" />
              <span>하이라이트된 텍스트를 더블클릭하면 제거됩니다</span>
            </div>
            {selectedClass && (
              <div className="flex items-center gap-2 mt-2">
                <span>현재 선택된 클래스:</span>
                <span
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: selectedClass.backgroundColor,
                    color: selectedClass.color,
                  }}
                >
                  {selectedClass.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default HighlightGuide;