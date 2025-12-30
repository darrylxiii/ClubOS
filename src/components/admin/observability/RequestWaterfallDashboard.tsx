/**
 * Request Waterfall Dashboard
 * Visual representation of HTTP request timing for performance analysis
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Pause, 
  Play, 
  Trash2, 
  Search, 
  AlertCircle,
  Clock,
  Download,
  ArrowDown
} from 'lucide-react';
import { useRequestWaterfall, RequestTiming } from '@/hooks/useRequestWaterfall';
import { cn } from '@/lib/utils';

interface WaterfallBarProps {
  timing: RequestTiming['timing'];
  duration: number;
  maxDuration: number;
  startOffset: number;
  totalWidth: number;
}

function WaterfallBar({ timing, duration, maxDuration, startOffset, totalWidth }: WaterfallBarProps) {
  const scale = (value: number) => (value / maxDuration) * totalWidth;
  const offsetPx = scale(startOffset);
  const widthPx = Math.max(scale(duration), 2);

  // Calculate segment widths
  const dnsWidth = scale(timing.dns);
  const tcpWidth = scale(timing.tcp);
  const tlsWidth = scale(timing.tls);
  const ttfbWidth = scale(timing.ttfb);
  const downloadWidth = scale(timing.download);

  return (
    <div className="relative h-4 bg-muted rounded" style={{ marginLeft: `${offsetPx}px`, width: `${widthPx}px` }}>
      {/* DNS - Light blue */}
      {timing.dns > 0 && (
        <div 
          className="absolute h-full bg-blue-300 rounded-l" 
          style={{ width: `${dnsWidth}px` }}
          title={`DNS: ${timing.dns.toFixed(1)}ms`}
        />
      )}
      {/* TCP - Yellow */}
      {timing.tcp > 0 && (
        <div 
          className="absolute h-full bg-yellow-400" 
          style={{ left: `${dnsWidth}px`, width: `${tcpWidth}px` }}
          title={`TCP: ${timing.tcp.toFixed(1)}ms`}
        />
      )}
      {/* TLS - Purple */}
      {timing.tls > 0 && (
        <div 
          className="absolute h-full bg-purple-400" 
          style={{ left: `${dnsWidth + tcpWidth}px`, width: `${tlsWidth}px` }}
          title={`TLS: ${timing.tls.toFixed(1)}ms`}
        />
      )}
      {/* TTFB - Green */}
      <div 
        className="absolute h-full bg-green-500" 
        style={{ left: `${dnsWidth + tcpWidth + tlsWidth}px`, width: `${ttfbWidth}px` }}
        title={`TTFB: ${timing.ttfb.toFixed(1)}ms`}
      />
      {/* Download - Blue */}
      <div 
        className="absolute h-full bg-blue-500 rounded-r" 
        style={{ left: `${dnsWidth + tcpWidth + tlsWidth + ttfbWidth}px`, width: `${downloadWidth}px` }}
        title={`Download: ${timing.download.toFixed(1)}ms`}
      />
    </div>
  );
}

function RequestRow({ 
  request, 
  maxDuration, 
  baseTime,
  totalWidth 
}: { 
  request: RequestTiming; 
  maxDuration: number; 
  baseTime: number;
  totalWidth: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const url = new URL(request.url, window.location.origin);
  const pathname = url.pathname.length > 40 
    ? `...${url.pathname.slice(-37)}` 
    : url.pathname;

  const isError = request.status >= 400 || request.error;
  const statusColor = request.status >= 500 
    ? 'bg-destructive' 
    : request.status >= 400 
      ? 'bg-warning' 
      : 'bg-green-500';

  return (
    <div 
      className={cn(
        "border-b border-border hover:bg-muted/50 transition-colors cursor-pointer",
        isError && "bg-destructive/5"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="grid grid-cols-[120px_1fr_80px_80px] gap-2 p-2 text-sm">
        {/* Method + Status */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {request.method}
          </Badge>
          <span className={cn("w-2 h-2 rounded-full", statusColor)} />
          <span className="text-muted-foreground text-xs">{request.status}</span>
        </div>

        {/* Waterfall Bar */}
        <div className="flex items-center">
          <WaterfallBar
            timing={request.timing}
            duration={request.duration}
            maxDuration={maxDuration}
            startOffset={request.startTime - baseTime}
            totalWidth={totalWidth}
          />
        </div>

        {/* Duration */}
        <div className="text-right font-mono text-xs text-muted-foreground">
          {request.duration.toFixed(0)}ms
        </div>

        {/* Size */}
        <div className="text-right font-mono text-xs text-muted-foreground">
          {formatBytes(request.size)}
        </div>
      </div>

      {/* URL Row */}
      <div className="px-2 pb-2">
        <span className="text-xs font-mono text-muted-foreground truncate block">
          {pathname}
        </span>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2 bg-muted/30">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full URL:</span>
              <span className="font-mono">{request.url}</span>
            </div>
            {request.traceId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trace ID:</span>
                <span className="font-mono">{request.traceId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span>{request.type}</span>
            </div>
          </div>

          {/* Timing breakdown */}
          <div className="grid grid-cols-5 gap-2 text-xs mt-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-300 rounded" />
              <span>DNS: {request.timing.dns.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded" />
              <span>TCP: {request.timing.tcp.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-400 rounded" />
              <span>TLS: {request.timing.tls.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded" />
              <span>TTFB: {request.timing.ttfb.toFixed(1)}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded" />
              <span>Download: {request.timing.download.toFixed(1)}ms</span>
            </div>
          </div>

          {request.error && (
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="h-3 w-3" />
              <span>{request.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function RequestWaterfallDashboard() {
  const [filter, setFilter] = useState('');
  const waterfall = useRequestWaterfall();
  const stats = waterfall.getStats();

  const filteredRequests = useMemo(() => {
    if (!filter) return waterfall.requests;
    return waterfall.getFilteredRequests(filter);
  }, [waterfall, filter]);

  const baseTime = waterfall.startTime;
  const maxDuration = Math.max(
    ...filteredRequests.map(r => r.endTime - baseTime + r.duration),
    1000
  );

  const exportData = () => {
    const data = JSON.stringify(waterfall.requests, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `request-waterfall-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Request Waterfall
            </CardTitle>
            <CardDescription>
              Real-time HTTP request timing visualization
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={waterfall.toggleRecording}
            >
              {waterfall.isRecording ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Record
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={waterfall.clearRequests}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Requests:</span>
            <span className="font-medium">{stats.total}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Avg:</span>
            <span className="font-medium">{stats.avgDuration.toFixed(0)}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDown className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">TTFB:</span>
            <span className="font-medium">{stats.avgTTFB.toFixed(0)}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Size:</span>
            <span className="font-medium">{formatBytes(stats.totalSize)}</span>
          </div>
          {stats.errorRate > 0 && (
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>{stats.errorRate.toFixed(1)}% errors</span>
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by URL pattern..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {/* Column headers */}
        <div className="grid grid-cols-[120px_1fr_80px_80px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
          <div>Method</div>
          <div>Waterfall</div>
          <div className="text-right">Time</div>
          <div className="text-right">Size</div>
        </div>

        {/* Requests list */}
        <ScrollArea className="h-[calc(100vh-400px)]">
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <p>No requests recorded yet</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                maxDuration={maxDuration}
                baseTime={baseTime}
                totalWidth={400}
              />
            ))
          )}
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 bg-blue-300 rounded" />
            <span>DNS</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 bg-yellow-400 rounded" />
            <span>TCP</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 bg-purple-400 rounded" />
            <span>TLS</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 bg-green-500 rounded" />
            <span>TTFB</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 bg-blue-500 rounded" />
            <span>Download</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
