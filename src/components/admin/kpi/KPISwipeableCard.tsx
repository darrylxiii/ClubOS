import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Pin, Eye, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIMetric } from '@/hooks/useQuantumKPIs';

interface KPISwipeableCardProps {
  kpi: KPIMetric;
  isPinned?: boolean;
  onPin?: () => void;
  onViewDetails?: () => void;
  onConfigureAlert?: () => void;
}

export function KPISwipeableCard({
  kpi,
  isPinned = false,
  onPin,
  onViewDetails,
  onConfigureAlert
}: KPISwipeableCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  
  // Transform x position to opacity for action buttons
  const leftOpacity = useTransform(x, [0, 80], [0, 1]);
  const rightOpacity = useTransform(x, [-80, 0], [1, 0]);
  const leftScale = useTransform(x, [0, 80], [0.8, 1]);
  const rightScale = useTransform(x, [-80, 0], [1, 0.8]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 80;
    
    if (info.offset.x > threshold) {
      // Swiped right - Pin action
      onPin?.();
      setIsRevealed(false);
    } else if (info.offset.x < -threshold) {
      // Swiped left - View details
      onViewDetails?.();
      setIsRevealed(false);
    }
  };

  const getTrendIcon = () => {
    if (!kpi.trend_percent) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    if (kpi.trend_percent > 0) return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  };

  const getStatusFromTrend = () => {
    if (!kpi.trend_direction) return 'neutral';
    if (kpi.trend_direction === 'up') return 'success';
    if (kpi.trend_direction === 'down') return 'warning';
    return 'neutral';
  };

  const getStatusColor = () => {
    const status = getStatusFromTrend();
    if (status === 'success') return 'bg-green-500/20 border-green-500/30';
    if (status === 'warning') return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-muted border-border';
  };

  const formatValue = (value: number | undefined) => {
    if (value === undefined) return '-';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const isCritical = kpi.trend_direction === 'down' && (kpi.trend_percent ?? 0) < -20;

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-xl">
      {/* Left action (Pin) */}
      <motion.div 
        className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-accent/20"
        style={{ opacity: leftOpacity, scale: leftScale }}
      >
        <div className="flex flex-col items-center text-accent">
          <Pin className={cn("h-6 w-6", isPinned && "fill-current")} />
          <span className="text-xs mt-1">{isPinned ? 'Unpin' : 'Pin'}</span>
        </div>
      </motion.div>

      {/* Right action (View) */}
      <motion.div 
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-blue-500/20"
        style={{ opacity: rightOpacity, scale: rightScale }}
      >
        <div className="flex flex-col items-center text-blue-500">
          <Eye className="h-6 w-6" />
          <span className="text-xs mt-1">Details</span>
        </div>
      </motion.div>

      {/* Main card */}
      <motion.div
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileTap={{ cursor: 'grabbing' }}
        className={cn(
          "relative p-4 rounded-xl border touch-pan-y",
          "bg-card cursor-grab active:cursor-grabbing",
          getStatusColor()
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm line-clamp-1">{kpi.kpi_name}</h3>
              {isPinned && (
                <Pin className="h-3.5 w-3.5 text-accent fill-accent flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {kpi.category?.replace(/_/g, ' ')}
            </p>
          </div>
          
          {isCritical && (
            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse flex-shrink-0" />
          )}
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold tabular-nums">
              {formatValue(kpi.value)}
            </p>
            {kpi.previous_value && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Previous: {formatValue(kpi.previous_value)}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            {getTrendIcon()}
            {kpi.trend_percent !== undefined && (
              <span className={cn(
                "text-xs font-medium",
                kpi.trend_percent > 0 ? "text-green-500" : kpi.trend_percent < 0 ? "text-red-500" : "text-muted-foreground"
              )}>
                {kpi.trend_percent > 0 ? '+' : ''}{kpi.trend_percent}%
              </span>
            )}
          </div>
        </div>

        {/* Swipe hint */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
          <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
        </div>
      </motion.div>
    </div>
  );
}
