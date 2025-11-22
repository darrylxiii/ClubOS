import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ErrorLog {
  id: string;
  severity: string;
  error_message: string;
  component_name: string;
  created_at: string;
  context?: any;
}

export const ErrorLogViewer = () => {
  const { data: errors, isLoading } = useQuery({
    queryKey: ['recent-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as ErrorLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <CardTitle>Recent Error Logs</CardTitle>
        </div>
        <CardDescription>Last 10 errors across the platform</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading errors...</p>
        ) : !errors || errors.length === 0 ? (
          <p className="text-sm text-success">✓ No errors in the last 24 hours</p>
        ) : (
          <div className="space-y-3">
            {errors.map((error) => (
              <div key={error.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(error.severity)}>
                        {error.severity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {error.component_name}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{error.error_message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(error.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
                {error.context && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View context
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-auto">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
