import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  Share2, 
  Sparkles, 
  RotateCcw, 
  Target,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gauge,
  MousePointerClick,
  Eye,
  Users,
  Clock,
  Zap,
  Search
} from 'lucide-react';
import { 
  useLatestWebKPIs, 
  useCalculateWebKPIs, 
  getKPIStatus, 
  formatKPIName,
  type WebKPIMetric 
} from '@/hooks/useWebsiteKPIs';
import { toast } from 'sonner';

const KPICard = ({ 
  kpi, 
  icon: Icon,
  unit = '',
  inverse = false 
}: { 
  kpi: WebKPIMetric | undefined; 
  icon: React.ElementType;
  unit?: string;
  inverse?: boolean;
}) => {
  if (!kpi) return null;

  const status = getKPIStatus(kpi);
  const statusColors = {
    success: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    critical: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    neutral: 'text-muted-foreground bg-muted/50 border-border',
  };

  const progress = kpi.target_value 
    ? inverse 
      ? Math.max(0, Math.min(100, ((kpi.target_value - (kpi.value || 0)) / kpi.target_value) * 100 + 100))
      : Math.min(100, ((kpi.value || 0) / kpi.target_value) * 100)
    : 0;

  return (
    <Card className={`border ${statusColors[status]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{formatKPIName(kpi.kpi_name)}</CardTitle>
          </div>
          {status === 'success' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
          {status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
          {status === 'critical' && <XCircle className="h-4 w-4 text-rose-500" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{kpi.value?.toLocaleString() || 0}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        {kpi.target_value && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: {kpi.target_value}{unit}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}
        {kpi.trend_direction && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <TrendingUp className={`h-3 w-3 ${kpi.trend_direction === 'up' ? 'text-emerald-500' : 'text-rose-500 rotate-180'}`} />
            <span>{kpi.trend_percentage}% vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const KPIGrid = ({ 
  kpis, 
  configs 
}: { 
  kpis: WebKPIMetric[]; 
  configs: Array<{ name: string; icon: React.ElementType; unit?: string; inverse?: boolean }>;
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {configs.map(config => {
        const kpi = kpis.find(k => k.kpi_name === config.name);
        return (
          <KPICard 
            key={config.name} 
            kpi={kpi} 
            icon={config.icon} 
            unit={config.unit}
            inverse={config.inverse}
          />
        );
      })}
    </div>
  );
};

export function WebsiteKPIDashboard() {
  const { data: kpis, isLoading, refetch } = useLatestWebKPIs();
  const calculateKPIs = useCalculateWebKPIs();

  const handleRefresh = async () => {
    try {
      await calculateKPIs.mutateAsync();
      await refetch();
      toast.success('KPIs refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh KPIs');
    }
  };

  const getKPIsByCategory = (category: string) => 
    kpis?.filter(k => k.category === category) || [];

  const getCriticalAlerts = () => 
    kpis?.filter(k => getKPIStatus(k) === 'critical') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const criticalAlerts = getCriticalAlerts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Website KPI Dashboard</h1>
          <p className="text-muted-foreground">Strategic performance metrics for web & marketing</p>
        </div>
        <Button onClick={handleRefresh} disabled={calculateKPIs.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${calculateKPIs.isPending ? 'animate-spin' : ''}`} />
          Refresh KPIs
        </Button>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Card className="border-rose-500/50 bg-rose-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
              {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {criticalAlerts.map(kpi => (
                <Badge key={kpi.id} variant="destructive">
                  {formatKPIName(kpi.kpi_name)}: {kpi.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Tabs */}
      <Tabs defaultValue="north_star" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="north_star" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">North Star</span>
          </TabsTrigger>
          <TabsTrigger value="funnel" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="attribution" className="gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Attribution</span>
          </TabsTrigger>
          <TabsTrigger value="ai_insights" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="retention" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Retention</span>
          </TabsTrigger>
          <TabsTrigger value="google_signals" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Google</span>
          </TabsTrigger>
        </TabsList>

        {/* North Star Metrics */}
        <TabsContent value="north_star" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">🧠 Strategic North Star Metrics</h2>
            <p className="text-muted-foreground mb-6">Core acquisition metrics that drive business growth</p>
          </div>
          <KPIGrid 
            kpis={getKPIsByCategory('north_star')}
            configs={[
              { name: 'cpl', icon: Gauge, unit: '€', inverse: true },
              { name: 'cpsql', icon: Target, unit: '€', inverse: true },
              { name: 'landing_page_conversion_rate', icon: MousePointerClick, unit: '%' },
              { name: 'search_to_lead_lag', icon: Clock, unit: 'h', inverse: true },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Actionable Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>CPL &gt; €175:</strong> Optimize campaigns per audience or keyword</p>
              <p>• <strong>CPSQL high:</strong> Disable low SQL-output campaigns immediately</p>
              <p>• <strong>Landing Page CR &lt; 3%:</strong> A/B test pages with &gt;70% bounce</p>
              <p>• <strong>Search-to-Lead &gt; 48h:</strong> Implement retargeting or shortened path</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance & Funnel */}
        <TabsContent value="funnel" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">🚀 Performance & Funnel Metrics</h2>
            <p className="text-muted-foreground mb-6">Session data, engagement, and Core Web Vitals</p>
          </div>
          <KPIGrid 
            kpis={getKPIsByCategory('funnel')}
            configs={[
              { name: 'sessions_organic', icon: Search },
              { name: 'sessions_paid', icon: Zap },
              { name: 'sessions_referral', icon: Users },
              { name: 'ctr', icon: MousePointerClick, unit: '%' },
              { name: 'bounce_rate', icon: TrendingUp, unit: '%', inverse: true },
              { name: 'page_load_time_lcp', icon: Clock, unit: 'ms', inverse: true },
              { name: 'impressions_brand', icon: Eye },
              { name: 'impressions_non_brand', icon: Eye },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Optimization Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>CTR &lt; 1.5%:</strong> Update meta titles and descriptions</p>
              <p>• <strong>Bounce &gt; 50%:</strong> Analyze heatmaps for problem pages</p>
              <p>• <strong>LCP &gt; 2.5s:</strong> Compress media, lazy-load JS</p>
              <p>• <strong>Low non-brand impressions:</strong> Expand AI content & SEO</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attribution */}
        <TabsContent value="attribution" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">📲 Channel & Campaign Attribution</h2>
            <p className="text-muted-foreground mb-6">Understand which channels drive conversions</p>
          </div>
          <KPIGrid 
            kpis={getKPIsByCategory('attribution')}
            configs={[
              { name: 'lead_attribution_organic_pct', icon: Search, unit: '%' },
              { name: 'lead_attribution_paid_pct', icon: Zap, unit: '%' },
              { name: 'lead_attribution_referral_pct', icon: Users, unit: '%' },
              { name: 'session_to_sql_lag', icon: Clock, unit: 'h', inverse: true },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Attribution Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Use attribution mix for <strong>budget allocation decisions</strong></p>
              <p>• <strong>Session→SQL lag &gt; 72h:</strong> Implement remarketing or chatbot outreach</p>
              <p>• High referral %: Double down on partnership programs</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights */}
        <TabsContent value="ai_insights" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">🧪 AI-Driven UX & Content Insights</h2>
            <p className="text-muted-foreground mb-6">GPT-4o powered content analysis</p>
          </div>
          <KPIGrid 
            kpis={getKPIsByCategory('ai_insights')}
            configs={[
              { name: 'content_clarity_avg', icon: Sparkles, unit: '/10' },
              { name: 'emotional_load_score', icon: Brain },
              { name: 'heat_trigger_ratio', icon: Zap },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Content Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>Clarity &lt; 6:</strong> Simplify paragraphs flagged as complex</p>
              <p>• <strong>High negative sentiment:</strong> A/B test alternative headlines</p>
              <p>• <strong>Heat Trigger &lt; 0.3:</strong> Switch images or CTAs to boost engagement</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention */}
        <TabsContent value="retention" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">🔁 Retention & Re-Engagement</h2>
            <p className="text-muted-foreground mb-6">Keep visitors coming back</p>
          </div>
          <KPIGrid 
            kpis={getKPIsByCategory('retention')}
            configs={[
              { name: 'returning_visitor_pct', icon: RotateCcw, unit: '%' },
              { name: 'retarget_conversion_rate', icon: Target, unit: '%' },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Retention Strategies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>Returning visitors &lt; 20%:</strong> Deploy email/LinkedIn retargeting</p>
              <p>• <strong>Low retarget CR:</strong> Optimize audiences and hook copy</p>
              <p>• Grow first-party audience via gated incentives or lead magnets</p>
              <p>• Users scrolling but not clicking? Add sticky CTA or floating footer</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Signals */}
        <TabsContent value="google_signals" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">🎯 Google-Specific Strategic Signals</h2>
            <p className="text-muted-foreground mb-6">Google Growth Partner level metrics</p>
          </div>
          <KPIGrid 
            kpis={getKPIsByCategory('google_signals')}
            configs={[
              { name: 'branded_ctr', icon: Target, unit: '%' },
              { name: 'non_branded_ctr', icon: Search, unit: '%' },
              { name: 'gclid_capture_success', icon: CheckCircle, unit: '%' },
              { name: 'cwv_pass_rate', icon: Zap, unit: '%' },
              { name: 'sqls_from_search', icon: Users },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Google Performance Targets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-sm">
                  <p>• <strong>Branded CTR target:</strong> &gt;2.5% (signals trust)</p>
                  <p>• <strong>Non-Branded CTR target:</strong> &gt;1.5% (signals relevance)</p>
                  <p>• <strong>GCLID Capture:</strong> ≥95% of paid sessions</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p>• <strong>Offline Conversion API:</strong> ≤48h return</p>
                  <p>• <strong>CWV Pass:</strong> 100% pages passing</p>
                  <p>• <strong>SQLs from Search:</strong> +15/mo milestone</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}