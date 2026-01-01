/**
 * Per-Participant Network Quality Badge
 * Shows real-time quality indicator on each video tile
 */

import { cn } from '@/lib/utils';
import { QualityLevel, ParticipantQualityStats } from '@/hooks/useParticipantQuality';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ParticipantQualityBadgeProps {
  stats: ParticipantQualityStats | null;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export function ParticipantQualityBadge({
  stats,
  size = 'sm',
  showDetails = true,
  className
}: ParticipantQualityBadgeProps) {
  if (!stats) {
    return (
      <div className={cn(
        'flex items-center gap-1 text-muted-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base',
        className
      )}>
        <WifiOff className={cn(
          size === 'sm' && 'h-3 w-3',
          size === 'md' && 'h-4 w-4',
          size === 'lg' && 'h-5 w-5'
        )} />
      </div>
    );
  }

  const getQualityIcon = (quality: QualityLevel) => {
    const iconSize = cn(
      size === 'sm' && 'h-3 w-3',
      size === 'md' && 'h-4 w-4',
      size === 'lg' && 'h-5 w-5'
    );

    switch (quality) {
      case 'excellent':
        return <SignalHigh className={cn(iconSize, 'text-green-500')} />;
      case 'good':
        return <SignalMedium className={cn(iconSize, 'text-emerald-400')} />;
      case 'fair':
        return <SignalLow className={cn(iconSize, 'text-yellow-500')} />;
      case 'poor':
        return <Signal className={cn(iconSize, 'text-red-500')} />;
      default:
        return <Wifi className={cn(iconSize, 'text-gray-400')} />;
    }
  };

  const getQualityLabel = (quality: QualityLevel): string => {
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };

  const getQualityBgColor = (quality: QualityLevel): string => {
    switch (quality) {
      case 'excellent': return 'bg-green-500/20 border-green-500/30';
      case 'good': return 'bg-emerald-400/20 border-emerald-400/30';
      case 'fair': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'poor': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const badge = (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full border backdrop-blur-sm',
        getQualityBgColor(stats.quality),
        size === 'sm' && 'px-1.5 py-0.5',
        size === 'md' && 'px-2 py-1',
        size === 'lg' && 'px-3 py-1.5',
        className
      )}
    >
      {getQualityIcon(stats.quality)}
      {size !== 'sm' && (
        <span className={cn(
          'font-medium',
          size === 'md' && 'text-xs',
          size === 'lg' && 'text-sm',
          stats.quality === 'excellent' && 'text-green-500',
          stats.quality === 'good' && 'text-emerald-400',
          stats.quality === 'fair' && 'text-yellow-500',
          stats.quality === 'poor' && 'text-red-500'
        )}>
          {getQualityLabel(stats.quality)}
        </span>
      )}
    </div>
  );

  if (!showDetails) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5 text-xs">
            <div className="font-medium text-sm">
              Connection: {getQualityLabel(stats.quality)}
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className={cn(
                  stats.latency > 200 && 'text-yellow-500',
                  stats.latency > 400 && 'text-red-500'
                )}>
                  {stats.latency}ms
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Packet Loss:</span>
                <span className={cn(
                  stats.packetLoss > 2 && 'text-yellow-500',
                  stats.packetLoss > 5 && 'text-red-500'
                )}>
                  {stats.packetLoss.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Jitter:</span>
                <span className={cn(
                  stats.jitter > 30 && 'text-yellow-500',
                  stats.jitter > 60 && 'text-red-500'
                )}>
                  {stats.jitter}ms
                </span>
              </div>
              
              <div className="flex justify-between">
                <span>Bitrate:</span>
                <span>{stats.bitrate} kbps</span>
              </div>
              
              {stats.framesPerSecond > 0 && (
                <div className="flex justify-between col-span-2">
                  <span>FPS:</span>
                  <span className={cn(
                    stats.framesPerSecond < 15 && 'text-yellow-500',
                    stats.framesPerSecond < 10 && 'text-red-500'
                  )}>
                    {stats.framesPerSecond}
                  </span>
                </div>
              )}
            </div>

            {stats.quality === 'poor' && (
              <div className="pt-1 border-t text-yellow-500">
                ⚠️ Poor connection may cause video/audio issues
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
