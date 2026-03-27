import { useTranslation } from 'react-i18next';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Activity, Target } from "lucide-react";

interface CompanyCRMMetricsProps {
  companyId: string;
}

interface ProspectMetrics {
  total_prospects: number;
  hot_leads: number;
  activities_this_month: number;
  avg_score: number;
}

export function CompanyCRMMetrics({ companyId }: CompanyCRMMetricsProps) {
  const { t } = useTranslation('common');
  const [metrics, setMetrics] = useState<ProspectMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [companyId]);

  const loadMetrics = async () => {
    try {
      // Get company domain to match prospects
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .maybeSingle();

      if (!company) return;

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const [prospectsRes, hotRes, touchpointsRes] = await Promise.all([
        supabase
          .from('crm_prospects')
          .select('id, composite_score', { count: 'exact' })
          .ilike('company_name', `%${company.name}%`),
        supabase
          .from('crm_prospects')
          .select('id', { count: 'exact', head: true })
          .ilike('company_name', `%${company.name}%`)
          .eq('reply_sentiment', 'hot'),
        supabase
          .from('crm_touchpoints')
          .select('id', { count: 'exact', head: true })
          .gte('occurred_at', firstDayOfMonth.toISOString()),
      ]);

      const scores = prospectsRes.data?.map((p: any) => p.composite_score || 0) || [];
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;

      setMetrics({
        total_prospects: prospectsRes.count || 0,
        hot_leads: hotRes.count || 0,
        activities_this_month: touchpointsRes.count || 0,
        avg_score: avgScore,
      });
    } catch (error) {
      console.error('Error loading CRM metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Target className="w-5 h-5" />
        CRM Metrics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Prospects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_prospects}</div>
            <p className="text-xs text-muted-foreground">
              Avg Score: {metrics.avg_score}/100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Hot Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.hot_leads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activities_this_month}</div>
            <p className="text-xs text-muted-foreground">{t("touchpoints_logged", "Touchpoints logged")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
