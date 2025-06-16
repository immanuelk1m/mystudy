import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Brain, Database, Loader2 } from 'lucide-react';

interface UploadProgressSkeletonProps {
  fileName?: string;
  currentStep?: string;
  progress?: number;
  animated?: boolean;
}

const UploadProgressSkeleton: React.FC<UploadProgressSkeletonProps> = ({
  fileName = "파일 처리 중...",
  currentStep = "파일 업로드",
  progress = 25,
  animated = true
}) => {
  const steps = [
    { name: '파일 업로드', icon: Upload, status: 'completed' },
    { name: '텍스트 추출', icon: FileText, status: 'active' },
    { name: 'AI 콘텐츠 생성', icon: Brain, status: 'pending' },
    { name: '데이터베이스 저장', icon: Database, status: 'pending' },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Badge variant="outline" className="animate-pulse">
            처리중
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">전체 진행률</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            
            return (
              <div 
                key={step.name}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 border border-blue-200' : 
                  isCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isCompleted ? 'text-green-600 bg-green-100' :
                  isActive ? 'text-blue-600 bg-blue-100' : 'text-gray-600 bg-gray-100'
                }`}>
                  {isActive && animated ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{step.name}</p>
                    <Badge 
                      variant={isCompleted ? "default" : isActive ? "outline" : "secondary"} 
                      className="text-xs"
                    >
                      {isCompleted ? '완료' : isActive ? '진행중' : '대기'}
                    </Badge>
                  </div>
                  
                  <div className="mt-1">
                    {isActive ? (
                      <Skeleton className="h-3 w-32" />
                    ) : isCompleted ? (
                      <p className="text-xs text-green-600">{step.name} 완료</p>
                    ) : (
                      <p className="text-xs text-gray-600">{step.name} 대기 중</p>
                    )}
                  </div>
                  
                  {isActive && (
                    <div className="mt-2">
                      <Progress value={75} className="h-1" />
                      <p className="text-xs text-gray-500 mt-1">75%</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadProgressSkeleton;