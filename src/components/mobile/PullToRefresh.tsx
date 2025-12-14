import { useState, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const { impact } = useHaptics();
  
  const y = useMotionValue(0);
  const pullProgress = useTransform(y, [0, threshold], [0, 1]);
  const indicatorOpacity = useTransform(y, [0, threshold / 2], [0, 1]);
  const indicatorScale = useTransform(y, [0, threshold], [0.5, 1]);
  const indicatorRotate = useTransform(y, [0, threshold], [0, 180]);

  const handleDragStart = useCallback(() => {
    if (!disabled && !isRefreshing) {
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // Only allow pulling when at the top of the scroll
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop > 0 || info.offset.y < 0) {
      y.set(0);
      return;
    }
  }, [y]);

  const handleDragEnd = useCallback(async (_: any, info: PanInfo) => {
    setIsPulling(false);
    
    if (disabled || isRefreshing) return;
    
    if (info.offset.y >= threshold) {
      impact('medium');
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    y.set(0);
  }, [disabled, isRefreshing, threshold, onRefresh, impact, y]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          opacity: indicatorOpacity,
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <motion.div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-primary/10 backdrop-blur-sm border border-primary/20",
            isRefreshing && "bg-primary/20"
          )}
          style={{
            scale: indicatorScale,
            rotate: isRefreshing ? undefined : indicatorRotate,
          }}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : undefined}
        >
          <Loader2 className={cn(
            "h-5 w-5 text-primary",
            isRefreshing && "animate-spin"
          )} />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        drag={!disabled && !isRefreshing ? "y" : false}
        dragConstraints={{ top: 0, bottom: threshold }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y: isPulling || isRefreshing ? y : 0 }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
