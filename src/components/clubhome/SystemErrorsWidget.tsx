import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface ErrorStats {
  critical: number;
  error: number;
  warning: number;
  recentErrors: { id: string; message: string; severity: string; created_at: string }[];
}

export const SystemErrorsWidget = () => {
  const [stats, setStats] = useState<ErrorStats>({
    critical: 0,
    error: 0,
    warning: 0,
    recentErrors: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchErrors();
  }, []);

  const fetchErrors = async () => {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data } = await supabase
        .from('error_logs')
        .select('id, error_message, severity, created_at')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const critical = data.filter(e => e.severity === 'critical').length;
        const error = data.filter(e => e.severity === 'error').length;
        const warning = data.filter(e => e.severity === 'warning').length;

        setStats({
          critical,
          error,
          warning,
          recentErrors: data.slice(0, 3).map(e => ({
            id: e.id,
            message: e.error_message || 'Unknown error',
            severity: e.severity || 'error',
            created_at: e.created_at
          }))
        });
      }
    } catch (error) {
      console.error('Error fetching system errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Info className="h-4 w-4 text-yellow-500" />;
    }
  };

  const totalErrors = stats.critical + stats.error + stats.warning;

  if (loading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-subtle rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-primary" />
          System Errors
          {totalErrors > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {totalErrors} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex flex-col items-center p-2 rounded-lg bg-red-500/10">
            <span className="text-xl font-bold text-red-500">{stats.critical}</span>
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-orange-500/10">
            <span className="text-xl font-bold text-orange-500">{stats.error}</span>
            <span className="text-xs text-muted-foreground">Errors</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-yellow-500/10">
            <span className="text-xl font-bold text-yellow-500">{stats.warning}</span>
            <span className="text-xs text-muted-foreground">Warnings</span>
          </div>
        </div>

        {stats.recentErrors.length > 0 && (
          <div className="space-y-2 mb-4">
            {stats.recentErrors.map(err => (
              <div key={err.id} className="flex items-start gap-2 text-sm">
                {getSeverityIcon(err.severity)}
                <span className="line-clamp-1 text-muted-foreground">{err.message}</span>
              </div>
            ))}
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/admin/feedback">
            <ArrowRight className="h-4 w-4 mr-2" />
            View Error Logs
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
