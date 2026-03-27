import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { Plug, RefreshCw, Settings, Check, X } from "lucide-react";
import { format } from "date-fns";
import { PartnerGlassCard } from "@/components/partner/PartnerGlassCard";
import { CardDescription, CardTitle } from "@/components/ui/card";

const AVAILABLE_INTEGRATIONS = [
  { type: 'greenhouse', name: 'Greenhouse', description: 'ATS integration for candidate syncing' },
  { type: 'lever', name: 'Lever', description: 'ATS integration for recruiting workflows' },
  { type: 'workday', name: 'Workday', description: 'HRIS integration for employee data' },
  { type: 'successfactors', name: 'SuccessFactors', description: 'SAP HCM integration' },
  { type: 'slack', name: 'Slack', description: 'Real-time notifications and updates' },
  { type: 'teams', name: 'Microsoft Teams', description: 'Collaboration and notifications' }
];

export default function IntegrationsManagement() {
  const { t } = useTranslation('common');
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
      toast.success(t("integration_status_updated", "Integration status updated"));
    },
    onError: () => {
      toast.error(t("failed_to_update_integration", "Failed to update integration"));
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
      toast.success(t("sync_initiated", "Sync initiated"));
    }
  });

  const getIntegrationStatus = (integrationType: string) => {
    return integrations?.find(i => i.integration_type === integrationType);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const status = getIntegrationStatus(integration.type);
          
          return (
            <PartnerGlassCard key={integration.type} className="p-0">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
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
                    <CardDescription className="mt-1">{integration.description}</CardDescription>
                  </div>
                  {status && (
                    <Switch
                      checked={status.is_active}
                      onCheckedChange={() => toggleIntegration.mutate({ 
                        id: status.id, 
                        isActive: status.is_active 
                      })}
                    />
                  )}
                </div>

                {status ? (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("sync_frequency", "Sync Frequency")}</span>
                        <span className="font-medium capitalize">{status.sync_frequency}</span>
                      </div>
                      {status.last_sync_at && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("last_synced", "Last Synced")}</span>
                          <span className="font-medium">
                            {format(new Date(status.last_sync_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("status", "Status")}</span>
                        <Badge variant="outline" className="capitalize border-border/30">
                          {status.sync_status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border/30"
                        onClick={() => syncIntegration.mutate(status.id)}
                        disabled={syncIntegration.isPending}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </Button>
                      <Button size="sm" variant="outline" className="border-border/30">
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
              </div>
            </PartnerGlassCard>
          );
        })}
      </div>
    </div>
  );
}
