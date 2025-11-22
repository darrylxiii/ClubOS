import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Clock, AlertCircle } from "lucide-react";

interface SystemHealthMetricsProps {
  health: {
    platform_status: string;
    active_users_1h: number;
    total_errors_1h: number;
    critical_errors_1h: number;
    avg_response_time_ms: number;
    db_connections: number;
  } | null;
}

export const SystemHealthMetrics = ({ health }: SystemHealthMetricsProps) => {
  if (!health) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{health.active_users_1h}</div>
          <p className="text-xs text-muted-foreground">Last hour</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{health.avg_response_time_ms}ms</div>
          <p className="text-xs text-muted-foreground">Average (p95)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{health.db_connections}</div>
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
            {health.total_errors_1h}
            {health.critical_errors_1h > 0 && (
              <span className="text-lg text-destructive ml-2">
                ({health.critical_errors_1h} critical)
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {health.total_errors_1h === 0 ? 'No errors' : 'Errors detected'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
