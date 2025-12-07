import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Clock, Target, TrendingUp, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

export default function SLADashboard() {
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
      title: "Response Time",
      target: `${slaConfig?.response_time_hours || 24}h`,
      compliance: calculateCompliance('response_time'),
      icon: Clock,
      description: "Time to first response"
    },
    {
      title: "Shortlist Delivery",
      target: `${slaConfig?.shortlist_delivery_hours || 48}h`,
      compliance: calculateCompliance('shortlist_delivery'),
      icon: Target,
      description: "Candidate shortlist delivery"
    },
    {
      title: "Interview Scheduling",
      target: `${slaConfig?.interview_scheduling_hours || 48}h`,
      compliance: calculateCompliance('interview_scheduling'),
      icon: Clock,
      description: "Interview setup time"
    },
    {
      title: "Replacement Guarantee",
      target: `${slaConfig?.replacement_guarantee_days || 90} days`,
      compliance: calculateCompliance('replacement'),
      icon: TrendingUp,
      description: "Candidate replacement window"
    }
  ];

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="w-8 h-8" />
              Service Level Agreement
            </h1>
            <p className="text-muted-foreground mt-2">Monitor SLA compliance and performance metrics</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {slaItems.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <item.icon className="w-5 h-5" />
                    {item.title}
                  </CardTitle>
                  <Badge variant={item.compliance >= 90 ? "default" : item.compliance >= 75 ? "secondary" : "destructive"}>
                    {item.compliance}% SLA Met
                  </Badge>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-semibold">{item.target}</span>
                  </div>
                  <Progress value={item.compliance} className="h-2" />
                </div>
                {item.compliance < 90 && (
                  <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      Below target compliance. Review processes to improve performance.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent SLA Performance</CardTitle>
            <CardDescription>Last 30 days of SLA tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {slaMetrics && slaMetrics.length > 0 ? (
              <div className="space-y-2">
                {slaMetrics.slice(0, 10).map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No SLA metrics recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
