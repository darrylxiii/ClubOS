import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AudioLevelIndicatorProps {
  level: number; // 0-1 normalized
  isSpeaking: boolean;
  variant?: 'ring' | 'bars' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AudioLevelIndicator({
  level,
  isSpeaking,
  variant = 'ring',
  size = 'md',
  className
}: AudioLevelIndicatorProps) {
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm': return 'w-8 h-8';
      case 'lg': return 'w-16 h-16';
      default: return 'w-12 h-12';
    }
  }, [size]);
  
  const barHeight = useMemo(() => {
    switch (size) {
      case 'sm': return 12;
      case 'lg': return 24;
      default: return 16;
    }
  }, [size]);
  
  if (variant === 'ring') {
    return (
      <div className={cn('relative', sizeClasses, className)}>
        {/* Speaking ring animation */}
        {isSpeaking && (
          <>
            {/* Outer glow */}
            <div 
              className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"
              style={{ animationDuration: '1.5s' }}
            />
            {/* Inner ring */}
            <div 
              className="absolute inset-1 rounded-full border-2 border-emerald-400/60"
              style={{
                transform: `scale(${1 + level * 0.3})`,
                transition: 'transform 100ms ease-out'
              }}
            />
          </>
        )}
        
        {/* Level indicator */}
        <div 
          className={cn(
            'absolute inset-0 rounded-full border-2 transition-all duration-100',
            isSpeaking ? 'border-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]' : 'border-transparent'
          )}
          style={{
            boxShadow: isSpeaking ? `0 0 ${8 + level * 16}px rgba(34,197,94,${0.3 + level * 0.4})` : 'none'
          }}
        />
      </div>
    );
  }
  
  if (variant === 'bars') {
    const barCount = 5;
    const bars = Array.from({ length: barCount }, (_, i) => {
      const threshold = (i + 1) / barCount;
      const isActive = level >= threshold * 0.8;
      return (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full transition-all duration-75',
            isActive ? 'bg-emerald-400' : 'bg-muted-foreground/30'
          )}
          style={{
            height: `${(barHeight * (0.4 + (i / barCount) * 0.6))}px`,
            transform: isActive ? `scaleY(${1 + level * 0.5})` : 'scaleY(1)',
            transformOrigin: 'bottom'
          }}
        />
      );
    });
    
    return (
      <div className={cn('flex items-end gap-0.5', className)}>
        {bars}
      </div>
    );
  }
  
  // Pulse variant
  return (
    <div className={cn('relative', sizeClasses, className)}>
      {isSpeaking && (
        <div 
          className="absolute inset-0 rounded-full bg-emerald-400"
          style={{
            opacity: 0.2 + level * 0.6,
            transform: `scale(${1 + level * 0.4})`,
            transition: 'all 100ms ease-out'
          }}
        />
      )}
      <div 
        className={cn(
          'absolute inset-0 rounded-full flex items-center justify-center',
          isSpeaking ? 'text-emerald-400' : 'text-muted-foreground'
        )}
      >
        <div 
          className={cn(
            'w-2 h-2 rounded-full',
            isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/50'
          )}
        />
      </div>
    </div>
  );
}

// Speaking indicator badge for use in participant tiles
interface SpeakingBadgeProps {
  isSpeaking: boolean;
  level?: number;
  className?: string;
}

export function SpeakingBadge({ isSpeaking, level = 0, className }: SpeakingBadgeProps) {
  if (!isSpeaking) return null;
  
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-full',
      'bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm',
      className
    )}>
      <div className="relative flex items-center justify-center w-3 h-3">
        <div className="absolute w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75" />
        <div 
          className="w-2 h-2 rounded-full bg-emerald-400"
          style={{
            transform: `scale(${0.8 + level * 0.4})`,
            transition: 'transform 100ms ease-out'
          }}
        />
      </div>
      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
        Speaking
      </span>
    </div>
  );
}
