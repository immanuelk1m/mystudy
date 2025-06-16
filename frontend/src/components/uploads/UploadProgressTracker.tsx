import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  RefreshCw
} from 'lucide-react';
import { useUploadProgress, ProcessingProgress, ProgressStep } from '@/contexts/UploadProgressContext';
import { cn } from '@/lib/utils';

// 단계별 아이콘 매핑
const getStepIcon = (stepName: string) => {
  switch (stepName) {
    case '파일 업로드':
      return Upload;
    case '텍스트 추출':
      return FileText;
    case 'AI 콘텐츠 생성':
      return Brain;
    case '데이터베이스 저장':
      return Database;
    default:
      return Clock;
  }
};

// 상태별 색상 매핑
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-50';
    case 'failed':
      return 'text-red-600 bg-red-50';
    case 'pending':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-blue-600 bg-blue-50';
  }
};

// 상태별 배지 색상
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
};

interface ProgressStepItemProps {
  step: ProgressStep;
  isActive: boolean;
}

const ProgressStepItem: React.FC<ProgressStepItemProps> = ({ step, isActive }) => {
  const Icon = getStepIcon(step.name);
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg transition-colors",
      isActive ? "bg-blue-50 border border-blue-200" : "bg-gray-50",
      step.status === 'completed' && "bg-green-50 border border-green-200",
      step.status === 'failed' && "bg-red-50 border border-red-200"
    )}>
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full",
        getStatusColor(step.status)
      )}>
        {step.status === 'completed' ? (
          <CheckCircle className="w-4 h-4" />
        ) : step.status === 'failed' ? (
          <XCircle className="w-4 h-4" />
        ) : isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Icon className="w-4 h-4" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{step.name}</p>
          <Badge variant={getStatusBadgeVariant(step.status)} className="text-xs">
            {step.status === 'completed' ? '완료' : 
             step.status === 'failed' ? '실패' : 
             step.status === 'pending' ? '대기' : '진행중'}
          </Badge>
        </div>
        
        <p className="text-xs text-gray-600 mt-1">{step.message}</p>
        
        {step.status !== 'pending' && step.status !== 'completed' && step.status !== 'failed' && (
          <div className="mt-2">
            <Progress value={step.progress} className="h-1" />
            <p className="text-xs text-gray-500 mt-1">{step.progress}%</p>
          </div>
        )}
        
        {step.error && (
          <p className="text-xs text-red-600 mt-1 bg-red-50 p-1 rounded">{step.error}</p>
        )}
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: ProcessingProgress;
  onRemove: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onRemove }) => {
  const currentStepIndex = task.steps.findIndex(step => step.name === task.current_step);
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            {task.filename}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(task.status)}>
              {task.status === 'completed' ? '완료' : 
               task.status === 'failed' ? '실패' : 
               task.status === 'pending' ? '대기' : '처리중'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(task.task_id)}
              className="h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">전체 진행률</span>
            <span className="font-medium">{task.overall_progress}%</span>
          </div>
          <Progress value={task.overall_progress} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {task.steps.map((step, index) => (
            <ProgressStepItem
              key={step.name}
              step={step}
              isActive={index === currentStepIndex}
            />
          ))}
        </div>
        
        {task.error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">오류 발생</p>
            <p className="text-xs text-red-600 mt-1">{task.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface UploadProgressTrackerProps {
  className?: string;
}

const UploadProgressTracker: React.FC<UploadProgressTrackerProps> = ({ className }) => {
  const { 
    activeTasks, 
    removeTask, 
    refreshAllTasks, 
    isAutoRefresh, 
    setAutoRefresh 
  } = useUploadProgress();

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            파일 처리 진행 상황
            <Badge variant="outline" className="ml-2">
              {activeTasks.length}개 진행중
            </Badge>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshAllTasks}
              className="h-8"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              variant={isAutoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!isAutoRefresh)}
              className="h-8 text-xs"
            >
              자동 새로고침 {isAutoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.task_id}
                task={task}
                onRemove={removeTask}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default UploadProgressTracker;