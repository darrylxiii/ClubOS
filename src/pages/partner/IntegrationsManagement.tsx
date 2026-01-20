import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { Plug, RefreshCw, Settings, Check, X } from "lucide-react";
import { format } from "date-fns";

const AVAILABLE_INTEGRATIONS = [
  { type: 'greenhouse', name: 'Greenhouse', description: 'ATS integration for candidate syncing' },
  { type: 'lever', name: 'Lever', description: 'ATS integration for recruiting workflows' },
  { type: 'workday', name: 'Workday', description: 'HRIS integration for employee data' },
  { type: 'successfactors', name: 'SuccessFactors', description: 'SAP HCM integration' },
  { type: 'slack', name: 'Slack', description: 'Real-time notifications and updates' },
  { type: 'teams', name: 'Microsoft Teams', description: 'Collaboration and notifications' }
];

export default function IntegrationsManagement() {
  const { companyId } = useRole();
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['partner-integrations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('partner_integrations')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const toggleIntegration = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('partner_integrations')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-integrations', companyId] });
      toast.success("Integration status updated");
    },
    onError: () => {
      toast.error("Failed to update integration");
    }
  });

  const syncIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partner_integrations')
        .update({ 
          last_sync_at: new Date().toISOString(),
          sync_status: 'syncing'
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-integrations', companyId] });
      toast.success("Sync initiated");
    }
  });

  const getIntegrationStatus = (integrationType: string) => {
    return integrations?.find(i => i.integration_type === integrationType);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Plug className="w-8 h-8" />
              Integrations
            </h1>
            <p className="text-muted-foreground mt-2">Connect your tools and automate workflows</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {AVAILABLE_INTEGRATIONS.map((integration) => {
            const status = getIntegrationStatus(integration.type);
            
            return (
              <Card key={integration.type}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {integration.name}
                        {status?.is_active ? (
                          <Badge variant="default" className="gap-1">
                            <Check className="w-3 h-3" />
                            Active
                          </Badge>
                        ) : status ? (
                          <Badge variant="secondary" className="gap-1">
                            <X className="w-3 h-3" />
                            Inactive
                          </Badge>
                        ) : null}
                      </CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                    {status && (
                      <Switch
                        checked={!!status.is_active}
                        onCheckedChange={() => toggleIntegration.mutate({ 
                          id: status.id, 
                          isActive: !!status.is_active 
                        })}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {status ? (
                    <>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sync Frequency</span>
                          <span className="font-medium capitalize">{status.sync_frequency}</span>
                        </div>
                        {status.last_sync_at && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Synced</span>
                            <span className="font-medium">
                              {format(new Date(status.last_sync_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant="outline" className="capitalize">
                            {status.sync_status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncIntegration.mutate(status.id)}
                          disabled={syncIntegration.isPending}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync Now
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button className="w-full">
                      <Plug className="w-4 h-4 mr-2" />
                      Connect {integration.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
