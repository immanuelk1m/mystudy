import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHighlight } from '@/contexts/HighlightContext';
import { toast } from 'sonner';

const HighlightDemo: React.FC = () => {
  const { addHighlight, highlightClasses } = useHighlight();

  const addDemoHighlights = () => {
    const demoHighlights = [
      {
        text: "인공지능의 핵심 개념",
        classId: 'yellow',
        notebookId: 'demo',
        chapterId: 'demo',
        startOffset: 0,
        endOffset: 10,
        containerSelector: '.demo-content',
      },
      {
        text: "머신러닝 알고리즘",
        classId: 'green',
        notebookId: 'demo',
        chapterId: 'demo',
        startOffset: 20,
        endOffset: 30,
        containerSelector: '.demo-content',
      },
      {
        text: "딥러닝 네트워크",
        classId: 'red',
        notebookId: 'demo',
        chapterId: 'demo',
        startOffset: 40,
        endOffset: 50,
        containerSelector: '.demo-content',
      },
    ];

    demoHighlights.forEach(highlight => {
      addHighlight(highlight);
    });

    toast.success('데모 하이라이트가 추가되었습니다!');
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">하이라이트 기능 데모</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="demo-content p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-2">AI와 머신러닝 개요</h3>
          <p className="text-sm leading-relaxed">
            인공지능의 핵심 개념은 컴퓨터가 인간처럼 학습하고 추론할 수 있도록 하는 것입니다. 
            머신러닝 알고리즘을 통해 데이터에서 패턴을 찾고 예측을 수행합니다. 
            특히 딥러닝 네트워크는 복잡한 문제를 해결하는 데 매우 효과적입니다.
            이러한 기술들은 현재 다양한 분야에서 혁신을 이끌고 있습니다.
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            위 텍스트에서 중요한 부분을 드래그하여 하이라이트해보세요!
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={addDemoHighlights}>
              데모 하이라이트 추가
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">사용 가능한 하이라이트 클래스:</h4>
          <div className="flex flex-wrap gap-2">
            {highlightClasses.map(cls => (
              <div
                key={cls.id}
                className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                style={{
                  backgroundColor: cls.backgroundColor,
                  color: cls.color,
                }}
              >
                {cls.name}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HighlightDemo;