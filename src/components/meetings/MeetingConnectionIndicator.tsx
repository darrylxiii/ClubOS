import { useState } from 'react';
import { ConnectionQuality, ConnectionStats } from '@/hooks/useConnectionQuality';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MeetingConnectionIndicatorProps {
  quality: ConnectionQuality;
  stats: ConnectionStats;
  worstPeerQuality?: ConnectionQuality;
  isReconnecting?: boolean;
  retryCount?: number;
  nextRetryIn?: number | null;
  onReconnect?: () => void;
  className?: string;
}

const qualityColors: Record<ConnectionQuality, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-green-500',
  fair: 'bg-yellow-500',
  poor: 'bg-red-500',
  disconnected: 'bg-muted'
};

const qualityLabels: Record<ConnectionQuality, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  disconnected: 'Disconnected'
};

export function MeetingConnectionIndicator({
  quality,
  stats,
  worstPeerQuality,
  isReconnecting,
  retryCount,
  nextRetryIn,
  onReconnect,
  className
}: MeetingConnectionIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determine which quality to display (worst peer if available)
  const displayQuality = worstPeerQuality || quality;
  const bars = displayQuality === 'excellent' ? 4 : displayQuality === 'good' ? 3 : displayQuality === 'fair' ? 2 : 1;

  if (isReconnecting) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30", className)}>
        <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
        <span className="text-xs text-yellow-500 font-medium">
          Reconnecting{nextRetryIn ? ` in ${Math.ceil(nextRetryIn / 1000)}s` : '...'}
          {retryCount ? ` (${retryCount}/5)` : ''}
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip open={isHovered}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200",
              displayQuality === 'poor' || displayQuality === 'disconnected' 
                ? "bg-red-500/10 border border-red-500/30 hover:bg-red-500/20" 
                : "bg-card/60 backdrop-blur-sm border border-border/50 hover:bg-card/80",
              className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {displayQuality === 'disconnected' ? (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <div className="flex items-end gap-0.5 h-4">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={cn(
                      "w-1 rounded-full transition-all duration-200",
                      bar <= bars ? qualityColors[displayQuality] : "bg-muted/50"
                    )}
                    style={{ height: `${bar * 25}%` }}
                  />
                ))}
              </div>
            )}
            <span className={cn(
              "text-xs font-medium",
              displayQuality === 'poor' || displayQuality === 'disconnected' 
                ? "text-red-500" 
                : "text-foreground"
            )}>
              {qualityLabels[displayQuality]}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="w-64 p-0 bg-card/95 backdrop-blur-xl border-border/50"
        >
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection Quality</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                displayQuality === 'excellent' && "bg-emerald-500/20 text-emerald-500",
                displayQuality === 'good' && "bg-green-500/20 text-green-500",
                displayQuality === 'fair' && "bg-yellow-500/20 text-yellow-500",
                displayQuality === 'poor' && "bg-red-500/20 text-red-500",
                displayQuality === 'disconnected' && "bg-muted text-muted-foreground"
              )}>
                {qualityLabels[displayQuality]}
              </span>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Latency</span>
                <span className={cn(
                  stats.latency > 200 ? "text-red-500" : stats.latency > 100 ? "text-yellow-500" : "text-foreground"
                )}>
                  {stats.latency.toFixed(0)} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Packet Loss</span>
                <span className={cn(
                  stats.packetLoss > 5 ? "text-red-500" : stats.packetLoss > 2 ? "text-yellow-500" : "text-foreground"
                )}>
                  {stats.packetLoss.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jitter</span>
                <span className={cn(
                  stats.jitter > 30 ? "text-red-500" : stats.jitter > 15 ? "text-yellow-500" : "text-foreground"
                )}>
                  {stats.jitter.toFixed(0)} ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bitrate</span>
                <span>{stats.bitrate.toFixed(0)} kbps</span>
              </div>
            </div>

            {(displayQuality === 'poor' || displayQuality === 'disconnected') && onReconnect && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8"
                onClick={onReconnect}
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Reconnect
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
