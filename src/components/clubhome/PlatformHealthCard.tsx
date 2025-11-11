import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle, TrendingUp } from "lucide-react";
import { usePlatformHealth } from "@/hooks/usePlatformHealth";
import { Skeleton } from "@/components/ui/skeleton";

export function PlatformHealthCard() {
  const { data: health, isLoading } = usePlatformHealth();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Platform Health
          </CardTitle>
          <CardDescription>Overall system performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Platform Health
        </CardTitle>
        <CardDescription>Overall system performance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          
          {/* Health Score */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className="text-3xl font-bold">{health.healthScore}/100</p>
            </div>
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
              health.healthScore >= 80 ? 'bg-green-500/10 text-green-500' :
              health.healthScore >= 60 ? 'bg-yellow-500/10 text-yellow-500' :
              'bg-red-500/10 text-red-500'
            }`}>
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>

          {/* Alerts */}
          {health.alerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Alerts</p>
              {health.alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`flex items-start gap-2 p-2 rounded ${
                    alert.severity === 'warning' 
                      ? 'bg-yellow-500/10' 
                      : 'bg-blue-500/10'
                  }`}
                >
                  <AlertCircle className={`h-4 w-4 mt-0.5 ${
                    alert.severity === 'warning' 
                      ? 'text-yellow-500' 
                      : 'text-blue-500'
                  }`} />
                  <p className={`text-xs flex-1 ${
                    alert.severity === 'warning'
                      ? 'text-yellow-700 dark:text-yellow-400'
                      : 'text-blue-700 dark:text-blue-400'
                  }`}>
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xl font-bold">{health.avgAppsPerJob}</p>
              <p className="text-xs text-muted-foreground">Apps per Job</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xl font-bold">{health.activeMeetings}</p>
              <p className="text-xs text-muted-foreground">Meetings</p>
            </div>
            <div className="col-span-2 text-center p-3 rounded-lg bg-muted/30">
              <p className="text-xl font-bold">{health.jobsFilledThisMonth}</p>
              <p className="text-xs text-muted-foreground">Jobs Filled This Month</p>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
