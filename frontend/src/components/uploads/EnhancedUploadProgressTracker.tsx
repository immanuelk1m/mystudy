import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FileText, 
  Upload, 
  Brain, 
  Database, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  MoreHorizontal,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  BarChart3,
  Settings
} from 'lucide-react';
import { useUploadProgress, ProcessingProgress, ProgressStep } from '@/contexts/UploadProgressContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import AIPredictionPanel from './AIPredictionPanel';
import SmartAnalyticsPanel from './SmartAnalyticsPanel';

// 단계별 아이콘과 색상 매핑
const getStepConfig = (stepName: string) => {
  const configs = {
    '파일 업로드': { 
      icon: Upload, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: '서버로 파일을 전송하고 있습니다'
    },
    '텍스트 추출': { 
      icon: FileText, 
      color: 'text-purple-600', 
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'PDF에서 텍스트를 추출하고 있습니다'
    },
    'AI 콘텐츠 생성': { 
      icon: Brain, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'AI가 학습 콘텐츠를 생성하고 있습니다'
    },
    '데이터베이스 저장': { 
      icon: Database, 
      color: 'text-green-600', 
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: '생성된 콘텐츠를 저장하고 있습니다'
    },
  };
  return configs[stepName] || { 
    icon: Clock, 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: '처리 중입니다'
  };
};

// 상태별 배지 스타일
const getStatusBadge = (status: string) => {
  const styles = {
    'completed': { variant: 'default' as const, text: '완료', color: 'bg-green-100 text-green-800' },
    'failed': { variant: 'destructive' as const, text: '실패', color: 'bg-red-100 text-red-800' },
    'pending': { variant: 'secondary' as const, text: '대기', color: 'bg-gray-100 text-gray-800' },
    'uploading': { variant: 'outline' as const, text: '업로드중', color: 'bg-blue-100 text-blue-800' },
    'extracting_text': { variant: 'outline' as const, text: '추출중', color: 'bg-purple-100 text-purple-800' },
    'generating_ai_content': { variant: 'outline' as const, text: 'AI 생성중', color: 'bg-orange-100 text-orange-800' },
    'saving_to_database': { variant: 'outline' as const, text: '저장중', color: 'bg-green-100 text-green-800' },
  };
  return styles[status] || { variant: 'outline' as const, text: '처리중', color: 'bg-blue-100 text-blue-800' };
};

// 시간 포맷팅 함수
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.floor(seconds)}초`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}분 ${remainingSeconds}초`;
};

// 개선된 진행 단계 컴포넌트
interface EnhancedProgressStepProps {
  step: ProgressStep;
  isActive: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const EnhancedProgressStep: React.FC<EnhancedProgressStepProps> = ({ 
  step, 
  isActive, 
  isExpanded, 
  onToggleExpand 
}) => {
  const config = getStepConfig(step.name);
  const Icon = config.icon;
  const statusBadge = getStatusBadge(step.status);
  
  const getElapsedTime = () => {
    if (!step.started_at) return null;
    const endTime = step.completed_at || Date.now() / 1000;
    return endTime - step.started_at;
  };

  const elapsedTime = getElapsedTime();

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className={cn(
        "rounded-lg border-2 transition-all duration-300",
        step.status === 'completed' && "bg-green-50 border-green-200",
        step.status === 'failed' && "bg-red-50 border-red-200",
        isActive && "bg-blue-50 border-blue-200 shadow-md",
        !isActive && step.status === 'pending' && "bg-gray-50 border-gray-200"
      )}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-opacity-80 transition-colors">
            {/* 단계 아이콘 */}
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
              step.status === 'completed' && "bg-green-100 text-green-600",
              step.status === 'failed' && "bg-red-100 text-red-600",
              isActive && "bg-blue-100 text-blue-600 animate-pulse",
              step.status === 'pending' && "bg-gray-100 text-gray-600"
            )}>
              {step.status === 'completed' ? (
                <CheckCircle className="w-5 h-5" />
              ) : step.status === 'failed' ? (
                <XCircle className="w-5 h-5" />
              ) : isActive ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            
            {/* 단계 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">{step.name}</h4>
                <div className="flex items-center gap-2">
                  {elapsedTime && (
                    <span className="text-xs text-gray-500">
                      {formatDuration(elapsedTime)}
                    </span>
                  )}
                  <Badge className={statusBadge.color}>
                    {statusBadge.text}
                  </Badge>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isExpanded && "transform rotate-180"
                  )} />
                </div>
              </div>
              
              <p className="text-xs text-gray-600 mt-1">{step.message}</p>
              
              {/* 진행률 바 */}
              {step.status !== 'pending' && step.status !== 'completed' && step.status !== 'failed' && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>진행률</span>
                    <span>{step.progress}%</span>
                  </div>
                  <Progress value={step.progress} className="h-2" />
                </div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <Separator className="mb-3" />
            <div className="space-y-2 text-xs text-gray-600">
              <p><strong>설명:</strong> {config.description}</p>
              {step.started_at && (
                <p><strong>시작 시간:</strong> {new Date(step.started_at * 1000).toLocaleTimeString()}</p>
              )}
              {step.completed_at && (
                <p><strong>완료 시간:</strong> {new Date(step.completed_at * 1000).toLocaleTimeString()}</p>
              )}
              {step.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 font-medium">오류 상세:</p>
                  <p className="text-red-700">{step.error}</p>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

// 개선된 작업 카드 컴포넌트
interface EnhancedTaskCardProps {
  task: ProcessingProgress;
  onRemove: (taskId: string) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

const EnhancedTaskCard: React.FC<EnhancedTaskCardProps> = ({ 
  task, 
  onRemove, 
  isMinimized, 
  onToggleMinimize 
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const currentStepIndex = task.steps.findIndex(step => step.name === task.current_step);
  const statusBadge = getStatusBadge(task.status);
  
  const toggleStepExpansion = (stepName: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepName)) {
      newExpanded.delete(stepName);
    } else {
      newExpanded.add(stepName);
    }
    setExpandedSteps(newExpanded);
  };

  const getTaskDuration = () => {
    const endTime = task.completed_at || Date.now() / 1000;
    return endTime - task.started_at;
  };

  const completedSteps = task.steps.filter(step => step.status === 'completed').length;
  const totalSteps = task.steps.length;

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base font-semibold truncate">
                {task.filename}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                {completedSteps}/{totalSteps} 단계 완료 • {formatDuration(getTaskDuration())}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className={statusBadge.color}>
              {statusBadge.text}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMinimize}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(task.task_id)}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* 전체 진행률 */}
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">전체 진행률</span>
            <span className="font-bold text-lg">{task.overall_progress}%</span>
          </div>
          <div className="relative">
            <Progress value={task.overall_progress} className="h-3" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-white drop-shadow-sm">
                {task.overall_progress}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {task.steps.map((step, index) => (
              <EnhancedProgressStep
                key={step.name}
                step={step}
                isActive={index === currentStepIndex}
                isExpanded={expandedSteps.has(step.name)}
                onToggleExpand={() => toggleStepExpansion(step.name)}
              />
            ))}
          </div>
          
          {task.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm font-semibold text-red-800">처리 중 오류 발생</p>
              </div>
              <p className="text-sm text-red-700">{task.error}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

// 메인 컴포넌트
interface EnhancedUploadProgressTrackerProps {
  className?: string;
}

const EnhancedUploadProgressTracker: React.FC<EnhancedUploadProgressTrackerProps> = ({ className }) => {
  const { 
    activeTasks, 
    removeTask, 
    refreshAllTasks, 
    isAutoRefresh, 
    setAutoRefresh 
  } = useUploadProgress();
  
  const [minimizedTasks, setMinimizedTasks] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const toggleTaskMinimize = (taskId: string) => {
    const newMinimized = new Set(minimizedTasks);
    if (newMinimized.has(taskId)) {
      newMinimized.delete(taskId);
    } else {
      newMinimized.add(taskId);
    }
    setMinimizedTasks(newMinimized);
  };

  const clearAllCompleted = () => {
    const completedTasks = activeTasks.filter(task => 
      task.status === 'completed' || task.status === 'failed'
    );
    completedTasks.forEach(task => removeTask(task.task_id));
    toast.success(`${completedTasks.length}개의 완료된 작업을 정리했습니다.`);
  };

  if (activeTasks.length === 0) {
    return null;
  }

  const completedCount = activeTasks.filter(task => task.status === 'completed').length;
  const failedCount = activeTasks.filter(task => task.status === 'failed').length;
  const processingCount = activeTasks.length - completedCount - failedCount;

  return (
    <Card className={cn("w-full shadow-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                파일 처리 진행 상황
              </CardTitle>
              <div className="flex items-center gap-4 mt-1">
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {processingCount}개 처리중
                </Badge>
                {completedCount > 0 && (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {completedCount}개 완료
                  </Badge>
                )}
                {failedCount > 0 && (
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    {failedCount}개 실패
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={cn("h-9", showAIPanel && "bg-purple-100 text-purple-700")}
              title="AI 예측 패널"
            >
              <Brain className="w-4 h-4 mr-2" />
              AI 예측
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={cn("h-9", showAnalytics && "bg-blue-100 text-blue-700")}
              title="스마트 분석"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              분석
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshAllTasks}
              className="h-9"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              새로고침
            </Button>
            
            <Button
              variant={isAutoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!isAutoRefresh)}
              className="h-9"
            >
              {isAutoRefresh ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              자동 새로고침
            </Button>

            {(completedCount > 0 || failedCount > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllCompleted}
                className="h-9"
              >
                완료된 작업 정리
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-9 w-9 p-0"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent>
          <div className="space-y-4">
            {/* AI 예측 패널 */}
            {showAIPanel && (
              <AIPredictionPanel 
                tasks={activeTasks}
                className="border-l-4 border-l-purple-500"
              />
            )}
            
            {/* 스마트 분석 패널 */}
            {showAnalytics && (
              <SmartAnalyticsPanel 
                tasks={activeTasks}
                className="border-l-4 border-l-blue-500"
              />
            )}
            
            {/* 작업 목록 */}
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {activeTasks.map((task) => (
                  <EnhancedTaskCard
                    key={task.task_id}
                    task={task}
                    onRemove={removeTask}
                    isMinimized={minimizedTasks.has(task.task_id)}
                    onToggleMinimize={() => toggleTaskMinimize(task.task_id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default EnhancedUploadProgressTracker;