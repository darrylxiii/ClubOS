import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PartnerHealth {
  partnerId: string;
  partnerName: string;
  lastLogin: string;
  sessionTimeMinutes: number;
  candidatesViewed: number;
  messagesResponse: number;
  engagementScore: number;
  activityTrend: 'increasing' | 'stable' | 'declining' | 'churning';
  churnRisk: number;
}

export function PartnerHealthDashboard() {
  const [partners, setPartners] = useState<PartnerHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePartners: 0,
    atRiskPartners: 0,
    avgEngagement: 0,
    totalChurned: 0,
  });

  useEffect(() => {
    fetchPartnerHealth();
    const interval = setInterval(fetchPartnerHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPartnerHealth = async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const metricsQuery = supabase.from('partner_engagement_metrics').select('*').gte('date', sevenDaysAgo);
      // @ts-expect-error - Avoiding deep type instantiation from Supabase queries  
      const profilesQuery = supabase.from('profiles').select('*').eq('role', 'partner');

      const metricsResult: any = await metricsQuery;
      const profilesResult: any = await profilesQuery;

      const metrics: any[] = metricsResult.data || [];
      const profiles: any[] = profilesResult.data || [];

      if (profiles.length === 0) return;

      const partnerList: PartnerHealth[] = profiles.map((profile: any) => {
        const partnerMetrics = metrics.filter((m: any) => m.partner_id === profile.id);
        const totalLogins = partnerMetrics.reduce((sum, m) => sum + (m.total_logins || 0), 0);
        const avgEngagement = partnerMetrics.length > 0 ? partnerMetrics.reduce((sum, m) => sum + (m.engagement_score || 0), 0) / partnerMetrics.length : 0;
        const latestMetric = partnerMetrics[0];
        const churnRisk = totalLogins === 0 ? 100 : Math.max(0, 100 - avgEngagement);

        return {
          partnerId: profile.id,
          partnerName: profile.full_name || 'Unknown',
          lastLogin: 'Recently',
          sessionTimeMinutes: partnerMetrics.reduce((sum, m) => sum + (m.total_session_time_minutes || 0), 0),
          candidatesViewed: partnerMetrics.reduce((sum, m) => sum + (m.candidates_viewed || 0), 0),
          messagesResponse: latestMetric?.average_response_time_hours || 0,
          engagementScore: Math.round(avgEngagement),
          activityTrend: (latestMetric?.activity_trend || 'stable') as 'increasing' | 'stable' | 'declining' | 'churning',
          churnRisk: Math.round(churnRisk),
        };
      });

      setPartners(partnerList);
      setStats({
        activePartners: partnerList.filter(p => p.engagementScore > 60).length,
        atRiskPartners: partnerList.filter(p => p.churnRisk > 70).length,
        avgEngagement: Math.round(partnerList.reduce((sum, p) => sum + p.engagementScore, 0) / (partnerList.length || 1)),
        totalChurned: partnerList.filter(p => p.activityTrend === 'churning').length,
      });
    } catch (error) {
      console.error('Failed to fetch partner health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      case 'churning': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRiskBadge = (risk: number) => {
    if (risk > 70) return <Badge variant="destructive">High Risk</Badge>;
    if (risk > 40) return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Medium Risk</Badge>;
    return <Badge variant="outline" className="border-green-500 text-green-500">Low Risk</Badge>;
  };

  if (loading) return <div className="text-muted-foreground">Loading partner health data...</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Partners</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePartners}</div>
            <p className="text-xs text-muted-foreground">Engagement &gt; 60%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.atRiskPartners}</div>
            <p className="text-xs text-muted-foreground">Churn risk &gt; 70%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgEngagement}%</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churned</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChurned}</div>
            <p className="text-xs text-muted-foreground">Inactive partners</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Partner Health Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {partners.slice(0, 10).map((partner) => (
              <div key={partner.partnerId} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium">{partner.partnerName}</span>
                    {getTrendIcon(partner.activityTrend)}
                    {getRiskBadge(partner.churnRisk)}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{Math.round(partner.sessionTimeMinutes / 60)}h session time</span>
                    <span>{partner.candidatesViewed} candidates viewed</span>
                    <span>{partner.messagesResponse}h avg response</span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Engagement Score</span>
                      <span className="text-xs font-medium">{partner.engagementScore}%</span>
                    </div>
                    <Progress value={partner.engagementScore} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
