import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Zap,
  Target,
  BarChart3,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { aiPredictionService, PredictionResult } from '@/services/aiPredictionService';
import { ProcessingProgress } from '@/contexts/UploadProgressContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIPredictionPanelProps {
  tasks: ProcessingProgress[];
  className?: string;
}

const AIPredictionPanel: React.FC<AIPredictionPanelProps> = ({ tasks, className }) => {
  const [predictions, setPredictions] = useState<Map<string, PredictionResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // AI 예측 업데이트
  const updatePredictions = async () => {
    if (tasks.length === 0) return;
    
    setIsLoading(true);
    try {
      const newPredictions = new Map<string, PredictionResult>();
      
      for (const task of tasks) {
        if (task.status !== 'completed' && task.status !== 'failed') {
          const prediction = await aiPredictionService.predictCompletion(task);
          newPredictions.set(task.task_id, prediction);
        }
      }
      
      setPredictions(newPredictions);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to update AI predictions:', error);
      toast.error('AI 예측 업데이트에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 자동 예측 업데이트
  useEffect(() => {
    updatePredictions();
    
    const interval = setInterval(updatePredictions, 10000); // 10초마다 업데이트
    return () => clearInterval(interval);
  }, [tasks]);

  // 전체 예상 완료 시간 계산
  const getOverallPrediction = () => {
    if (predictions.size === 0) return null;
    
    const activePredictions = Array.from(predictions.values());
    const maxCompletionTime = Math.max(...activePredictions.map(p => p.estimatedCompletionTime));
    const avgConfidence = activePredictions.reduce((sum, p) => sum + p.confidence, 0) / activePredictions.length;
    
    return {
      estimatedCompletionTime: maxCompletionTime,
      confidence: avgConfidence,
      totalTasks: activePredictions.length
    };
  };

  // 성능 최적화 제안 생성
  const getOptimizationSuggestions = () => {
    const suggestions: string[] = [];
    
    predictions.forEach((prediction, taskId) => {
      if (prediction.confidence < 0.7) {
        suggestions.push(`${taskId}: 예측 신뢰도가 낮습니다. 파일 크기나 복잡도를 확인해보세요.`);
      }
      
      if (prediction.estimatedCompletionTime > 300) { // 5분 이상
        suggestions.push(`${taskId}: 처리 시간이 길어질 것으로 예상됩니다. 파일을 분할하는 것을 고려해보세요.`);
      }
      
      prediction.recommendations.forEach(rec => {
        suggestions.push(`${taskId}: ${rec}`);
      });
    });
    
    return suggestions;
  };

  const overallPrediction = getOverallPrediction();
  const suggestions = getOptimizationSuggestions();

  if (tasks.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-purple-600" />
            AI 예측 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>진행 중인 작업이 없습니다</p>
            <p className="text-sm">파일을 업로드하면 AI 예측이 시작됩니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-purple-600" />
            AI 예측 분석
            {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={updatePredictions}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            마지막 업데이트: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 전체 예측 요약 */}
        {overallPrediction && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">전체 예상 완료 시간</span>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-blue-700">
                  {Math.ceil(overallPrediction.estimatedCompletionTime / 60)}분 {overallPrediction.estimatedCompletionTime % 60}초
                </span>
                <Badge variant={overallPrediction.confidence > 0.8 ? "default" : "secondary"}>
                  신뢰도 {Math.round(overallPrediction.confidence * 100)}%
                </Badge>
              </div>
              
              <Progress 
                value={overallPrediction.confidence * 100} 
                className="h-2"
              />
              
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{overallPrediction.totalTasks}개 작업 분석 중</span>
                <span>
                  {overallPrediction.confidence > 0.8 ? '높은 정확도' : 
                   overallPrediction.confidence > 0.6 ? '보통 정확도' : '낮은 정확도'}
                </span>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* 개별 작업 예측 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-600" />
            <span className="font-medium text-sm">개별 작업 분석</span>
          </div>
          
          <div className="space-y-2">
            {tasks.map(task => {
              const prediction = predictions.get(task.task_id);
              if (!prediction) return null;
              
              return (
                <div key={task.task_id} className="p-3 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate flex-1">
                      {task.filename}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {Math.ceil(prediction.estimatedCompletionTime / 60)}분
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>예상 완료: {new Date(Date.now() + prediction.estimatedCompletionTime * 1000).toLocaleTimeString()}</span>
                  </div>
                  
                  <Progress 
                    value={prediction.confidence * 100} 
                    className="h-1 mt-2"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 최적화 제안 */}
        {suggestions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-sm">AI 최적화 제안</span>
              </div>
              
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
                    <Zap className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-yellow-800">{suggestion}</span>
                  </div>
                ))}
                
                {suggestions.length > 3 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    {suggestions.length - 3}개 제안 더 보기
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* 성능 지표 */}
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <TrendingUp className="h-4 w-4 text-green-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-green-700">처리 효율성</div>
            <div className="text-sm font-bold text-green-800">
              {overallPrediction ? Math.round(overallPrediction.confidence * 100) : 0}%
            </div>
          </div>
          
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-blue-600 mx-auto mb-1" />
            <div className="text-xs font-medium text-blue-700">예측 정확도</div>
            <div className="text-sm font-bold text-blue-800">
              {predictions.size > 0 ? 
                Math.round(Array.from(predictions.values()).reduce((sum, p) => sum + p.confidence, 0) / predictions.size * 100) : 0}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIPredictionPanel;