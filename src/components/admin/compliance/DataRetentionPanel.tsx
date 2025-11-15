import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Clock, Trash2 } from 'lucide-react';

export const DataRetentionPanel = () => {
  const { data: policies } = useQuery({
    queryKey: ['retention-policies'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('data_retention_policies')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: scheduledDeletions } = useQuery({
    queryKey: ['scheduled-deletions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('scheduled_data_deletions')
        .select('*')
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Active Retention Policies
          </CardTitle>
          <CardDescription>
            Data lifecycle management for compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {policies?.map((policy: any) => (
              <div key={policy.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{policy.policy_name}</p>
                  <p className="text-sm text-muted-foreground">{policy.resource_type}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{policy.retention_period_days} days</p>
                    <p className="text-xs text-muted-foreground">{policy.deletion_method}</p>
                  </div>
                  <Badge variant="outline">{policy.data_classification}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Deletions
          </CardTitle>
          <CardDescription>
            Upcoming automated data deletions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scheduledDeletions && scheduledDeletions.length > 0 ? (
              scheduledDeletions.map((deletion: any) => (
                <div key={deletion.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{deletion.resource_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(deletion.scheduled_for).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{deletion.deletion_method}</Badge>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No scheduled deletions
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
