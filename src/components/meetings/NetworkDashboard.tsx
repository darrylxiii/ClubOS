import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Download,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkStats {
  timestamp: number;
  rtt: number;
  jitter: number;
  packetLoss: number;
  bandwidth: number;
}

interface NetworkHistory {
  stats: NetworkStats[];
  avgRtt: number;
  avgJitter: number;
  avgPacketLoss: number;
  avgBandwidth: number;
  trend: 'improving' | 'stable' | 'degrading';
}

interface ConnectionState {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  isReconnecting: boolean;
  reconnectAttempts: number;
}

interface NetworkDashboardProps {
  currentStats: NetworkStats | null;
  history: NetworkHistory;
  connectionState: ConnectionState;
  onExportReport: () => void;
  onClearHistory: () => void;
  className?: string;
}

export function NetworkDashboard({
  currentStats,
  history,
  connectionState,
  onExportReport,
  onClearHistory,
  className,
}: NetworkDashboardProps) {
  const statusConfig = useMemo(() => {
    const configs = {
      excellent: { color: 'bg-green-500', textColor: 'text-green-500', label: 'Excellent' },
      good: { color: 'bg-emerald-500', textColor: 'text-emerald-500', label: 'Good' },
      fair: { color: 'bg-yellow-500', textColor: 'text-yellow-500', label: 'Fair' },
      poor: { color: 'bg-red-500', textColor: 'text-red-500', label: 'Poor' },
      disconnected: { color: 'bg-gray-500', textColor: 'text-gray-500', label: 'Disconnected' },
    };
    return configs[connectionState.status];
  }, [connectionState.status]);

  const TrendIcon = useMemo(() => {
    switch (history.trend) {
      case 'improving': return TrendingUp;
      case 'degrading': return TrendingDown;
      default: return Minus;
    }
  }, [history.trend]);

  const trendColor = useMemo(() => {
    switch (history.trend) {
      case 'improving': return 'text-green-500';
      case 'degrading': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  }, [history.trend]);

  const formatBandwidth = (bps: number) => {
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(1)} Mbps`;
    if (bps >= 1000) return `${(bps / 1000).toFixed(0)} Kbps`;
    return `${bps} bps`;
  };

  const getQualityPercentage = () => {
    const qualityMap = {
      excellent: 100,
      good: 75,
      fair: 50,
      poor: 25,
      disconnected: 0,
    };
    return qualityMap[connectionState.status];
  };

  // Mini sparkline for recent history
  const sparklineData = useMemo(() => {
    const recent = history.stats.slice(-30);
    if (recent.length < 2) return null;
    
    const maxRtt = Math.max(...recent.map(s => s.rtt), 1);
    return recent.map(s => (s.rtt / maxRtt) * 100);
  }, [history.stats]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {connectionState.status === 'disconnected' ? (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Wifi className={cn("h-4 w-4", statusConfig.textColor)} />
            )}
            <span>Network Quality</span>
          </div>
          <Badge variant="outline" className={statusConfig.textColor}>
            {statusConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Quality Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Connection Quality</span>
            <span className={statusConfig.textColor}>{getQualityPercentage()}%</span>
          </div>
          <Progress value={getQualityPercentage()} className="h-2" />
        </div>

        {/* Reconnecting Status */}
        {connectionState.isReconnecting && (
          <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-2 text-yellow-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-xs">
              Reconnecting... (Attempt {connectionState.reconnectAttempts})
            </span>
          </div>
        )}

        {/* Current Stats Grid */}
        {currentStats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md bg-muted/50 p-2">
              <div className="text-xs text-muted-foreground">Latency</div>
              <div className="text-lg font-semibold">
                {Math.round(currentStats.rtt)} ms
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <div className="text-xs text-muted-foreground">Packet Loss</div>
              <div className="text-lg font-semibold">
                {(currentStats.packetLoss * 100).toFixed(1)}%
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <div className="text-xs text-muted-foreground">Jitter</div>
              <div className="text-lg font-semibold">
                {Math.round(currentStats.jitter)} ms
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-2">
              <div className="text-xs text-muted-foreground">Bandwidth</div>
              <div className="text-lg font-semibold">
                {formatBandwidth(currentStats.bandwidth)}
              </div>
            </div>
          </div>
        )}

        {/* Trend Indicator */}
        <div className="flex items-center justify-between rounded-md bg-muted/30 p-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Network Trend</span>
          </div>
          <div className={cn("flex items-center gap-1", trendColor)}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-xs capitalize">{history.trend}</span>
          </div>
        </div>

        {/* Mini Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Latency History (30s)</div>
            <div className="flex h-8 items-end gap-px">
              {sparklineData.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/60 transition-all"
                  style={{ height: `${Math.max(value, 5)}%` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Average Stats */}
        <div className="space-y-1 text-xs">
          <div className="text-muted-foreground">Session Averages</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="font-medium">{Math.round(history.avgRtt)} ms</div>
              <div className="text-muted-foreground">Avg RTT</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{(history.avgPacketLoss * 100).toFixed(2)}%</div>
              <div className="text-muted-foreground">Avg Loss</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{formatBandwidth(history.avgBandwidth)}</div>
              <div className="text-muted-foreground">Avg BW</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onExportReport}
          >
            <Download className="mr-2 h-3 w-3" />
            Export Report
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearHistory}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
