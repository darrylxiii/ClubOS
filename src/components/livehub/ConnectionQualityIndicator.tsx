import React from 'react';
import { ConnectionQuality, ConnectionStats } from '@/hooks/useConnectionQuality';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionQualityIndicatorProps {
  quality: ConnectionQuality;
  stats?: ConnectionStats;
  showDetails?: boolean;
  onReconnect?: () => void;
  isReconnecting?: boolean;
  audioBitrate?: number; // Current adaptive audio bitrate in bps
  className?: string;
}

// Color mappings for each quality level
const QUALITY_COLORS: Record<ConnectionQuality, { bg: string; bars: string; text: string }> = {
  excellent: {
    bg: 'bg-emerald-500/10',
    bars: 'bg-emerald-500',
    text: 'text-emerald-500'
  },
  good: {
    bg: 'bg-green-500/10',
    bars: 'bg-green-500',
    text: 'text-green-500'
  },
  fair: {
    bg: 'bg-yellow-500/10',
    bars: 'bg-yellow-500',
    text: 'text-yellow-500'
  },
  poor: {
    bg: 'bg-red-500/10',
    bars: 'bg-red-500',
    text: 'text-red-500'
  },
  disconnected: {
    bg: 'bg-muted',
    bars: 'bg-muted-foreground',
    text: 'text-muted-foreground'
  }
};

// Number of bars to show for each quality level
const QUALITY_BARS: Record<ConnectionQuality, number> = {
  excellent: 4,
  good: 3,
  fair: 2,
  poor: 1,
  disconnected: 0
};

export function ConnectionQualityIndicator({
  quality,
  stats,
  showDetails = false,
  onReconnect,
  isReconnecting,
  audioBitrate,
  className
}: ConnectionQualityIndicatorProps) {
  const colors = QUALITY_COLORS[quality];
  const activeBars = QUALITY_BARS[quality];

  const renderBars = () => (
    <div className="flex items-end gap-0.5 h-4">
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={cn(
            'w-1 rounded-sm transition-all duration-300',
            bar <= activeBars ? colors.bars : 'bg-muted-foreground/30',
            // Bar heights: 4px, 7px, 10px, 13px
            bar === 1 && 'h-1',
            bar === 2 && 'h-[7px]',
            bar === 3 && 'h-[10px]',
            bar === 4 && 'h-[13px]'
          )}
        />
      ))}
    </div>
  );

  const renderIcon = () => {
    if (isReconnecting) {
      return <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />;
    }
    
    if (quality === 'disconnected') {
      return <WifiOff className="w-4 h-4 text-muted-foreground" />;
    }
    
    if (quality === 'poor') {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
    
    return <Wifi className={cn('w-4 h-4', colors.text)} />;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1) return '<1ms';
    return `${Math.round(ms)}ms`;
  };

  const formatPacketLoss = (loss: number) => {
    if (loss < 0.1) return '0%';
    return `${loss.toFixed(1)}%`;
  };

  const getQualityLabel = () => {
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      case 'disconnected': return 'Disconnected';
    }
  };

  const content = (
    <div className={cn(
      'flex items-center gap-2 px-2 py-1 rounded-md',
      colors.bg,
      className
    )}>
      {renderIcon()}
      {renderBars()}
      {showDetails && stats && (
        <span className={cn('text-xs font-medium', colors.text)}>
          {formatLatency(stats.latency)}
        </span>
      )}
    </div>
  );

  // If no stats, just return the indicator
  if (!stats) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-64">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Connection Quality</span>
              <span className={cn('text-sm font-medium', colors.text)}>
                {getQualityLabel()}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latency</span>
                <span className={cn(
                  stats.latency > 200 ? 'text-red-500' : 
                  stats.latency > 100 ? 'text-yellow-500' : 'text-foreground'
                )}>
                  {formatLatency(stats.latency)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Packet Loss</span>
                <span className={cn(
                  stats.packetLoss > 5 ? 'text-red-500' : 
                  stats.packetLoss > 2 ? 'text-yellow-500' : 'text-foreground'
                )}>
                  {formatPacketLoss(stats.packetLoss)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jitter</span>
                <span className={cn(
                  stats.jitter > 50 ? 'text-red-500' : 
                  stats.jitter > 30 ? 'text-yellow-500' : 'text-foreground'
                )}>
                  {formatLatency(stats.jitter)}
                </span>
              </div>
              
              {stats.bitrate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Bitrate</span>
                  <span>{Math.round(stats.bitrate)} kbps</span>
                </div>
              )}
              
              {audioBitrate && audioBitrate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Audio Quality</span>
                  <span className={cn(
                    audioBitrate >= 64000 ? 'text-emerald-500' :
                    audioBitrate >= 48000 ? 'text-green-500' :
                    audioBitrate >= 32000 ? 'text-yellow-500' : 'text-red-500'
                  )}>
                    {Math.round(audioBitrate / 1000)} kbps
                  </span>
                </div>
              )}
            </div>

            {(quality === 'poor' || quality === 'fair') && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  {quality === 'poor' 
                    ? 'Your connection is unstable. Audio quality reduced to maintain stability.'
                    : 'Connection quality is reduced. Audio bitrate adjusted automatically.'
                  }
                </p>
                {onReconnect && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={onReconnect}
                    disabled={isReconnecting}
                    className="w-full"
                  >
                    {isReconnecting ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                        Reconnecting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Reconnect
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for participant tiles
export function ConnectionQualityBars({ 
  quality, 
  className 
}: { 
  quality: ConnectionQuality; 
  className?: string;
}) {
  const colors = QUALITY_COLORS[quality];
  const activeBars = QUALITY_BARS[quality];

  return (
    <div className={cn('flex items-end gap-px h-3', className)}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className={cn(
            'w-0.5 rounded-sm transition-all duration-300',
            bar <= activeBars ? colors.bars : 'bg-white/30',
            bar === 1 && 'h-1',
            bar === 2 && 'h-1.5',
            bar === 3 && 'h-2',
            bar === 4 && 'h-2.5'
          )}
        />
      ))}
    </div>
  );
}
