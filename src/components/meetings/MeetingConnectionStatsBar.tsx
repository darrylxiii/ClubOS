import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh, AlertTriangle, Server } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConnectionStats {
  packetLoss: number;
  latency: number;
  jitter: number;
  bitrate: number;
  videoBitrate: number;
  connectionState: string;
  codec?: string;
  turnUsed?: boolean;
}

interface MeetingConnectionStatsBarProps {
  stats: ConnectionStats | null;
  peerCount: number;
  className?: string;
}

type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

function getQualityLevel(stats: ConnectionStats): QualityLevel {
  if (stats.connectionState === 'failed' || stats.connectionState === 'disconnected') {
    return 'critical';
  }
  
  if (stats.packetLoss > 10 || stats.latency > 500) return 'critical';
  if (stats.packetLoss > 5 || stats.latency > 300) return 'poor';
  if (stats.packetLoss > 2 || stats.latency > 150) return 'fair';
  if (stats.packetLoss > 0.5 || stats.latency > 75) return 'good';
  return 'excellent';
}

function getQualityColor(level: QualityLevel): string {
  switch (level) {
    case 'excellent': return 'text-green-500';
    case 'good': return 'text-green-400';
    case 'fair': return 'text-yellow-500';
    case 'poor': return 'text-orange-500';
    case 'critical': return 'text-red-500';
  }
}

function getQualityBgColor(level: QualityLevel): string {
  switch (level) {
    case 'excellent': return 'bg-green-500/10 border-green-500/20';
    case 'good': return 'bg-green-400/10 border-green-400/20';
    case 'fair': return 'bg-yellow-500/10 border-yellow-500/20';
    case 'poor': return 'bg-orange-500/10 border-orange-500/20';
    case 'critical': return 'bg-red-500/10 border-red-500/20';
  }
}

function QualityIcon({ level }: { level: QualityLevel }) {
  const colorClass = getQualityColor(level);
  
  switch (level) {
    case 'excellent':
      return <SignalHigh className={`h-4 w-4 ${colorClass}`} />;
    case 'good':
      return <Signal className={`h-4 w-4 ${colorClass}`} />;
    case 'fair':
      return <SignalMedium className={`h-4 w-4 ${colorClass}`} />;
    case 'poor':
      return <SignalLow className={`h-4 w-4 ${colorClass}`} />;
    case 'critical':
      return <WifiOff className={`h-4 w-4 ${colorClass}`} />;
  }
}

export function MeetingConnectionStatsBar({ 
  stats, 
  peerCount,
  className = '' 
}: MeetingConnectionStatsBarProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!stats) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="gap-1 bg-muted/50">
          <Wifi className="h-3 w-3 animate-pulse" />
          <span className="text-xs">Connecting...</span>
        </Badge>
      </div>
    );
  }
  
  const quality = getQualityLevel(stats);
  const qualityColor = getQualityColor(quality);
  const qualityBg = getQualityBgColor(quality);
  
  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Main quality badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`gap-1.5 cursor-pointer transition-all hover:scale-105 ${qualityBg}`}
              onClick={() => setShowDetails(!showDetails)}
            >
              <QualityIcon level={quality} />
              <span className={`text-xs font-medium ${qualityColor}`}>
                {quality.charAt(0).toUpperCase() + quality.slice(1)}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <div className="font-medium">Connection Quality: {quality}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <span>Packet Loss:</span>
                <span className={stats.packetLoss > 2 ? 'text-orange-400' : ''}>{stats.packetLoss.toFixed(1)}%</span>
                <span>Latency:</span>
                <span className={stats.latency > 150 ? 'text-orange-400' : ''}>{Math.round(stats.latency)}ms</span>
                <span>Jitter:</span>
                <span>{stats.jitter.toFixed(1)}ms</span>
                <span>Bitrate:</span>
                <span>{Math.round(stats.bitrate)} kbps</span>
                {stats.codec && (
                  <>
                    <span>Codec:</span>
                    <span>{stats.codec.replace('video/', '')}</span>
                  </>
                )}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* TURN relay indicator */}
        {stats.turnUsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 bg-blue-500/10 border-blue-500/20">
                <Server className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-blue-400">Relay</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              Connected via TURN relay server (direct P2P not possible)
            </TooltipContent>
          </Tooltip>
        )}

        {/* Peer count */}
        {peerCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <span className="text-xs">{peerCount} peer{peerCount !== 1 ? 's' : ''}</span>
          </Badge>
        )}

        {/* Warning for degraded connection */}
        {(quality === 'poor' || quality === 'critical') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 bg-orange-500/10 border-orange-500/20 animate-pulse">
                <AlertTriangle className="h-3 w-3 text-orange-400" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div className="font-medium text-orange-400">Connection Issues Detected</div>
                <div className="text-muted-foreground mt-1">
                  {stats.packetLoss > 5 && <div>• High packet loss ({stats.packetLoss.toFixed(1)}%)</div>}
                  {stats.latency > 300 && <div>• High latency ({Math.round(stats.latency)}ms)</div>}
                  <div className="mt-1">Try moving closer to your router or using a wired connection.</div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
