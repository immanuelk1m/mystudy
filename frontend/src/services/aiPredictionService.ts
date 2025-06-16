/**
 * AI 기반 예측 및 최적화 서비스
 */

import { ProcessingProgress } from '@/contexts/UploadProgressContext';

// 파일 메타데이터 인터페이스
interface FileMetadata {
  size: number; // 바이트 단위
  pages?: number; // PDF 페이지 수
  complexity?: 'low' | 'medium' | 'high'; // 복잡도
  language?: string; // 언어
  hasImages?: boolean; // 이미지 포함 여부
  hasCharts?: boolean; // 차트/그래프 포함 여부
}

// 처리 성능 데이터
interface ProcessingPerformance {
  stepName: string;
  avgDuration: number; // 평균 소요 시간 (초)
  successRate: number; // 성공률 (0-1)
  errorPatterns: string[]; // 일반적인 오류 패턴
}

// 예측 결과
interface PredictionResult {
  estimatedTotalTime: number; // 예상 총 소요 시간 (초)
  estimatedCompletionTime: number; // 예상 완료 시간 (초 단위)
  confidence: number; // 예측 신뢰도 (0-1)
  bottleneckStep?: string; // 병목 단계
  recommendations: string[]; // 최적화 제안
}

// 시스템 성능 메트릭
interface SystemMetrics {
  cpuUsage: number; // CPU 사용률 (0-1)
  memoryUsage: number; // 메모리 사용률 (0-1)
  networkLatency: number; // 네트워크 지연 시간 (ms)
  concurrentTasks: number; // 동시 처리 작업 수
}

class AIPredictionService {
  private performanceHistory: ProcessingPerformance[] = [];
  private systemMetrics: SystemMetrics = {
    cpuUsage: 0.3,
    memoryUsage: 0.4,
    networkLatency: 50,
    concurrentTasks: 0
  };

  // 기본 단계별 성능 데이터 (실제 환경에서는 서버에서 가져옴)
  private defaultPerformance: ProcessingPerformance[] = [
    {
      stepName: '파일 업로드',
      avgDuration: 15, // 15초
      successRate: 0.98,
      errorPatterns: ['네트워크 오류', '파일 크기 초과', '연결 시간 초과']
    },
    {
      stepName: '텍스트 추출',
      avgDuration: 45, // 45초
      successRate: 0.95,
      errorPatterns: ['PDF 손상', '암호화된 파일', '스캔된 이미지']
    },
    {
      stepName: 'AI 콘텐츠 생성',
      avgDuration: 120, // 2분
      successRate: 0.92,
      errorPatterns: ['API 한도 초과', '복잡한 내용', '언어 인식 실패']
    },
    {
      stepName: '데이터베이스 저장',
      avgDuration: 20, // 20초
      successRate: 0.99,
      errorPatterns: ['데이터베이스 연결 오류', '저장 공간 부족']
    }
  ];

  constructor() {
    this.performanceHistory = [...this.defaultPerformance];
    this.startSystemMonitoring();
  }

  /**
   * 파일 메타데이터 분석
   */
  analyzeFile(file: File): FileMetadata {
    const metadata: FileMetadata = {
      size: file.size,
      complexity: this.estimateComplexity(file),
    };

    // 파일 크기 기반 페이지 수 추정 (대략적)
    metadata.pages = Math.ceil(file.size / (1024 * 100)); // 100KB per page 가정

    // 파일명 기반 언어 추정
    metadata.language = this.detectLanguageFromFilename(file.name);

    return metadata;
  }

  /**
   * 처리 시간 예측
   */
  predictProcessingTime(
    files: File[], 
    currentTasks: ProcessingProgress[]
  ): PredictionResult {
    const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);
    const avgFileSize = totalFileSize / files.length;
    
    // 파일 복잡도 분석
    const complexityFactor = this.calculateComplexityFactor(files);
    
    // 시스템 부하 고려
    const systemLoadFactor = this.calculateSystemLoadFactor(currentTasks.length);
    
    // 단계별 예상 시간 계산
    let totalEstimatedTime = 0;
    let bottleneckStep = '';
    let maxStepTime = 0;
    
    const stepEstimates = this.performanceHistory.map(step => {
      let baseTime = step.avgDuration;
      
      // 파일 크기 영향
      if (step.stepName === '파일 업로드') {
        baseTime *= Math.log10(avgFileSize / 1024 / 1024 + 1) + 1; // MB 기준 로그 스케일
      } else if (step.stepName === '텍스트 추출') {
        baseTime *= complexityFactor;
      } else if (step.stepName === 'AI 콘텐츠 생성') {
        baseTime *= complexityFactor * 1.5; // AI 단계는 복잡도에 더 민감
      }
      
      // 시스템 부하 영향
      baseTime *= systemLoadFactor;
      
      // 파일 개수 영향 (병렬 처리 고려)
      const parallelFactor = Math.min(files.length, 3) * 0.7 + 0.3; // 최대 3개 병렬
      baseTime *= parallelFactor;
      
      if (baseTime > maxStepTime) {
        maxStepTime = baseTime;
        bottleneckStep = step.stepName;
      }
      
      totalEstimatedTime += baseTime;
      
      return {
        stepName: step.stepName,
        estimatedTime: baseTime,
        confidence: this.calculateStepConfidence(step, complexityFactor)
      };
    });

    // 예상 완료 시간 (초 단위로 반환)
    const estimatedCompletionTime = totalEstimatedTime;
    
    // 전체 신뢰도 계산
    const confidence = stepEstimates.reduce((sum, step) => sum + step.confidence, 0) / stepEstimates.length;
    
    // 최적화 제안 생성
    const recommendations = this.generateRecommendations(
      files, 
      stepEstimates, 
      currentTasks.length,
      complexityFactor
    );

    return {
      estimatedTotalTime: totalEstimatedTime,
      estimatedCompletionTime,
      confidence,
      bottleneckStep,
      recommendations
    };
  }

  /**
   * 단일 작업에 대한 완료 시간 예측
   */
  async predictCompletion(task: ProcessingProgress): Promise<PredictionResult> {
    const currentStep = task.steps.find(step => step.name === task.current_step);
    if (!currentStep) {
      return {
        estimatedTotalTime: 300, // 기본값 5분
        estimatedCompletionTime: 300,
        confidence: 0.5,
        recommendations: ['예측 데이터가 부족합니다.']
      };
    }

    // 현재 단계의 남은 시간 계산
    const currentStepProgress = currentStep.progress / 100;
    const currentStepPerf = this.performanceHistory.find(p => p.stepName === task.current_step);
    
    if (!currentStepPerf) {
      return {
        estimatedTotalTime: 180,
        estimatedCompletionTime: 180,
        confidence: 0.6,
        recommendations: ['성능 데이터를 수집 중입니다.']
      };
    }

    const currentStepRemainingTime = currentStepPerf.avgDuration * (1 - currentStepProgress);
    
    // 남은 단계들의 예상 시간
    const currentStepIndex = task.steps.findIndex(step => step.name === task.current_step);
    const remainingSteps = task.steps.slice(currentStepIndex + 1);
    
    const remainingStepsTime = remainingSteps.reduce((sum, step) => {
      const perf = this.performanceHistory.find(p => p.stepName === step.name);
      return sum + (perf?.avgDuration || 60); // 기본값 1분
    }, 0);

    const totalRemainingTime = currentStepRemainingTime + remainingStepsTime;
    
    // 파일 크기 기반 조정
    const fileSize = task.filename.length; // 간단한 추정
    const sizeFactor = Math.log10(fileSize + 1) * 0.2 + 0.8;
    const adjustedTime = totalRemainingTime * sizeFactor;

    return {
      estimatedTotalTime: adjustedTime,
      estimatedCompletionTime: adjustedTime,
      confidence: Math.min(0.95, currentStepPerf.successRate * 0.9 + 0.1),
      bottleneckStep: this.identifyBottleneckForTask(task),
      recommendations: this.generateTaskRecommendations(task)
    };
  }

  /**
   * 실시간 예측 업데이트
   */
  updatePrediction(
    task: ProcessingProgress,
    remainingTasks: ProcessingProgress[]
  ): PredictionResult {
    const currentStep = task.steps.find(step => step.name === task.current_step);
    if (!currentStep) {
      return this.predictProcessingTime([], remainingTasks);
    }

    // 현재 단계의 실제 성능 데이터 업데이트
    this.updatePerformanceData(task);

    // 남은 시간 계산
    const currentStepProgress = currentStep.progress / 100;
    const currentStepPerf = this.performanceHistory.find(p => p.stepName === task.current_step);
    
    if (!currentStepPerf) {
      return this.predictProcessingTime([], remainingTasks);
    }

    const currentStepRemainingTime = currentStepPerf.avgDuration * (1 - currentStepProgress);
    
    // 남은 단계들의 예상 시간
    const currentStepIndex = task.steps.findIndex(step => step.name === task.current_step);
    const remainingSteps = task.steps.slice(currentStepIndex + 1);
    
    const remainingStepsTime = remainingSteps.reduce((sum, step) => {
      const perf = this.performanceHistory.find(p => p.stepName === step.name);
      return sum + (perf?.avgDuration || 0);
    }, 0);

    const totalRemainingTime = currentStepRemainingTime + remainingStepsTime;

    return {
      estimatedTotalTime: totalRemainingTime,
      estimatedCompletionTime: totalRemainingTime,
      confidence: 0.85, // 실시간 데이터 기반이므로 높은 신뢰도
      bottleneckStep: this.identifyCurrentBottleneck(remainingTasks),
      recommendations: this.generateRealTimeRecommendations(task, remainingTasks)
    };
  }

  /**
   * 처리 최적화 제안
   */
  generateOptimizationSuggestions(
    tasks: ProcessingProgress[]
  ): string[] {
    const suggestions: string[] = [];
    
    // 동시 작업 수 분석
    if (tasks.length > 5) {
      suggestions.push('💡 동시 처리 작업이 많습니다. 일부 작업을 나중에 처리하는 것을 고려해보세요.');
    }
    
    // 파일 크기 분석
    const hasLargeFiles = tasks.some(task => task.filename.includes('large') || task.filename.length > 50);
    if (hasLargeFiles) {
      suggestions.push('📄 큰 파일이 감지되었습니다. 파일을 분할하면 처리 속도가 향상될 수 있습니다.');
    }
    
    // 시스템 성능 분석
    if (this.systemMetrics.cpuUsage > 0.8) {
      suggestions.push('⚡ CPU 사용률이 높습니다. 다른 애플리케이션을 종료하면 처리 속도가 향상됩니다.');
    }
    
    if (this.systemMetrics.memoryUsage > 0.8) {
      suggestions.push('💾 메모리 사용률이 높습니다. 브라우저 탭을 정리하는 것을 권장합니다.');
    }
    
    if (this.systemMetrics.networkLatency > 200) {
      suggestions.push('🌐 네트워크 지연이 감지되었습니다. 안정적인 인터넷 연결을 확인해주세요.');
    }
    
    // 실패 패턴 분석
    const failedTasks = tasks.filter(task => task.status === 'failed');
    if (failedTasks.length > 0) {
      const commonErrors = this.analyzeFailurePatterns(failedTasks);
      suggestions.push(...commonErrors.map(error => `🔧 ${error}`));
    }
    
    return suggestions;
  }

  /**
   * 학습 데이터 업데이트
   */
  updateLearningData(completedTask: ProcessingProgress): void {
    const actualDuration = completedTask.completed_at! - completedTask.started_at;
    
    // 각 단계별 실제 성능 데이터 업데이트
    completedTask.steps.forEach(step => {
      if (step.completed_at && step.started_at) {
        const stepDuration = step.completed_at - step.started_at;
        this.updateStepPerformance(step.name, stepDuration, step.status === 'completed');
      }
    });
    
    // 전체 성능 통계 업데이트
    this.updateOverallPerformance(completedTask);
  }

  // Private 메서드들
  private estimateComplexity(file: File): 'low' | 'medium' | 'high' {
    const sizeInMB = file.size / (1024 * 1024);
    
    if (sizeInMB < 1) return 'low';
    if (sizeInMB < 10) return 'medium';
    return 'high';
  }

  private detectLanguageFromFilename(filename: string): string {
    // 간단한 언어 감지 로직 (실제로는 더 정교한 분석 필요)
    if (/[가-힣]/.test(filename)) return 'ko';
    if (/[一-龯]/.test(filename)) return 'zh';
    if (/[ひらがなカタカナ]/.test(filename)) return 'ja';
    return 'en';
  }

  private calculateComplexityFactor(files: File[]): number {
    const avgSize = files.reduce((sum, file) => sum + file.size, 0) / files.length;
    const sizeInMB = avgSize / (1024 * 1024);
    
    // 로그 스케일로 복잡도 계산
    return Math.log10(sizeInMB + 1) * 0.5 + 1;
  }

  private calculateSystemLoadFactor(currentTaskCount: number): number {
    // 동시 작업 수에 따른 부하 계산
    const baseFactor = 1 + (currentTaskCount * 0.1);
    const cpuFactor = 1 + (this.systemMetrics.cpuUsage * 0.5);
    const memoryFactor = 1 + (this.systemMetrics.memoryUsage * 0.3);
    
    return baseFactor * cpuFactor * memoryFactor;
  }

  private calculateStepConfidence(
    step: ProcessingPerformance, 
    complexityFactor: number
  ): number {
    let confidence = step.successRate;
    
    // 복잡도가 높을수록 신뢰도 감소
    confidence *= (2 - complexityFactor) / 2;
    
    // 시스템 부하가 높을수록 신뢰도 감소
    confidence *= (2 - this.systemMetrics.cpuUsage) / 2;
    
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private generateRecommendations(
    files: File[],
    stepEstimates: any[],
    currentTaskCount: number,
    complexityFactor: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (files.length > 3) {
      recommendations.push('📚 여러 파일을 업로드하고 있습니다. 배치 처리로 효율성을 높였습니다.');
    }
    
    if (complexityFactor > 2) {
      recommendations.push('🔍 복잡한 문서가 감지되었습니다. 처리 시간이 평소보다 길어질 수 있습니다.');
    }
    
    if (currentTaskCount > 2) {
      recommendations.push('⏳ 다른 작업이 진행 중입니다. 순서대로 처리됩니다.');
    }
    
    const bottleneckStep = stepEstimates.reduce((max, step) => 
      step.estimatedTime > max.estimatedTime ? step : max
    );
    
    if (bottleneckStep.stepName === 'AI 콘텐츠 생성') {
      recommendations.push('🤖 AI 콘텐츠 생성이 가장 오래 걸릴 예정입니다. 잠시 다른 작업을 하시는 것을 권장합니다.');
    }
    
    return recommendations;
  }

  private generateRealTimeRecommendations(
    currentTask: ProcessingProgress,
    remainingTasks: ProcessingProgress[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (currentTask.overall_progress < 25 && remainingTasks.length > 0) {
      recommendations.push('📈 처리가 시작되었습니다. 다른 작업도 대기 중입니다.');
    }
    
    if (currentTask.overall_progress > 75) {
      recommendations.push('🎯 거의 완료되었습니다! 곧 결과를 확인할 수 있습니다.');
    }
    
    return recommendations;
  }

  private identifyCurrentBottleneck(tasks: ProcessingProgress[]): string {
    const stepCounts = tasks.reduce((acc, task) => {
      acc[task.current_step] = (acc[task.current_step] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bottleneck = Object.entries(stepCounts).reduce((max, [step, count]) => 
      count > max.count ? { step, count } : max, 
      { step: '', count: 0 }
    );
    
    return bottleneck.step;
  }

  private updatePerformanceData(task: ProcessingProgress): void {
    // 실제 성능 데이터로 학습 모델 업데이트
    // 실제 구현에서는 서버로 데이터 전송
  }

  private updateStepPerformance(stepName: string, duration: number, success: boolean): void {
    const stepPerf = this.performanceHistory.find(p => p.stepName === stepName);
    if (stepPerf) {
      // 지수 이동 평균으로 업데이트
      stepPerf.avgDuration = stepPerf.avgDuration * 0.8 + duration * 0.2;
      stepPerf.successRate = stepPerf.successRate * 0.9 + (success ? 1 : 0) * 0.1;
    }
  }

  private updateOverallPerformance(task: ProcessingProgress): void {
    // 전체 성능 메트릭 업데이트
    console.log('Performance updated for task:', task.task_id);
  }

  private analyzeFailurePatterns(failedTasks: ProcessingProgress[]): string[] {
    const patterns: string[] = [];
    
    const errorMessages = failedTasks
      .map(task => task.error)
      .filter(Boolean) as string[];
    
    if (errorMessages.some(msg => msg.includes('네트워크'))) {
      patterns.push('네트워크 연결을 확인하고 다시 시도해보세요.');
    }
    
    if (errorMessages.some(msg => msg.includes('크기'))) {
      patterns.push('파일 크기를 줄이거나 분할해서 업로드해보세요.');
    }
    
    return patterns;
  }

  private identifyBottleneckForTask(task: ProcessingProgress): string {
    const currentStepIndex = task.steps.findIndex(step => step.name === task.current_step);
    const remainingSteps = task.steps.slice(currentStepIndex);
    
    let maxTime = 0;
    let bottleneck = '';
    
    remainingSteps.forEach(step => {
      const perf = this.performanceHistory.find(p => p.stepName === step.name);
      if (perf && perf.avgDuration > maxTime) {
        maxTime = perf.avgDuration;
        bottleneck = step.name;
      }
    });
    
    return bottleneck || task.current_step;
  }

  private generateTaskRecommendations(task: ProcessingProgress): string[] {
    const recommendations: string[] = [];
    
    if (task.overall_progress < 25) {
      recommendations.push('처리가 시작되었습니다. 잠시만 기다려주세요.');
    } else if (task.overall_progress > 75) {
      recommendations.push('거의 완료되었습니다!');
    }
    
    if (task.current_step === 'AI 콘텐츠 생성') {
      recommendations.push('AI 분석 중입니다. 복잡한 문서일수록 시간이 더 걸릴 수 있습니다.');
    }
    
    return recommendations;
  }

  private startSystemMonitoring(): void {
    // 실제 환경에서는 실제 시스템 메트릭을 수집
    setInterval(() => {
      this.systemMetrics.cpuUsage = Math.random() * 0.3 + 0.2;
      this.systemMetrics.memoryUsage = Math.random() * 0.4 + 0.3;
      this.systemMetrics.networkLatency = Math.random() * 100 + 50;
    }, 5000);
  }
}

// 싱글톤 인스턴스
export const aiPredictionService = new AIPredictionService();
export type { PredictionResult, FileMetadata, SystemMetrics };