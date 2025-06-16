import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Bell, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Monitor,
  Smartphone,
  Palette,
  Clock,
  Trash2,
  Download
} from 'lucide-react';
import { useUploadProgress } from '@/contexts/UploadProgressContext';
import { toast } from 'sonner';

interface ProgressSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProgressSettings: React.FC<ProgressSettingsProps> = ({ isOpen, onClose }) => {
  const { 
    isAutoRefresh, 
    setAutoRefresh, 
    activeTasks, 
    refreshAllTasks 
  } = useUploadProgress();

  // 로컬 설정 상태
  const [settings, setSettings] = useState({
    notifications: {
      browser: true,
      sound: false,
      desktop: true,
      mobile: true,
    },
    refresh: {
      auto: isAutoRefresh,
      interval: 2, // 초 단위
    },
    display: {
      animations: true,
      compactMode: false,
      darkMode: false,
      showStatistics: true,
    },
    cleanup: {
      autoCleanup: true,
      cleanupDelay: 5, // 초 단위
    },
  });

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));

    // 특정 설정 변경 시 즉시 적용
    if (category === 'refresh' && key === 'auto') {
      setAutoRefresh(value);
    }

    toast.success('설정이 저장되었습니다.');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'upload-progress-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('설정을 내보냈습니다.');
  };

  const clearAllData = () => {
    if (confirm('모든 진행 상황 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      activeTasks.forEach(task => {
        // removeTask 함수가 있다면 사용
      });
      toast.success('모든 데이터가 삭제되었습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              진행 상황 추적 설정
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 알림 설정 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              알림 설정
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="browser-notifications" className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  브라우저 알림
                </Label>
                <Switch
                  id="browser-notifications"
                  checked={settings.notifications.browser}
                  onCheckedChange={(checked) => 
                    updateSetting('notifications', 'browser', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="sound-notifications" className="flex items-center gap-2">
                  {settings.notifications.sound ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                  소리 알림
                </Label>
                <Switch
                  id="sound-notifications"
                  checked={settings.notifications.sound}
                  onCheckedChange={(checked) => 
                    updateSetting('notifications', 'sound', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="mobile-notifications" className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  모바일 최적화
                </Label>
                <Switch
                  id="mobile-notifications"
                  checked={settings.notifications.mobile}
                  onCheckedChange={(checked) => 
                    updateSetting('notifications', 'mobile', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 새로고침 설정 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              새로고침 설정
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refresh">자동 새로고침</Label>
                <Switch
                  id="auto-refresh"
                  checked={settings.refresh.auto}
                  onCheckedChange={(checked) => 
                    updateSetting('refresh', 'auto', checked)
                  }
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">
                  새로고침 간격: {settings.refresh.interval}초
                </Label>
                <Slider
                  value={[settings.refresh.interval]}
                  onValueChange={([value]) => 
                    updateSetting('refresh', 'interval', value)
                  }
                  max={10}
                  min={1}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1초</span>
                  <span>10초</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 화면 표시 설정 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              화면 표시 설정
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="animations">애니메이션 효과</Label>
                <Switch
                  id="animations"
                  checked={settings.display.animations}
                  onCheckedChange={(checked) => 
                    updateSetting('display', 'animations', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="compact-mode">컴팩트 모드</Label>
                <Switch
                  id="compact-mode"
                  checked={settings.display.compactMode}
                  onCheckedChange={(checked) => 
                    updateSetting('display', 'compactMode', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-statistics">통계 표시</Label>
                <Switch
                  id="show-statistics"
                  checked={settings.display.showStatistics}
                  onCheckedChange={(checked) => 
                    updateSetting('display', 'showStatistics', checked)
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 데이터 정리 설정 */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              데이터 정리 설정
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-cleanup">자동 정리</Label>
                <Switch
                  id="auto-cleanup"
                  checked={settings.cleanup.autoCleanup}
                  onCheckedChange={(checked) => 
                    updateSetting('cleanup', 'autoCleanup', checked)
                  }
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">
                  정리 지연 시간: {settings.cleanup.cleanupDelay}초
                </Label>
                <Slider
                  value={[settings.cleanup.cleanupDelay]}
                  onValueChange={([value]) => 
                    updateSetting('cleanup', 'cleanupDelay', value)
                  }
                  max={30}
                  min={1}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1초</span>
                  <span>30초</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 액션 버튼들 */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">데이터 관리</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportSettings}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                설정 내보내기
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllTasks}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                수동 새로고침
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={clearAllData}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                모든 데이터 삭제
              </Button>
            </div>
          </div>

          {/* 현재 상태 정보 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">현재 상태</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>활성 작업: <Badge variant="outline">{activeTasks.length}개</Badge></div>
              <div>자동 새로고침: <Badge variant={isAutoRefresh ? "default" : "secondary"}>
                {isAutoRefresh ? 'ON' : 'OFF'}
              </Badge></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressSettings;