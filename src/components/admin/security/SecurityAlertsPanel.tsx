import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import type { SecurityAlert } from "@/types/security";
import { toast } from "sonner";

export const SecurityAlertsPanel = () => {
  const queryClient = useQueryClient();
  
  const { data: alerts } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('is_dismissed', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as SecurityAlert[];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 15000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('security_alerts')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString(),
          dismissed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-alerts'] });
      toast.success('Alert dismissed');
    },
    onError: () => {
      toast.error('Failed to dismiss alert');
    }
  });

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Alert 
          key={alert.id} 
          variant={alert.severity === 'critical' ? 'destructive' : 'default'}
          className={
            alert.severity === 'critical' 
              ? 'border-red-500/50' 
              : alert.severity === 'warning'
              ? 'border-orange-500/50'
              : 'border-blue-500/50'
          }
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{alert.title}</span>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => dismissMutation.mutate(alert.id)}
              disabled={dismissMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            {alert.description}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
