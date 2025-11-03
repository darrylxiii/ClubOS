import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CRMMetrics } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, TrendingUp, Activity, Target, DollarSign } from "lucide-react";

interface CompanyCRMMetricsProps {
  companyId: string;
}

export function CompanyCRMMetrics({ companyId }: CompanyCRMMetricsProps) {
  const [metrics, setMetrics] = useState<CRMMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [companyId]);

  const loadMetrics = async () => {
    try {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const [
        contactsRes,
        dealsRes,
        activitiesRes,
        closedDealsRes,
        avgScoreRes
      ] = await Promise.all([
        // Total contacts
        supabase
          .from('crm_contacts' as any)
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId),
        
        // Active deals
        supabase
          .from('crm_deals' as any)
          .select('id, value', { count: 'exact' })
          .eq('company_id', companyId)
          .is('closed_at', null),
        
        // Activities this month
        supabase
          .from('crm_activities' as any)
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', firstDayOfMonth.toISOString()),
        
        // Closed deals this month
        supabase
          .from('crm_deals' as any)
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('closed_at', firstDayOfMonth.toISOString()),
        
        // Average lead score
        supabase
          .from('crm_contacts' as any)
          .select('lead_score')
          .eq('company_id', companyId)
      ]);

      const pipelineValue = dealsRes.data?.reduce((sum: number, deal: any) => sum + (deal.value || 0), 0) || 0;
      
      const scores = avgScoreRes.data?.map((c: any) => c.lead_score) || [];
      const avgLeadScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0;

      setMetrics({
        total_contacts: contactsRes.count || 0,
        active_deals: dealsRes.count || 0,
        pipeline_value: pipelineValue,
        avg_lead_score: Math.round(avgLeadScore),
        engagement_rate: 0, // Calculate based on activities vs contacts
        conversion_rate: 0, // Calculate based on deals closed vs total
        activities_this_month: activitiesRes.count || 0,
        deals_closed_this_month: closedDealsRes.count || 0
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_contacts}</div>
            <p className="text-xs text-muted-foreground">
              Avg Score: {metrics.avg_lead_score}/100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Active Deals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_deals}</div>
            <p className="text-xs text-muted-foreground">
              Closed this month: {metrics.deals_closed_this_month}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Pipeline Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{(metrics.pipeline_value / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-muted-foreground">
              Total open opportunities
            </p>
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
            <p className="text-xs text-muted-foreground">
              Touchpoints logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Engagement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.total_contacts > 0 
                ? Math.round((metrics.activities_this_month / metrics.total_contacts) * 10) / 10
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Activities per contact
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
