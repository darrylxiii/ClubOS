import { ReactNode, useCallback, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface SwipeAction {
  icon: ReactNode;
  label: string;
  color: string;
  onAction: () => void;
}

interface SwipeableListItemProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export function SwipeableListItem({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
  disabled = false,
}: SwipeableListItemProps) {
  const [isRevealed, setIsRevealed] = useState<'left' | 'right' | null>(null);
  const { impact } = useHaptics();
  
  const x = useMotionValue(0);
  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (disabled) return;

    const { offset, velocity } = info;
    const swipeThreshold = threshold * 0.5;
    const velocityThreshold = 500;

    // Swipe right (reveal left actions)
    if ((offset.x > swipeThreshold || velocity.x > velocityThreshold) && leftActions.length > 0) {
      impact('light');
      setIsRevealed('left');
      x.set(threshold);
      return;
    }

    // Swipe left (reveal right actions)
    if ((offset.x < -swipeThreshold || velocity.x < -velocityThreshold) && rightActions.length > 0) {
      impact('light');
      setIsRevealed('right');
      x.set(-threshold);
      return;
    }

    // Reset position
    setIsRevealed(null);
    x.set(0);
  }, [disabled, threshold, leftActions.length, rightActions.length, impact, x]);

  const handleActionClick = useCallback((action: SwipeAction) => {
    impact('medium');
    action.onAction();
    setIsRevealed(null);
    x.set(0);
  }, [impact, x]);

  const resetPosition = useCallback(() => {
    setIsRevealed(null);
    x.set(0);
  }, [x]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left actions (revealed on swipe right) */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-stretch"
          style={{ opacity: leftOpacity }}
        >
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center px-4 min-w-[80px]",
                "text-white text-xs font-medium gap-1 min-h-[44px]",
                action.color
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Right actions (revealed on swipe left) */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-stretch"
          style={{ opacity: rightOpacity }}
        >
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex flex-col items-center justify-center px-4 min-w-[80px]",
                "text-white text-xs font-medium gap-1 min-h-[44px]",
                action.color
              )}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        drag={!disabled ? "x" : false}
        dragConstraints={{ left: -threshold, right: threshold }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card z-10"
        onClick={isRevealed ? resetPosition : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
}
