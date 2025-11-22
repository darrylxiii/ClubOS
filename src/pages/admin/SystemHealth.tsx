import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { Activity, Database, AlertCircle, CheckCircle2, Clock, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SystemHealth() {
  const { health, functions, isLoading, refetch } = useSystemHealth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-success';
      case 'degraded': return 'text-warning';
      case 'offline': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'degraded': return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'offline': return <AlertCircle className="w-5 h-5 text-destructive" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
            <p className="text-muted-foreground">Real-time platform monitoring and diagnostics</p>
          </div>
          <Skeleton className="h-10 w-24" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">Real-time platform monitoring and diagnostics</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Platform Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {getStatusIcon(health?.platform_status || 'unknown')}
            <div>
              <CardTitle className={getStatusColor(health?.platform_status || 'unknown')}>
                Platform Status: {health?.platform_status?.toUpperCase() || 'CHECKING...'}
              </CardTitle>
              <CardDescription>
                Last updated: {new Date().toLocaleTimeString()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.active_users_1h || 0}</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.avg_response_time_ms || 0}ms</div>
            <p className="text-xs text-muted-foreground">Average (p95)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Connections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health?.db_connections || 0}</div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors (1h)</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {health?.total_errors_1h || 0}
              {(health?.critical_errors_1h || 0) > 0 && (
                <span className="text-lg text-destructive ml-2">
                  ({health?.critical_errors_1h} critical)
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {(health?.total_errors_1h || 0) === 0 ? 'No errors' : 'Errors detected'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Edge Functions Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <CardTitle>Edge Functions Health</CardTitle>
          </div>
          <CardDescription>Performance metrics for backend functions</CardDescription>
        </CardHeader>
        <CardContent>
          {!functions || functions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No function data available</p>
          ) : (
            <div className="space-y-4">
              {functions.map((func) => (
                <div key={func.function_name} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{func.function_name.replace('function:', '')}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{func.total_calls} calls</span>
                      <span>{func.avg_duration_ms}ms avg</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {func.success_rate >= 95 ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : func.success_rate >= 80 ? (
                      <AlertCircle className="w-5 h-5 text-warning" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className="font-semibold">{func.success_rate.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
