import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Trash2,
  Calendar
} from 'lucide-react';
import { useHighlight } from '@/contexts/HighlightContext';
import { toast } from 'sonner';

interface HighlightStatsProps {
  notebookId: string;
  chapterId: string;
}

const HighlightStats: React.FC<HighlightStatsProps> = ({ notebookId, chapterId }) => {
  const {
    highlightClasses,
    highlights,
    getHighlightsByChapter,
    removeHighlight,
    getHighlightClass,
  } = useHighlight();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = React.useState<string | null>(null);

  const chapterHighlights = getHighlightsByChapter(notebookId, chapterId);
  
  // 클래스별 하이라이트 통계
  const statsByClass = highlightClasses.map(cls => {
    const count = chapterHighlights.filter(h => h.classId === cls.id).length;
    return { ...cls, count };
  });

  // 필터링된 하이라이트
  const filteredHighlights = selectedClassFilter 
    ? chapterHighlights.filter(h => h.classId === selectedClassFilter)
    : chapterHighlights;

  const handleRemoveHighlight = (highlightId: string) => {
    removeHighlight(highlightId);
    
    // DOM에서도 제거
    const element = document.getElementById(highlightId);
    if (element) {
      const parent = element.parentNode;
      if (parent) {
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
        parent.normalize();
      }
    }
    
    toast.success('하이라이트가 제거되었습니다.');
  };

  const scrollToHighlight = (highlightId: string) => {
    const element = document.getElementById(highlightId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 잠시 강조 효과
      element.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
      setTimeout(() => {
        element.style.boxShadow = '';
      }, 2000);
    }
  };

  if (chapterHighlights.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                하이라이트 통계
                <Badge variant="secondary">{chapterHighlights.length}개</Badge>
              </div>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* 클래스별 통계 */}
            <div>
              <h4 className="font-medium mb-3">클래스별 분포</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant={selectedClassFilter === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedClassFilter(null)}
                  className="justify-start"
                >
                  전체 ({chapterHighlights.length})
                </Button>
                {statsByClass.map((stat) => (
                  <Button
                    key={stat.id}
                    variant={selectedClassFilter === stat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedClassFilter(stat.id)}
                    className="justify-start"
                    style={{
                      backgroundColor: selectedClassFilter === stat.id ? stat.backgroundColor : undefined,
                      color: selectedClassFilter === stat.id ? stat.color : undefined,
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: stat.backgroundColor }}
                    />
                    {stat.name} ({stat.count})
                  </Button>
                ))}
              </div>
            </div>

            {/* 하이라이트 목록 */}
            {filteredHighlights.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">
                  하이라이트 목록 
                  {selectedClassFilter && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      - {getHighlightClass(selectedClassFilter)?.name}
                    </span>
                  )}
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredHighlights.map((highlight) => {
                    const highlightClass = getHighlightClass(highlight.classId);
                    if (!highlightClass) return null;

                    return (
                      <div
                        key={highlight.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: highlightClass.backgroundColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            "{highlight.text.length > 50 
                              ? highlight.text.substring(0, 50) + '...' 
                              : highlight.text}"
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {highlight.createdAt.toLocaleDateString()}
                            <Badge variant="outline" className="text-xs">
                              {highlightClass.name}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => scrollToHighlight(highlight.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveHighlight(highlight.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default HighlightStats;