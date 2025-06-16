import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Brain, 
  Zap, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ProcessingProgress } from '@/contexts/UploadProgressContext';
import { aiPredictionService, PredictionResult } from '@/services/aiPredictionService';
import AIPredictionPanel from './AIPredictionPanel';
import SmartAnalyticsPanel from './SmartAnalyticsPanel';
import { toast } from 'sonner';

const AIEnhancedDemo: React.FC = () => {
  const [demoTasks, setDemoTasks] = useState<ProcessingProgress[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [predictions, setPredictions] = useState<Map<string, PredictionResult>>(new Map());

  // 데모 작업 생성
  const createDemoTask = (id: string, filename: string, initialProgress: number = 0): ProcessingProgress => ({
    task_id: id,
    notebook_id: Math.floor(Math.random() * 100),
    filename,
    status: 'uploading',
    overall_progress: initialProgress,
    current_step: '파일 업로드',
    steps: [
      { 
        name: '파일 업로드', 
        status: 'uploading', 
        progress: initialProgress, 
        message: '파일을 서버로 전송 중...',
        started_at: Date.now() / 1000
      },
      { 
        name: '텍스트 추출', 
        status: 'pending', 
        progress: 0, 
        message: 'PDF 텍스트 추출 대기 중' 
      },
      { 
        name: 'AI 콘텐츠 생성', 
        status: 'pending', 
        progress: 0, 
        message: 'AI 콘텐츠 생성 대기 중' 
      },
      { 
        name: '데이터베이스 저장', 
        status: 'pending', 
        progress: 0, 
        message: '데이터베이스 저장 대기 중' 
      },
    ],
    started_at: Date.now() / 1000
  });

  // 데모 시작
  const startDemo = () => {
    const tasks = [
      createDemoTask('demo-1', '머신러닝_기초_이론.pdf', 15),
      createDemoTask('demo-2', '데이터_사이언스_실습_가이드.pdf', 45),
      createDemoTask('demo-3', 'AI_윤리와_사회적_영향_연구.pdf', 0),
    ];
    
    setDemoTasks(tasks);
    setIsRunning(true);
    
    toast.success('AI 강화 데모가 시작되었습니다!', {
      description: '실시간 예측과 분석을 확인해보세요.'
    });
  };

  // 데모 중지
  const stopDemo = () => {
    setIsRunning(false);
    toast.info('데모가 중지되었습니다.');
  };

  // 데모 리셋
  const resetDemo = () => {
    setDemoTasks([]);
    setPredictions(new Map());
    setIsRunning(false);
    toast.info('데모가 리셋되었습니다.');
  };

  // 작업 진행 시뮬레이션
  useEffect(() => {
    if (!isRunning || demoTasks.length === 0) return;

    const interval = setInterval(() => {
      setDemoTasks(prevTasks => {
        return prevTasks.map(task => {
          if (task.status === 'completed' || task.status === 'failed') {
            return task;
          }

          const currentStepIndex = task.steps.findIndex(step => step.name === task.current_step);
          const currentStep = task.steps[currentStepIndex];
          
          if (!currentStep) return task;

          // 진행률 증가 (랜덤하게)
          const progressIncrement = Math.random() * 15 + 5; // 5-20% 증가
          const newProgress = Math.min(100, currentStep.progress + progressIncrement);
          
          const updatedSteps = [...task.steps];
          updatedSteps[currentStepIndex] = {
            ...currentStep,
            progress: newProgress,
            status: newProgress >= 100 ? 'completed' : 'uploading',
            message: newProgress >= 100 ? `${currentStep.name} 완료` : `${currentStep.name} 진행 중... ${Math.round(newProgress)}%`,
            completed_at: newProgress >= 100 ? Date.now() / 1000 : undefined
          };

          // 다음 단계로 이동
          let newCurrentStep = task.current_step;
          let newOverallProgress = task.overall_progress;
          let newStatus = task.status;

          if (newProgress >= 100 && currentStepIndex < task.steps.length - 1) {
            const nextStepIndex = currentStepIndex + 1;
            newCurrentStep = task.steps[nextStepIndex].name;
            updatedSteps[nextStepIndex] = {
              ...updatedSteps[nextStepIndex],
              status: 'uploading',
              started_at: Date.now() / 1000,
              message: `${updatedSteps[nextStepIndex].name} 시작됨`
            };
          }

          // 전체 진행률 계산
          const completedSteps = updatedSteps.filter(step => step.status === 'completed').length;
          const currentStepProgress = updatedSteps[currentStepIndex]?.progress || 0;
          newOverallProgress = (completedSteps * 25) + (currentStepProgress * 0.25);

          // 모든 단계 완료 확인
          if (completedSteps === task.steps.length) {
            newStatus = 'completed';
            newOverallProgress = 100;
          }

          return {
            ...task,
            steps: updatedSteps,
            current_step: newCurrentStep,
            overall_progress: newOverallProgress,
            status: newStatus,
            completed_at: newStatus === 'completed' ? Date.now() / 1000 : undefined
          };
        });
      });
    }, 2000); // 2초마다 업데이트

    return () => clearInterval(interval);
  }, [isRunning, demoTasks.length]);

  // AI 예측 업데이트
  useEffect(() => {
    if (demoTasks.length === 0) return;

    const updatePredictions = async () => {
      const newPredictions = new Map<string, PredictionResult>();
      
      for (const task of demoTasks) {
        if (task.status !== 'completed' && task.status !== 'failed') {
          try {
            const prediction = await aiPredictionService.predictCompletion(task);
            newPredictions.set(task.task_id, prediction);
          } catch (error) {
            console.error('Prediction failed for task:', task.task_id, error);
          }
        }
      }
      
      setPredictions(newPredictions);
    };

    updatePredictions();
    
    if (isRunning) {
      const interval = setInterval(updatePredictions, 5000); // 5초마다 예측 업데이트
      return () => clearInterval(interval);
    }
  }, [demoTasks, isRunning]);

  const completedTasks = demoTasks.filter(task => task.status === 'completed').length;
  const activeTasks = demoTasks.filter(task => task.status !== 'completed' && task.status !== 'failed').length;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
      {/* 헤더 */}
      <Card className="border-2 border-purple-200 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                AI 강화 업로드 진행 상황 추적 데모
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                실시간 AI 예측, 스마트 분석, 그리고 최적화 제안을 체험해보세요
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={startDemo}
                disabled={isRunning}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Play className="h-4 w-4 mr-2" />
                데모 시작
              </Button>
              
              <Button
                onClick={stopDemo}
                disabled={!isRunning}
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-2" />
                일시정지
              </Button>
              
              <Button
                onClick={resetDemo}
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                리셋
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {demoTasks.length > 0 && (
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{activeTasks}</div>
                <div className="text-sm text-blue-700">활성 작업</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
                <div className="text-sm text-green-700">완료된 작업</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{predictions.size}</div>
                <div className="text-sm text-purple-700">AI 예측 활성</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* AI 패널들 */}
      {demoTasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AIPredictionPanel 
            tasks={demoTasks}
            className="border-2 border-purple-200 bg-white/80 backdrop-blur-sm"
          />
          
          <SmartAnalyticsPanel 
            tasks={demoTasks}
            className="border-2 border-blue-200 bg-white/80 backdrop-blur-sm"
          />
        </div>
      )}

      {/* 작업 목록 */}
      {demoTasks.length > 0 && (
        <Card className="border-2 border-gray-200 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              실시간 작업 진행 상황
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {demoTasks.map((task) => {
                const prediction = predictions.get(task.task_id);
                
                return (
                  <div key={task.task_id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">{task.filename}</div>
                        <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                          {task.current_step}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {prediction && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            예상 {Math.ceil(prediction.estimatedCompletionTime / 60)}분
                          </div>
                        )}
                        <div className="text-sm font-medium">
                          {Math.round(task.overall_progress)}%
                        </div>
                      </div>
                    </div>
                    
                    <Progress value={task.overall_progress} className="h-2 mb-2" />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{task.steps.find(s => s.name === task.current_step)?.message}</span>
                      {prediction && (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          신뢰도 {Math.round(prediction.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 기능 설명 */}
      {demoTasks.length === 0 && (
        <Card className="border-2 border-gray-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
                <Brain className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                <h3 className="text-xl font-bold mb-2">AI 강화 기능</h3>
                <p className="text-muted-foreground">
                  머신러닝 기반 예측, 실시간 분석, 그리고 지능형 최적화 제안
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-medium mb-1">실시간 예측</h4>
                  <p className="text-sm text-muted-foreground">
                    AI가 완료 시간을 실시간으로 예측합니다
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-medium mb-1">스마트 분석</h4>
                  <p className="text-sm text-muted-foreground">
                    성능 트렌드와 병목 지점을 분석합니다
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <Zap className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <h4 className="font-medium mb-1">최적화 제안</h4>
                  <p className="text-sm text-muted-foreground">
                    처리 속도 향상을 위한 제안을 제공합니다
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={startDemo}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Play className="h-5 w-5 mr-2" />
                AI 강화 데모 시작하기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIEnhancedDemo;