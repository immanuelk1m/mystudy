import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// 페이드 인/아웃 애니메이션
export const FadeInOut: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// 슬라이드 인 애니메이션
export const SlideIn: React.FC<{
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  className?: string;
}> = ({ children, direction = 'up', className }) => {
  const directions = {
    left: { x: -50, y: 0 },
    right: { x: 50, y: 0 },
    up: { x: 0, y: 50 },
    down: { x: 0, y: -50 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...directions[direction] }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 스케일 애니메이션
export const ScaleIn: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// 진행률 바 애니메이션
export const AnimatedProgressBar: React.FC<{
  value: number;
  className?: string;
  showPercentage?: boolean;
}> = ({ value, className, showPercentage = false }) => (
  <div className={cn('relative w-full bg-gray-200 rounded-full h-3', className)}>
    <motion.div
      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full relative overflow-hidden"
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* 진행률 바 내부 애니메이션 효과 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
    
    {showPercentage && (
      <motion.div
        className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {value}%
      </motion.div>
    )}
  </div>
);

// 펄스 애니메이션
export const Pulse: React.FC<{
  children: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}> = ({ children, className, intensity = 'medium' }) => {
  const scales = {
    low: [1, 1.02, 1],
    medium: [1, 1.05, 1],
    high: [1, 1.1, 1],
  };

  return (
    <motion.div
      animate={{ scale: scales[intensity] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 회전 애니메이션
export const Spin: React.FC<{
  children: React.ReactNode;
  className?: string;
  speed?: 'slow' | 'normal' | 'fast';
}> = ({ children, className, speed = 'normal' }) => {
  const durations = {
    slow: 3,
    normal: 2,
    fast: 1,
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: durations[speed], repeat: Infinity, ease: 'linear' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 바운스 애니메이션
export const Bounce: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div
    animate={{ y: [0, -10, 0] }}
    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// 스태거 애니메이션 (여러 요소를 순차적으로 애니메이션)
export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}> = ({ children, className, staggerDelay = 0.1 }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    }}
    transition={{ duration: 0.4 }}
    className={className}
  >
    {children}
  </motion.div>
);

// 성공 체크마크 애니메이션
export const SuccessCheckmark: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 24, className }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={cn('text-green-600', className)}
  >
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5 }}
    />
    <motion.path
      d="M8 12l2 2 4-4"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    />
  </motion.svg>
);

// 오류 X 마크 애니메이션
export const ErrorXMark: React.FC<{
  size?: number;
  className?: string;
}> = ({ size = 24, className }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={cn('text-red-600', className)}
  >
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5 }}
    />
    <motion.path
      d="M8 8l8 8M16 8l-8 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    />
  </motion.svg>
);

// 로딩 도트 애니메이션
export const LoadingDots: React.FC<{
  className?: string;
  dotClassName?: string;
}> = ({ className, dotClassName }) => (
  <div className={cn('flex space-x-1', className)}>
    {[0, 1, 2].map((index) => (
      <motion.div
        key={index}
        className={cn('w-2 h-2 bg-blue-600 rounded-full', dotClassName)}
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: index * 0.2,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

// 파일 업로드 애니메이션
export const FileUploadAnimation: React.FC<{
  isUploading: boolean;
  className?: string;
}> = ({ isUploading, className }) => (
  <AnimatePresence>
    {isUploading && (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn('flex items-center justify-center', className)}
      >
        <motion.div
          className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    )}
  </AnimatePresence>
);