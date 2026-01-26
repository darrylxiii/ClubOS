/**
 * Real-time connection health display
 * Shows ICE state, bitrate, packet loss for each peer
 */
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStats {
  iceState: RTCIceConnectionState;
  bitrate: number;
  packetLoss: number;
  roundTripTime: number;
  jitter: number;
}

interface ConnectionHealthMonitorProps {
  peerConnections: Map<string, RTCPeerConnection>;
  className?: string;
  compact?: boolean;
}

export function ConnectionHealthMonitor({ 
  peerConnections, 
  className,
  compact = false
}: ConnectionHealthMonitorProps) {
  const [stats, setStats] = useState<Map<string, ConnectionStats>>(new Map());

  useEffect(() => {
    if (peerConnections.size === 0) return;

    const collectStats = async () => {
      const newStats = new Map<string, ConnectionStats>();
      
      for (const [peerId, pc] of peerConnections.entries()) {
        try {
          const report = await pc.getStats();
          let bitrate = 0;
          let packetLoss = 0;
          let roundTripTime = 0;
          let jitter = 0;
          let bytesReceived = 0;
          let packetsLost = 0;
          let packetsReceived = 0;
          
          report.forEach(stat => {
            if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
              bytesReceived = stat.bytesReceived || 0;
              packetsLost = stat.packetsLost || 0;
              packetsReceived = stat.packetsReceived || 0;
              jitter = stat.jitter ? stat.jitter * 1000 : 0; // Convert to ms
            }
            if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
              bitrate = (stat.availableOutgoingBitrate || 0) / 1000; // kbps
              roundTripTime = stat.currentRoundTripTime ? stat.currentRoundTripTime * 1000 : 0; // ms
            }
          });
          
          // Calculate packet loss percentage
          if (packetsReceived + packetsLost > 0) {
            packetLoss = (packetsLost / (packetsReceived + packetsLost)) * 100;
          }
          
          newStats.set(peerId, {
            iceState: pc.iceConnectionState,
            bitrate,
            packetLoss,
            roundTripTime,
            jitter
          });
        } catch (error) {
          console.warn('[ConnectionHealth] Failed to get stats for peer:', peerId, error);
        }
      }
      
      setStats(newStats);
    };

    // Initial collection
    collectStats();
    
    // Collect stats every 2 seconds
    const interval = setInterval(collectStats, 2000);

    return () => clearInterval(interval);
  }, [peerConnections]);

  const getStateIcon = (iceState: RTCIceConnectionState) => {
    switch (iceState) {
      case 'connected':
      case 'completed':
        return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
      case 'checking':
      case 'new':
        return <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />;
      case 'disconnected':
        return <AlertTriangle className="h-3 w-3 text-amber-400" />;
      case 'failed':
      case 'closed':
        return <WifiOff className="h-3 w-3 text-rose-400" />;
      default:
        return <Wifi className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStateBadgeVariant = (iceState: RTCIceConnectionState): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (iceState) {
      case 'connected':
      case 'completed':
        return 'default';
      case 'checking':
      case 'new':
        return 'secondary';
      case 'disconnected':
        return 'outline';
      case 'failed':
      case 'closed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getQualityColor = (stat: ConnectionStats): string => {
    // Good: low packet loss, low RTT, high bitrate
    if (stat.packetLoss < 1 && stat.roundTripTime < 100 && stat.bitrate > 500) {
      return 'text-emerald-400';
    }
    // Medium: some issues
    if (stat.packetLoss < 5 && stat.roundTripTime < 200) {
      return 'text-amber-400';
    }
    // Poor: significant issues
    return 'text-rose-400';
  };

  if (peerConnections.size === 0 || stats.size === 0) {
    return null;
  }

  // Aggregate stats for compact view
  const aggregatedStats = Array.from(stats.values());
  const worstState = aggregatedStats.reduce((worst, stat) => {
    const stateOrder: RTCIceConnectionState[] = ['failed', 'closed', 'disconnected', 'checking', 'new', 'connected', 'completed'];
    return stateOrder.indexOf(stat.iceState) < stateOrder.indexOf(worst) ? stat.iceState : worst;
  }, 'completed' as RTCIceConnectionState);
  
  const avgPacketLoss = aggregatedStats.reduce((sum, s) => sum + s.packetLoss, 0) / aggregatedStats.length;
  const avgRTT = aggregatedStats.reduce((sum, s) => sum + s.roundTripTime, 0) / aggregatedStats.length;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full",
              "bg-black/40 backdrop-blur-sm border border-white/10",
              className
            )}>
              {getStateIcon(worstState)}
              <span className="text-xs text-white/70">{stats.size}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">{stats.size} peer connection(s)</p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>Avg. Packet Loss: {avgPacketLoss.toFixed(1)}%</p>
                <p>Avg. RTT: {avgRTT.toFixed(0)}ms</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn(
      "flex flex-wrap gap-2",
      className
    )}>
      {Array.from(stats.entries()).map(([peerId, stat]) => (
        <TooltipProvider key={peerId}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={getStateBadgeVariant(stat.iceState)}
                className={cn(
                  "flex items-center gap-1.5 cursor-default",
                  stat.iceState === 'connected' && "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                )}
              >
                {getStateIcon(stat.iceState)}
                <span className="text-xs">{stat.iceState}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2">
                <p className="font-medium">Peer: {peerId.slice(0, 8)}...</p>
                <div className={cn("text-xs space-y-1", getQualityColor(stat))}>
                  <p>ICE State: {stat.iceState}</p>
                  <p>Bitrate: {stat.bitrate.toFixed(0)} kbps</p>
                  <p>Packet Loss: {stat.packetLoss.toFixed(1)}%</p>
                  <p>RTT: {stat.roundTripTime.toFixed(0)}ms</p>
                  <p>Jitter: {stat.jitter.toFixed(1)}ms</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
