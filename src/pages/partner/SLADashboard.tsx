import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Clock, Target, TrendingUp, AlertCircle } from "lucide-react";
import { PartnerGlassCard } from "@/components/partner/PartnerGlassCard";
import { PartnerInlineStats } from "@/components/partner/PartnerInlineStats";

export default function SLADashboard() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  const { data: slaConfig } = useQuery({
    queryKey: ['partner-sla-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('partner_sla_config')
        .select('*')
        .eq('company_id', companyId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!companyId
  });

  const { data: slaMetrics } = useQuery({
    queryKey: ['partner-sla-tracking', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('partner_sla_tracking')
        .select('*')
        .eq('company_id', companyId)
        .gte('measured_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('measured_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId
  });

  const calculateCompliance = (metricType: string) => {
    const metrics = slaMetrics?.filter(m => m.metric_type === metricType) || [];
    if (metrics.length === 0) return 0;
    const met = metrics.filter(m => m.is_met).length;
    return Math.round((met / metrics.length) * 100);
  };

  const slaItems = [
    {
      title: t('sla.responseTime'),
      target: `${slaConfig?.response_time_hours || 24}h`,
      compliance: calculateCompliance('response_time'),
      icon: Clock,
      description: t('sla.responseTimeDesc')
    },
    {
      title: t('sla.shortlistDelivery'),
      target: `${slaConfig?.shortlist_delivery_hours || 48}h`,
      compliance: calculateCompliance('shortlist_delivery'),
      icon: Target,
      description: t('sla.shortlistDeliveryDesc')
    },
    {
      title: t('sla.interviewScheduling'),
      target: `${slaConfig?.interview_scheduling_hours || 48}h`,
      compliance: calculateCompliance('interview_scheduling'),
      icon: Clock,
      description: t('sla.interviewSchedulingDesc')
    },
    {
      title: t('sla.replacementGuarantee'),
      target: `${slaConfig?.replacement_guarantee_days || 90} days`,
      compliance: calculateCompliance('replacement'),
      icon: TrendingUp,
      description: t('sla.replacementGuaranteeDesc')
    }
  ];

  const avgCompliance = slaItems.length > 0
    ? Math.round(slaItems.reduce((sum, item) => sum + item.compliance, 0) / slaItems.length)
    : 0;

  return (
    <div className="space-y-6">
      <PartnerInlineStats
        stats={[
          { value: avgCompliance, label: 'Avg Compliance', format: (v) => `${Math.round(v)}%`, highlight: true },
          { value: slaMetrics?.length || 0, label: 'Metrics Tracked' },
          { value: slaMetrics?.filter(m => m.is_met).length || 0, label: 'SLAs Met' },
          { value: slaMetrics?.filter(m => !m.is_met).length || 0, label: 'SLAs Missed' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {slaItems.map((item) => (
          <PartnerGlassCard
            key={item.title}
            title={item.title}
            description={item.description}
            icon={<item.icon className="w-5 h-5 text-muted-foreground" />}
            badge={
              <Badge variant={item.compliance >= 90 ? "default" : item.compliance >= 75 ? "secondary" : "destructive"}>
                {item.compliance}% SLA Met
              </Badge>
            }
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('sla.target')}</span>
                  <span className="font-semibold">{item.target}</span>
                </div>
                <Progress value={item.compliance} className="h-2" />
              </div>
              {item.compliance < 90 && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">
                    {t('sla.belowTarget')}
                  </p>
                </div>
              )}
            </div>
          </PartnerGlassCard>
        ))}
      </div>

      <PartnerGlassCard
        title={t('sla.recentPerformance')}
        description={t('sla.last30Days')}
      >
        {slaMetrics && slaMetrics.length > 0 ? (
          <div className="space-y-2">
            {slaMetrics.slice(0, 10).map((metric) => (
              <div key={metric.id} className="flex items-center justify-between p-3 rounded-lg bg-card/20 border border-border/10">
                <div>
                  <p className="font-medium capitalize">{metric.metric_type.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-muted-foreground">
                    Target: {metric.target_value}h | Actual: {metric.actual_value || 'N/A'}h
                  </p>
                </div>
                <Badge variant={metric.is_met ? "default" : "destructive"}>
                  {metric.is_met ? 'Met' : 'Missed'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{t('sla.noMetrics')}</p>
          </div>
        )}
      </PartnerGlassCard>
    </div>
  );
}
