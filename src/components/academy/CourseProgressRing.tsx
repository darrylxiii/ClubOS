import { memo } from 'react';
import { motion } from 'framer-motion';

interface CourseProgressRingProps {
  progress: number;
  completedModules: number;
  totalModules: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-20 h-20',
  md: 'w-32 h-32',
  lg: 'w-40 h-40',
};

export const CourseProgressRing = memo<CourseProgressRingProps>(({
  progress,
  completedModules,
  totalModules,
  size = 'md',
}) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      <svg className="transform -rotate-90" width="100%" height="100%" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          fill="none"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          stroke="hsl(var(--primary))"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(progress)}%</span>
        <span className="text-xs text-muted-foreground">
          {completedModules}/{totalModules}
        </span>
      </div>
    </div>
  );
});

CourseProgressRing.displayName = 'CourseProgressRing';
