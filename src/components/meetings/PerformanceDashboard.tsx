import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  AlertTriangle,
  RefreshCw,
  Gauge
} from 'lucide-react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useResourceOptimizer } from '@/hooks/useResourceOptimizer';
import { useMemoryManager } from '@/hooks/useMemoryManager';

export function PerformanceDashboard() {
  const performance = usePerformanceMonitor({
    sampleInterval: 2000
  });

  const optimizer = useResourceOptimizer({
    targetCpuUsage: 70,
    targetMemoryUsage: 80
  });

  const memory = useMemoryManager({
    maxCacheSize: 50 * 1024 * 1024
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge className="bg-orange-500/20 text-orange-500">Low</Badge>;
      case 'off':
        return <Badge variant="destructive">Off</Badge>;
      default:
        return <Badge variant="secondary">{quality}</Badge>;
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Performance Score */}
      <Card className="bg-background/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Performance Score
            </CardTitle>
            <span className={`text-3xl font-bold ${getScoreColor(performance.performanceScore)}`}>
              {performance.performanceScore}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress 
            value={performance.performanceScore} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm">FPS</span>
              </div>
              <span className="font-mono font-bold">
                {performance.metrics.fps.toFixed(1)}
              </span>
            </div>
            <Progress 
              value={(performance.metrics.fps / 60) * 100} 
              className="h-1.5"
            />
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-orange-500" />
                <span className="text-sm">CPU</span>
              </div>
              <span className="font-mono font-bold">
                {performance.metrics.cpuUsage.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={performance.metrics.cpuUsage} 
              className="h-1.5"
            />
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Memory</span>
              </div>
              <span className="font-mono font-bold">
                {performance.metrics.memoryUsage.toFixed(0)}%
              </span>
            </div>
            <Progress 
              value={performance.metrics.memoryUsage} 
              className="h-1.5"
            />
          </CardContent>
        </Card>

        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm">Latency</span>
              </div>
              <span className="font-mono font-bold">
                {performance.metrics.networkLatency.toFixed(0)}ms
              </span>
            </div>
            <Progress 
              value={Math.min((performance.metrics.networkLatency / 300) * 100, 100)} 
              className="h-1.5"
            />
          </CardContent>
        </Card>
      </div>

      {/* Resource Optimization */}
      <Card className="bg-background/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Resource Optimization</CardTitle>
            <Badge variant="outline">
              Level {optimizer.optimizationLevel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Video Quality</span>
            {getQualityBadge(optimizer.resourceState.videoQuality)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Audio Quality</span>
            {getQualityBadge(optimizer.resourceState.audioQuality)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Effects</span>
            <Badge variant={optimizer.resourceState.effectsEnabled ? 'default' : 'secondary'}>
              {optimizer.resourceState.effectsEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Background Blur</span>
            <Badge variant={optimizer.resourceState.backgroundBlurEnabled ? 'default' : 'secondary'}>
              {optimizer.resourceState.backgroundBlurEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => optimizer.optimize()}
              disabled={optimizer.isOptimizing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${optimizer.isOptimizing ? 'animate-spin' : ''}`} />
              Optimize
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => optimizer.resetToDefaults()}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memory Management */}
      <Card className="bg-background/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Memory</CardTitle>
            {memory.isLowMemory && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Heap Used</span>
            <span className="font-mono">
              {(memory.memoryStats.usedHeap / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Heap Total</span>
            <span className="font-mono">
              {(memory.memoryStats.totalHeap / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cache Size</span>
            <span className="font-mono">
              {(memory.cacheSize / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>

          <Progress 
            value={memory.memoryStats.usagePercentage} 
            className="h-2"
          />

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => memory.performCleanup()}
            >
              Cleanup
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => memory.clearCache()}
            >
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {performance.alerts.length > 0 && (
        <Card className="bg-background/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Alerts
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => performance.clearAlerts()}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {performance.alerts.slice(-5).reverse().map((alert, index) => (
                <div 
                  key={index}
                  className={`text-sm p-2 rounded ${
                    alert.severity === 'critical' 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {alert.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
