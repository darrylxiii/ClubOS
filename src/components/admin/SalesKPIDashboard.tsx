import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Phone, 
  FileText, 
  DollarSign, 
  Bot, 
  Heart, 
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  Target
} from 'lucide-react';
import { useGroupedSalesKPIs, useCalculateSalesKPIs, SalesKPI } from '@/hooks/useSalesKPIs';
import { toast } from 'sonner';

const categoryConfig = {
  conversational: { icon: MessageSquare, label: 'Conversational', color: 'text-blue-500' },
  meetings: { icon: Phone, label: 'Meetings & Calls', color: 'text-green-500' },
  proposals: { icon: FileText, label: 'Proposals', color: 'text-purple-500' },
  closing: { icon: DollarSign, label: 'Closing', color: 'text-amber-500' },
  ai_efficiency: { icon: Bot, label: 'AI Efficiency', color: 'text-cyan-500' },
  quality: { icon: Heart, label: 'Quality & Sentiment', color: 'text-pink-500' },
  forecasting: { icon: TrendingUp, label: 'Forecasting', color: 'text-orange-500' },
};

const kpiLabels: Record<string, string> = {
  initial_conversations: 'Initial Conversations',
  qualified_conversations: 'Qualified Conversations',
  qualification_rate: 'Qualification Rate',
  call_scheduled_per_100: 'Call Scheduled Rate',
  referral_rate: 'Referral Rate',
  channel_breakdown: 'Channel Breakdown',
  discovery_calls_held: 'Discovery Calls Held',
  show_rate: 'Show Rate',
  no_shows: 'No Shows',
  avg_call_duration: 'Avg Call Duration',
  next_step_rate: 'Next Step Rate',
  proposals_sent: 'Proposals Sent',
  proposal_close_ratio: 'Close Ratio',
  avg_proposal_value: 'Avg Proposal Value',
  total_pipeline_value: 'Total Pipeline Value',
  scope_change_frequency: 'Scope Change Rate',
  deals_closed_won: 'Deals Closed (Won)',
  win_rate: 'Win Rate',
  churned_deals: 'Churned Deals',
  loss_reasons_breakdown: 'Loss Reasons',
  total_revenue: 'Total Revenue',
  ai_messages_sent: 'AI Messages Sent',
  ai_reply_rate: 'AI Reply Rate',
  ai_draft_success_rate: 'Draft Success Rate',
  ai_calls_booked: 'AI Calls Booked',
  total_ai_usage: 'Total AI Usage',
  lead_sentiment_score: 'Lead Sentiment',
  avg_intent_score: 'Avg Intent Score',
  conversation_velocity: 'Conversation Velocity',
  post_call_satisfaction: 'Post-Call Satisfaction',
  weighted_pipeline_value: 'Weighted Pipeline',
  slipping_deals: 'Slipping Deals',
  pipeline_coverage_ratio: 'Pipeline Coverage',
  avg_forecast_confidence: 'Forecast Confidence',
};

function formatValue(kpi: SalesKPI): string {
  const name = kpi.kpi_name;
  const value = kpi.value;
  
  if (name.includes('rate') || name.includes('ratio') || name === 'win_rate') {
    return `${value}%`;
  }
  if (name.includes('value') || name.includes('revenue') || name === 'avg_proposal_value') {
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }
  if (name.includes('duration')) {
    return `${value} min`;
  }
  if (name === 'lead_sentiment_score') {
    return value.toFixed(2);
  }
  return value.toLocaleString();
}

function TrendIndicator({ kpi }: { kpi: SalesKPI }) {
  if (!kpi.trend_direction || kpi.trend_direction === 'stable') {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  if (kpi.trend_direction === 'up') {
    return (
      <div className="flex items-center text-green-500">
        <ArrowUpRight className="h-4 w-4" />
        <span className="text-xs">{kpi.trend_percentage}%</span>
      </div>
    );
  }
  return (
    <div className="flex items-center text-red-500">
      <ArrowDownRight className="h-4 w-4" />
      <span className="text-xs">{kpi.trend_percentage}%</span>
    </div>
  );
}

function StatusBadge({ kpi }: { kpi: SalesKPI }) {
  const value = kpi.value;
  const warning = kpi.threshold_warning;
  const critical = kpi.threshold_critical;
  const target = kpi.target_value;
  
  // For metrics where lower is better (slipping deals, churned deals)
  const lowerIsBetter = ['slipping_deals', 'churned_deals', 'no_shows', 'scope_change_frequency'].includes(kpi.kpi_name);
  
  if (critical !== undefined && critical !== null) {
    if (lowerIsBetter ? value >= critical : value <= critical) {
      return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Critical</Badge>;
    }
  }
  if (warning !== undefined && warning !== null) {
    if (lowerIsBetter ? value >= warning : value <= warning) {
      return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
    }
  }
  if (target !== undefined && target !== null) {
    if (lowerIsBetter ? value <= target : value >= target) {
      return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />On Target</Badge>;
    }
  }
  return null;
}

function KPICard({ kpi }: { kpi: SalesKPI }) {
  const hasBreakdown = kpi.breakdown && Object.keys(kpi.breakdown).length > 0;
  
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {kpiLabels[kpi.kpi_name] || kpi.kpi_name}
          </CardTitle>
          <StatusBadge kpi={kpi} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold">{formatValue(kpi)}</p>
            {kpi.target_value !== undefined && kpi.target_value !== null && (
              <p className="text-xs text-muted-foreground">
                Target: {kpi.kpi_name.includes('value') || kpi.kpi_name.includes('revenue') 
                  ? new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(kpi.target_value)
                  : kpi.kpi_name.includes('rate') || kpi.kpi_name.includes('ratio') 
                    ? `${kpi.target_value}%` 
                    : kpi.target_value}
              </p>
            )}
          </div>
          <TrendIndicator kpi={kpi} />
        </div>
        {kpi.target_value !== undefined && kpi.target_value !== null && (
          <Progress 
            value={Math.min((kpi.value / kpi.target_value) * 100, 100)} 
            className="h-1 mt-3"
          />
        )}
        {hasBreakdown && (
          <div className="mt-3 space-y-1">
            {Object.entries(kpi.breakdown!).slice(0, 4).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium">{val as number}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryTab({ category, kpis }: { category: string; kpis: SalesKPI[] }) {
  const config = categoryConfig[category as keyof typeof categoryConfig];
  const Icon = config?.icon || MessageSquare;
  
  if (!kpis || kpis.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No {config?.label || category} KPIs calculated yet</p>
        <p className="text-sm">Run the calculation to generate metrics</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.id || kpi.kpi_name} kpi={kpi} />
      ))}
    </div>
  );
}

function OverviewStats({ kpis }: { kpis: Record<string, SalesKPI[]> | undefined }) {
  if (!kpis) return null;
  
  const getKPI = (category: string, name: string) => 
    kpis[category]?.find(k => k.kpi_name === name);
  
  const conversations = getKPI('conversational', 'initial_conversations')?.value || 0;
  const qualified = getKPI('conversational', 'qualified_conversations')?.value || 0;
  const meetings = getKPI('meetings', 'discovery_calls_held')?.value || 0;
  const proposals = getKPI('proposals', 'proposals_sent')?.value || 0;
  const closed = getKPI('closing', 'deals_closed_won')?.value || 0;
  const revenue = getKPI('closing', 'total_revenue')?.value || 0;
  
  const conversionRates = [
    { from: 'Conversations', to: 'Qualified', rate: conversations ? (qualified / conversations * 100) : 0 },
    { from: 'Qualified', to: 'Meetings', rate: qualified ? (meetings / qualified * 100) : 0 },
    { from: 'Meetings', to: 'Proposals', rate: meetings ? (proposals / meetings * 100) : 0 },
    { from: 'Proposals', to: 'Closed', rate: proposals ? (closed / proposals * 100) : 0 },
  ];
  
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Conversations</span>
            </div>
            <p className="text-2xl font-bold mt-1">{conversations}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Qualified</span>
            </div>
            <p className="text-2xl font-bold mt-1">{qualified}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Meetings</span>
            </div>
            <p className="text-2xl font-bold mt-1">{meetings}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Proposals</span>
            </div>
            <p className="text-2xl font-bold mt-1">{proposals}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Closed Won</span>
            </div>
            <p className="text-2xl font-bold mt-1">{closed}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(revenue)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales Funnel Conversion</CardTitle>
          <CardDescription>Stage-to-stage conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {conversionRates.map((stage, idx) => (
              <React.Fragment key={stage.from}>
                <div className="flex-1 text-center">
                  <p className="text-xs text-muted-foreground">{stage.from}</p>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min(stage.rate, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-sm font-medium">{stage.rate.toFixed(1)}%</p>
                </div>
                {idx < conversionRates.length - 1 && (
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground rotate-45 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SalesKPIDashboard() {
  const [periodType, setPeriodType] = useState('daily');
  const { data: groupedKpis, isLoading, refetch } = useGroupedSalesKPIs(periodType);
  const calculateKpis = useCalculateSalesKPIs();
  
  const handleCalculate = async () => {
    try {
      await calculateKpis.mutateAsync({ period_type: periodType });
      toast.success('Sales KPIs calculated successfully');
      refetch();
    } catch (error) {
      toast.error('Failed to calculate KPIs');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales KPI Dashboard</h1>
          <p className="text-muted-foreground">Track conversion metrics from conversation to cash</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleCalculate}
            disabled={calculateKpis.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${calculateKpis.isPending ? 'animate-spin' : ''}`} />
            Calculate
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          {Object.entries(categoryConfig).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-2">
              <config.icon className={`h-4 w-4 ${config.color}`} />
              <span className="hidden sm:inline">{config.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="overview">
              <OverviewStats kpis={groupedKpis} />
            </TabsContent>
            {Object.keys(categoryConfig).map((category) => (
              <TabsContent key={category} value={category}>
                <CategoryTab category={category} kpis={groupedKpis?.[category] || []} />
              </TabsContent>
            ))}
          </>
        )}
      </Tabs>
    </div>
  );
}