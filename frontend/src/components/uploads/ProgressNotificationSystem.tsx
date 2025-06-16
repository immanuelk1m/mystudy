import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { useUploadProgress } from '@/contexts/UploadProgressContext';

// 알림 타입 정의
type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sound?: string;
}

const notificationConfigs: Record<NotificationType, NotificationConfig> = {
  success: { icon: CheckCircle, color: 'text-green-600' },
  error: { icon: XCircle, color: 'text-red-600' },
  warning: { icon: AlertCircle, color: 'text-yellow-600' },
  info: { icon: Info, color: 'text-blue-600' },
};

// 브라우저 알림 권한 요청
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('이 브라우저는 데스크톱 알림을 지원하지 않습니다.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// 브라우저 알림 표시
const showBrowserNotification = (title: string, body: string, type: NotificationType) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'upload-progress',
      requireInteraction: type === 'error',
    });

    // 5초 후 자동 닫기 (오류가 아닌 경우)
    if (type !== 'error') {
      setTimeout(() => notification.close(), 5000);
    }

    // 클릭 시 창 포커스
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

// 진행 상황 알림 시스템
const ProgressNotificationSystem: React.FC = () => {
  const { activeTasks } = useUploadProgress();
  const [previousTasks, setPreviousTasks] = useState(activeTasks);
  const [notificationPermission, setNotificationPermission] = useState(false);

  // 컴포넌트 마운트 시 알림 권한 요청
  useEffect(() => {
    requestNotificationPermission().then(setNotificationPermission);
  }, []);

  // 작업 상태 변화 감지 및 알림
  useEffect(() => {
    const newCompletedTasks = activeTasks.filter(task => 
      task.status === 'completed' && 
      !previousTasks.find(prev => prev.task_id === task.task_id && prev.status === 'completed')
    );

    const newFailedTasks = activeTasks.filter(task => 
      task.status === 'failed' && 
      !previousTasks.find(prev => prev.task_id === task.task_id && prev.status === 'failed')
    );

    const newStartedTasks = activeTasks.filter(task => 
      task.status !== 'pending' && 
      !previousTasks.find(prev => prev.task_id === task.task_id)
    );

    // 새로 시작된 작업 알림
    newStartedTasks.forEach(task => {
      toast.info(`📄 ${task.filename} 처리를 시작했습니다.`, {
        description: '진행 상황을 실시간으로 확인하세요.',
        duration: 3000,
      });

      if (notificationPermission) {
        showBrowserNotification(
          '파일 처리 시작',
          `${task.filename} 처리를 시작했습니다.`,
          'info'
        );
      }
    });

    // 완료된 작업 알림
    newCompletedTasks.forEach(task => {
      toast.success(`✅ ${task.filename} 처리가 완료되었습니다!`, {
        description: '이제 워크스페이스에서 확인할 수 있습니다.',
        duration: 5000,
        action: {
          label: '확인하기',
          onClick: () => {
            // 워크스페이스로 이동하는 로직 추가 가능
            console.log('워크스페이스로 이동:', task.notebook_id);
          },
        },
      });

      if (notificationPermission) {
        showBrowserNotification(
          '파일 처리 완료',
          `${task.filename} 처리가 완료되었습니다!`,
          'success'
        );
      }
    });

    // 실패한 작업 알림
    newFailedTasks.forEach(task => {
      toast.error(`❌ ${task.filename} 처리 중 오류가 발생했습니다.`, {
        description: task.error || '알 수 없는 오류가 발생했습니다.',
        duration: 10000,
        action: {
          label: '다시 시도',
          onClick: () => {
            // 재시도 로직 추가 가능
            console.log('재시도:', task.task_id);
          },
        },
      });

      if (notificationPermission) {
        showBrowserNotification(
          '파일 처리 실패',
          `${task.filename} 처리 중 오류가 발생했습니다.`,
          'error'
        );
      }
    });

    // 단계 변경 알림 (선택적)
    activeTasks.forEach(task => {
      const prevTask = previousTasks.find(prev => prev.task_id === task.task_id);
      if (prevTask && prevTask.current_step !== task.current_step) {
        const stepMessages = {
          '파일 업로드': '파일 업로드를 완료했습니다.',
          '텍스트 추출': 'PDF에서 텍스트를 추출하고 있습니다.',
          'AI 콘텐츠 생성': 'AI가 학습 콘텐츠를 생성하고 있습니다.',
          '데이터베이스 저장': '생성된 콘텐츠를 저장하고 있습니다.',
        };

        const message = stepMessages[task.current_step] || `${task.current_step} 단계를 진행하고 있습니다.`;
        
        toast.info(`🔄 ${task.filename}`, {
          description: message,
          duration: 2000,
        });
      }
    });

    setPreviousTasks(activeTasks);
  }, [activeTasks, previousTasks, notificationPermission]);

  // 일괄 완료 알림
  useEffect(() => {
    const allCompleted = activeTasks.length > 0 && activeTasks.every(task => 
      task.status === 'completed' || task.status === 'failed'
    );
    
    const allCompletedSuccessfully = activeTasks.length > 0 && activeTasks.every(task => 
      task.status === 'completed'
    );

    if (allCompleted && previousTasks.some(task => 
      task.status !== 'completed' && task.status !== 'failed'
    )) {
      if (allCompletedSuccessfully) {
        toast.success(`🎉 모든 파일 처리가 완료되었습니다!`, {
          description: `총 ${activeTasks.length}개 파일이 성공적으로 처리되었습니다.`,
          duration: 8000,
        });

        if (notificationPermission) {
          showBrowserNotification(
            '모든 파일 처리 완료',
            `총 ${activeTasks.length}개 파일이 성공적으로 처리되었습니다.`,
            'success'
          );
        }
      } else {
        const successCount = activeTasks.filter(task => task.status === 'completed').length;
        const failCount = activeTasks.filter(task => task.status === 'failed').length;
        
        toast.warning(`⚠️ 파일 처리가 완료되었습니다.`, {
          description: `성공: ${successCount}개, 실패: ${failCount}개`,
          duration: 8000,
        });

        if (notificationPermission) {
          showBrowserNotification(
            '파일 처리 완료',
            `성공: ${successCount}개, 실패: ${failCount}개`,
            'warning'
          );
        }
      }
    }
  }, [activeTasks, previousTasks, notificationPermission]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
};

export default ProgressNotificationSystem;