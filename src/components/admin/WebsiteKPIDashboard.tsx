import { useTranslation } from 'react-i18next';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const { t } = useTranslation('common');
  const { data: kpis, isLoading, refetch } = useLatestWebKPIs();
  const calculateKPIs = useCalculateWebKPIs();

  const handleRefresh = async () => {
    try {
      await calculateKPIs.mutateAsync();
      await refetch();
      toast.success(t("kpis_refreshed_successfully", "KPIs refreshed successfully"));
    } catch (error) {
      toast.error(t("failed_to_refresh_kpis", "Failed to refresh KPIs"));
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
          <h1 className="text-3xl font-bold tracking-tight">{t("website_kpi_dashboard", "Website KPI Dashboard")}</h1>
          <p className="text-muted-foreground">{t("strategic_performance_metrics_for", "Strategic performance metrics for web & marketing")}</p>
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
            <span className="hidden sm:inline">{t("north_star", "North Star")}</span>
          </TabsTrigger>
          <TabsTrigger value="funnel" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t("performance", "Performance")}</span>
          </TabsTrigger>
          <TabsTrigger value="attribution" className="gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("attribution", "Attribution")}</span>
          </TabsTrigger>
          <TabsTrigger value="ai_insights" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t("ai_insights", "AI Insights")}</span>
          </TabsTrigger>
          <TabsTrigger value="retention" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{t("retention", "Retention")}</span>
          </TabsTrigger>
          <TabsTrigger value="google_signals" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">{t("google", "Google")}</span>
          </TabsTrigger>
        </TabsList>

        {/* North Star Metrics */}
        <TabsContent value="north_star" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t("strategic_north_star_metrics", "🧠 Strategic North Star Metrics")}</h2>
            <p className="text-muted-foreground mb-6">{t("core_acquisition_metrics_that", "Core acquisition metrics that drive business growth")}</p>
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
              <CardTitle>{t("actionable_insights", "Actionable Insights")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>{t("cpl_gt_175", "CPL &gt; €175:")}</strong>{t("optimize_campaigns_per_audience", "Optimize campaigns per audience or keyword")}</p>
              <p>• <strong>{t("cpsql_high", "CPSQL high:")}</strong>{t("disable_low_sqloutput_campaigns", "Disable low SQL-output campaigns immediately")}</p>
              <p>• <strong>{t("landing_page_cr_lt", "Landing Page CR &lt; 3%:")}</strong>{t("ab_test_pages_with", "A/B test pages with &gt;70% bounce")}</p>
              <p>• <strong>{t("searchtolead_gt_48h", "Search-to-Lead &gt; 48h:")}</strong>{t("implement_retargeting_or_shortened", "Implement retargeting or shortened path")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance & Funnel */}
        <TabsContent value="funnel" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t("performance_funnel_metrics", "🚀 Performance & Funnel Metrics")}</h2>
            <p className="text-muted-foreground mb-6">{t("session_data_engagement_and", "Session data, engagement, and Core Web Vitals")}</p>
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
              <CardTitle>{t("optimization_actions", "Optimization Actions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>{t("ctr_lt_15", "CTR &lt; 1.5%:")}</strong>{t("update_meta_titles_and", "Update meta titles and descriptions")}</p>
              <p>• <strong>{t("bounce_gt_50", "Bounce &gt; 50%:")}</strong>{t("analyze_heatmaps_for_problem", "Analyze heatmaps for problem pages")}</p>
              <p>• <strong>{t("lcp_gt_25s", "LCP &gt; 2.5s:")}</strong>{t("compress_media_lazyload_js", "Compress media, lazy-load JS")}</p>
              <p>• <strong>{t("low_nonbrand_impressions", "Low non-brand impressions:")}</strong>{t("expand_ai_content_seo", "Expand AI content & SEO")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attribution */}
        <TabsContent value="attribution" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t("channel_campaign_attribution", "📲 Channel & Campaign Attribution")}</h2>
            <p className="text-muted-foreground mb-6">{t("understand_which_channels_drive", "Understand which channels drive conversions")}</p>
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
              <CardTitle>{t("attribution_insights", "Attribution Insights")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Use attribution mix for <strong>{t("budget_allocation_decisions", "budget allocation decisions")}</strong></p>
              <p>• <strong>{t("sessionsql_lag_gt_72h", "Session→SQL lag &gt; 72h:")}</strong>{t("implement_remarketing_or_chatbot", "Implement remarketing or chatbot outreach")}</p>
              <p>{t("high_referral_double_down", "• High referral %: Double down on partnership programs")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights */}
        <TabsContent value="ai_insights" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t("aidriven_ux_content_insights", "🧪 AI-Driven UX & Content Insights")}</h2>
            <p className="text-muted-foreground mb-6">{t("gpt4o_powered_content_analysis", "GPT-4o powered content analysis")}</p>
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
              <CardTitle>{t("content_optimization", "Content Optimization")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>{t("clarity_lt_6", "Clarity &lt; 6:")}</strong>{t("simplify_paragraphs_flagged_as", "Simplify paragraphs flagged as complex")}</p>
              <p>• <strong>{t("high_negative_sentiment", "High negative sentiment:")}</strong>{t("ab_test_alternative_headlines", "A/B test alternative headlines")}</p>
              <p>• <strong>{t("heat_trigger_lt_03", "Heat Trigger &lt; 0.3:")}</strong>{t("switch_images_or_ctas", "Switch images or CTAs to boost engagement")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention */}
        <TabsContent value="retention" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t("retention_reengagement", "🔁 Retention & Re-Engagement")}</h2>
            <p className="text-muted-foreground mb-6">{t("keep_visitors_coming_back", "Keep visitors coming back")}</p>
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
              <CardTitle>{t("retention_strategies", "Retention Strategies")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>{t("returning_visitors_lt_20", "Returning visitors &lt; 20%:")}</strong>{t("deploy_emaillinkedin_retargeting", "Deploy email/LinkedIn retargeting")}</p>
              <p>• <strong>{t("low_retarget_cr", "Low retarget CR:")}</strong>{t("optimize_audiences_and_hook", "Optimize audiences and hook copy")}</p>
              <p>{t("grow_firstparty_audience_via", "• Grow first-party audience via gated incentives or lead magnets")}</p>
              <p>{t("users_scrolling_but_not", "• Users scrolling but not clicking? Add sticky CTA or floating footer")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Signals */}
        <TabsContent value="google_signals" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">{t("googlespecific_strategic_signals", "🎯 Google-Specific Strategic Signals")}</h2>
            <p className="text-muted-foreground mb-6">{t("google_growth_partner_level", "Google Growth Partner level metrics")}</p>
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
              <CardTitle>{t("google_performance_targets", "Google Performance Targets")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-sm">
                  <p>• <strong>{t("branded_ctr_target", "Branded CTR target:")}</strong>{t("gt25_signals_trust", "&gt;2.5% (signals trust)")}</p>
                  <p>• <strong>{t("nonbranded_ctr_target", "Non-Branded CTR target:")}</strong>{t("gt15_signals_relevance", "&gt;1.5% (signals relevance)")}</p>
                  <p>• <strong>{t("gclid_capture", "GCLID Capture:")}</strong>{t("95_of_paid_sessions", "≥95% of paid sessions")}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p>• <strong>{t("offline_conversion_api", "Offline Conversion API:")}</strong>{t("48h_return", "≤48h return")}</p>
                  <p>• <strong>{t("cwv_pass", "CWV Pass:")}</strong>{t("100_pages_passing", "100% pages passing")}</p>
                  <p>• <strong>{t("sqls_from_search", "SQLs from Search:")}</strong>{t("15mo_milestone", "+15/mo milestone")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}