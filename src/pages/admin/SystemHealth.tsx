import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { Activity, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SystemHealthMetrics } from "@/components/admin/system/SystemHealthMetrics";
import { FunctionHealthTable } from "@/components/admin/system/FunctionHealthTable";
import { ErrorLogViewer } from "@/components/admin/system/ErrorLogViewer";

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
      <AppLayout>
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
      </AppLayout>
    );
  }

  return (
    <AppLayout>
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

        {/* Tabbed Interface */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="functions">Functions</TabsTrigger>
            <TabsTrigger value="errors">Error Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <SystemHealthMetrics health={health ?? null} />
          </TabsContent>

          <TabsContent value="functions" className="mt-6">
            <FunctionHealthTable functions={functions ?? null} />
          </TabsContent>

          <TabsContent value="errors" className="mt-6">
            <ErrorLogViewer />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
