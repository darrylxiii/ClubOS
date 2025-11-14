import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, Clock, Target, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface SmartAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action_required: string;
  action_url: string;
  metadata: any;
  created_at: string;
}

export function SmartAlertsPanel({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['smart-alerts', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_smart_alerts' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as unknown as SmartAlert[];
    },
    refetchInterval: 60000 // Refresh every minute
  });

  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('partner_smart_alerts' as any)
        .update({ is_dismissed: true })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-alerts', companyId] });
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning': return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />;
      case 'success': return <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" />;
      default: return <Target className="h-5 w-5 text-primary" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-destructive/50 bg-destructive/5';
      case 'warning': return 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20';
      case 'success': return 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20';
      default: return 'border-primary/50 bg-primary/5';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Alert className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-500" />
        <AlertTitle>All clear</AlertTitle>
        <AlertDescription>No urgent actions required right now</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1 space-y-1">
                <AlertTitle className="flex items-center gap-2 flex-wrap">
                  {alert.title}
                  <Badge variant="outline" className="text-xs">
                    {alert.alert_type.replace('_', ' ')}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="text-sm">
                  {alert.message}
                </AlertDescription>
                {alert.action_required && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="default" asChild>
                      <Link to={alert.action_url}>
                        {alert.action_required}
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => dismissAlert.mutate(alert.id)}
              disabled={dismissAlert.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}
