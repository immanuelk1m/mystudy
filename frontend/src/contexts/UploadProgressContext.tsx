import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getProcessingProgress, getAllProcessingTasks } from '@/services/api';

// 진행 상황 타입 정의
export interface ProgressStep {
  name: string;
  status: 'pending' | 'uploading' | 'extracting_text' | 'generating_ai_content' | 'saving_to_database' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  started_at?: number;
  completed_at?: number;
  error?: string;
}

export interface ProcessingProgress {
  task_id: string;
  notebook_id: number;
  filename: string;
  status: 'pending' | 'uploading' | 'extracting_text' | 'generating_ai_content' | 'saving_to_database' | 'completed' | 'failed';
  overall_progress: number; // 0-100
  current_step: string;
  steps: ProgressStep[];
  started_at: number;
  completed_at?: number;
  result?: any;
  error?: string;
}

interface UploadProgressContextType {
  // 진행 중인 작업들
  activeTasks: ProcessingProgress[];
  
  // 작업 관리
  addTask: (taskId: string, filename: string) => void;
  removeTask: (taskId: string) => void;
  updateTaskProgress: (taskId: string) => Promise<void>;
  
  // 전체 작업 새로고침
  refreshAllTasks: () => Promise<void>;
  
  // 자동 새로고침 설정
  isAutoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

const UploadProgressContext = createContext<UploadProgressContextType | undefined>(undefined);

export const UploadProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTasks, setActiveTasks] = useState<ProcessingProgress[]>([]);
  const [isAutoRefresh, setAutoRefresh] = useState(true);

  // 특정 작업의 진행 상황 업데이트
  const updateTaskProgress = useCallback(async (taskId: string) => {
    try {
      const progress = await getProcessingProgress(taskId);
      if (progress) {
        setActiveTasks(prev => {
          const existing = prev.find(task => task.task_id === taskId);
          if (existing) {
            return prev.map(task => task.task_id === taskId ? progress : task);
          } else {
            return [...prev, progress];
          }
        });
      }
    } catch (error) {
      console.error('Failed to update task progress:', error);
    }
  }, []);

  // 모든 작업 새로고침
  const refreshAllTasks = useCallback(async () => {
    try {
      const tasks = await getAllProcessingTasks();
      // 완료되지 않은 작업들만 유지
      const incompleteTasks = tasks.filter(task => 
        task.status !== 'completed' && task.status !== 'failed'
      );
      setActiveTasks(incompleteTasks);
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  }, []);

  // 새 작업 추가
  const addTask = useCallback((taskId: string, filename: string) => {
    const newTask: ProcessingProgress = {
      task_id: taskId,
      notebook_id: 0, // 임시값, 실제로는 API에서 받아올 예정
      filename,
      status: 'pending',
      overall_progress: 0,
      current_step: '파일 업로드',
      steps: [
        { name: '파일 업로드', status: 'pending', progress: 0, message: '파일 업로드 대기 중' },
        { name: '텍스트 추출', status: 'pending', progress: 0, message: 'PDF 텍스트 추출 대기 중' },
        { name: 'AI 콘텐츠 생성', status: 'pending', progress: 0, message: 'AI 콘텐츠 생성 대기 중' },
        { name: '데이터베이스 저장', status: 'pending', progress: 0, message: '데이터베이스 저장 대기 중' },
      ],
      started_at: Date.now() / 1000
    };
    
    setActiveTasks(prev => [...prev, newTask]);
    
    // 즉시 진행 상황 업데이트 시작
    updateTaskProgress(taskId);
  }, [updateTaskProgress]);

  // 작업 제거
  const removeTask = useCallback((taskId: string) => {
    setActiveTasks(prev => prev.filter(task => task.task_id !== taskId));
  }, []);

  // 자동 새로고침 효과
  useEffect(() => {
    if (!isAutoRefresh || activeTasks.length === 0) return;

    const interval = setInterval(() => {
      activeTasks.forEach(task => {
        if (task.status !== 'completed' && task.status !== 'failed') {
          updateTaskProgress(task.task_id);
        }
      });
    }, 2000); // 2초마다 업데이트

    return () => clearInterval(interval);
  }, [activeTasks, isAutoRefresh, updateTaskProgress]);

  // 완료된 작업 자동 제거
  useEffect(() => {
    const completedTasks = activeTasks.filter(task => 
      task.status === 'completed' || task.status === 'failed'
    );
    
    if (completedTasks.length > 0) {
      const timer = setTimeout(() => {
        setActiveTasks(prev => prev.filter(task => 
          task.status !== 'completed' && task.status !== 'failed'
        ));
      }, 5000); // 5초 후 완료된 작업 제거

      return () => clearTimeout(timer);
    }
  }, [activeTasks]);

  const value: UploadProgressContextType = {
    activeTasks,
    addTask,
    removeTask,
    updateTaskProgress,
    refreshAllTasks,
    isAutoRefresh,
    setAutoRefresh,
  };

  return (
    <UploadProgressContext.Provider value={value}>
      {children}
    </UploadProgressContext.Provider>
  );
};

export const useUploadProgress = (): UploadProgressContextType => {
  const context = useContext(UploadProgressContext);
  if (context === undefined) {
    throw new Error('useUploadProgress must be used within a UploadProgressProvider');
  }
  return context;
};