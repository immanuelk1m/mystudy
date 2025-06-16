import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  BarChart3,
  Timer,
  Activity
} from 'lucide-react';
import { useUploadProgress } from '@/contexts/UploadProgressContext';
import { motion } from 'framer-motion';

const ProgressStatistics: React.FC = () => {
  const { activeTasks } = useUploadProgress();

  const statistics = useMemo(() => {
    const total = activeTasks.length;
    const completed = activeTasks.filter(task => task.status === 'completed').length;
    const failed = activeTasks.filter(task => task.status === 'failed').length;
    const processing = total - completed - failed;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const failureRate = total > 0 ? Math.round((failed / total) * 100) : 0;
    
    // 평균 처리 시간 계산
    const completedTasks = activeTasks.filter(task => task.status === 'completed' && task.completed_at);
    const avgProcessingTime = completedTasks.length > 0 
      ? completedTasks.reduce((sum, task) => sum + (task.completed_at! - task.started_at), 0) / completedTasks.length
      : 0;
    
    // 현재 처리 중인 작업들의 평균 진행률
    const processingTasks = activeTasks.filter(task => 
      task.status !== 'completed' && task.status !== 'failed'
    );
    const avgProgress = processingTasks.length > 0
      ? processingTasks.reduce((sum, task) => sum + task.overall_progress, 0) / processingTasks.length
      : 0;

    // 단계별 통계
    const stepStats = {
      '파일 업로드': activeTasks.filter(task => task.current_step === '파일 업로드').length,
      '텍스트 추출': activeTasks.filter(task => task.current_step === '텍스트 추출').length,
      'AI 콘텐츠 생성': activeTasks.filter(task => task.current_step === 'AI 콘텐츠 생성').length,
      '데이터베이스 저장': activeTasks.filter(task => task.current_step === '데이터베이스 저장').length,
    };

    return {
      total,
      completed,
      failed,
      processing,
      completionRate,
      failureRate,
      avgProcessingTime,
      avgProgress,
      stepStats,
    };
  }, [activeTasks]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.floor(seconds)}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}분 ${remainingSeconds}초`;
  };

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 전체 작업 수 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0 }}
      >
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              전체 작업
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{statistics.total}</div>
            <p className="text-xs text-blue-700 mt-1">
              처리 중: {statistics.processing}개
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 완료율 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              완료율
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{statistics.completionRate}%</div>
            <div className="mt-2">
              <Progress value={statistics.completionRate} className="h-2" />
            </div>
            <p className="text-xs text-green-700 mt-1">
              {statistics.completed}/{statistics.total} 완료
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 평균 처리 시간 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
              <Timer className="w-4 h-4" />
              평균 처리 시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {statistics.avgProcessingTime > 0 ? formatTime(statistics.avgProcessingTime) : '-'}
            </div>
            <p className="text-xs text-purple-700 mt-1">
              완료된 작업 기준
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 평균 진행률 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              평균 진행률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {Math.round(statistics.avgProgress)}%
            </div>
            <div className="mt-2">
              <Progress value={statistics.avgProgress} className="h-2" />
            </div>
            <p className="text-xs text-orange-700 mt-1">
              처리 중인 작업 기준
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 단계별 분포 (전체 너비) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="md:col-span-2 lg:col-span-4"
      >
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              단계별 작업 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(statistics.stepStats).map(([step, count], index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-600">{step}</div>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <motion.div
                        className="bg-blue-500 h-1 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${statistics.total > 0 ? (count / statistics.total) * 100 : 0}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + index * 0.1 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 실패율 (조건부 표시) */}
      {statistics.failed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="md:col-span-2 lg:col-span-2"
        >
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                실패한 작업
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">{statistics.failed}</div>
              <div className="mt-2">
                <Progress value={statistics.failureRate} className="h-2" />
              </div>
              <p className="text-xs text-red-700 mt-1">
                실패율: {statistics.failureRate}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default ProgressStatistics;