import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface AudioLevelMeterProps {
  level: number; // 0-1 normalized
  threshold?: number; // VAD threshold for visualization
  ambientLevel?: number; // Ambient noise level
  orientation?: 'horizontal' | 'vertical';
  segments?: number;
  showThreshold?: boolean;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AudioLevelMeter({
  level,
  threshold = 0.015,
  ambientLevel,
  orientation = 'horizontal',
  segments = 20,
  showThreshold = false,
  showLabels = false,
  size = 'md',
  className
}: AudioLevelMeterProps) {
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          segmentWidth: 3,
          segmentHeight: 8,
          gap: 1
        };
      case 'lg':
        return {
          segmentWidth: 6,
          segmentHeight: 20,
          gap: 2
        };
      default:
        return {
          segmentWidth: 4,
          segmentHeight: 12,
          gap: 1
        };
    }
  }, [size]);

  const activeSegments = Math.floor(level * segments);
  const thresholdSegment = Math.floor(threshold * segments);
  const ambientSegment = ambientLevel ? Math.floor(ambientLevel * segments) : 0;

  const getSegmentColor = (index: number, isActive: boolean) => {
    if (!isActive) return 'bg-muted/30';
    
    const percentage = index / segments;
    if (percentage > 0.8) return 'bg-destructive';
    if (percentage > 0.6) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const segmentElements = useMemo(() => {
    return Array.from({ length: segments }, (_, i) => {
      const isActive = i < activeSegments;
      const isThreshold = showThreshold && i === thresholdSegment;
      const isAmbient = ambientLevel && i === ambientSegment;

      return (
        <div
          key={i}
          className={cn(
            'rounded-sm transition-colors duration-75',
            getSegmentColor(i, isActive),
            isThreshold && 'ring-1 ring-primary',
            isAmbient && 'ring-1 ring-muted-foreground/50'
          )}
          style={{
            width: orientation === 'horizontal' ? sizeConfig.segmentWidth : sizeConfig.segmentHeight,
            height: orientation === 'horizontal' ? sizeConfig.segmentHeight : sizeConfig.segmentWidth,
          }}
        />
      );
    });
  }, [
    segments,
    activeSegments,
    showThreshold,
    thresholdSegment,
    ambientLevel,
    ambientSegment,
    orientation,
    sizeConfig
  ]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabels && (
        <span className="text-[10px] text-muted-foreground w-6">
          {Math.round(level * 100)}%
        </span>
      )}
      <div 
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col-reverse'
        )}
        style={{ gap: sizeConfig.gap }}
      >
        {segmentElements}
      </div>
      {showLabels && showThreshold && (
        <span className="text-[10px] text-muted-foreground">
          T:{Math.round(threshold * 100)}%
        </span>
      )}
    </div>
  );
}

// Compact circular level indicator
interface CircularLevelIndicatorProps {
  level: number;
  isSpeaking: boolean;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularLevelIndicator({
  level,
  isSpeaking,
  size = 32,
  strokeWidth = 3,
  className
}: CircularLevelIndicatorProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (level * circumference);

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Level arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-100',
            isSpeaking ? 'text-emerald-500' : 'text-muted-foreground/50'
          )}
        />
      </svg>
      
      {/* Center dot */}
      <div 
        className={cn(
          'absolute inset-0 flex items-center justify-center'
        )}
      >
        <div 
          className={cn(
            'rounded-full transition-all duration-100',
            isSpeaking ? 'bg-emerald-500' : 'bg-muted-foreground/30'
          )}
          style={{
            width: size / 4,
            height: size / 4,
            transform: `scale(${0.8 + level * 0.4})`
          }}
        />
      </div>
    </div>
  );
}

// Waveform visualization
interface WaveformVisualizerProps {
  levels: number[]; // Array of recent levels
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function WaveformVisualizer({
  levels,
  width = 100,
  height = 32,
  className
}: WaveformVisualizerProps) {
  const points = useMemo(() => {
    if (levels.length === 0) return '';
    
    const stepX = width / (levels.length - 1 || 1);
    const centerY = height / 2;
    
    return levels.map((level, i) => {
      const x = i * stepX;
      const amplitude = level * (height / 2);
      return `${x},${centerY - amplitude} ${x},${centerY + amplitude}`;
    }).join(' ');
  }, [levels, width, height]);

  const pathD = useMemo(() => {
    if (levels.length === 0) return '';
    
    const stepX = width / (levels.length - 1 || 1);
    const centerY = height / 2;
    
    let path = `M 0,${centerY}`;
    levels.forEach((level, i) => {
      const x = i * stepX;
      const amplitude = level * (height / 2);
      path += ` L ${x},${centerY - amplitude}`;
    });
    
    // Mirror back
    for (let i = levels.length - 1; i >= 0; i--) {
      const x = i * stepX;
      const amplitude = levels[i] * (height / 2);
      path += ` L ${x},${centerY + amplitude}`;
    }
    
    path += ' Z';
    return path;
  }, [levels, width, height]);

  return (
    <svg 
      width={width} 
      height={height} 
      className={cn('overflow-visible', className)}
    >
      <defs>
        <linearGradient id="waveformGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
          <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        d={pathD}
        fill="url(#waveformGradient)"
        className="transition-all duration-50"
      />
    </svg>
  );
}
