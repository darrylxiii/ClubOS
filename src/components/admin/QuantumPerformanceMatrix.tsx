import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, CheckCircle, TrendingUp, TrendingDown, Minus, Users, Target, 
  DollarSign, Star, BarChart3, RefreshCw, Award, Percent,
  Timer, Briefcase, Heart, Gauge, Wallet
} from 'lucide-react';
import { useKPIMetrics, useRefreshKPIs, type KPIMetric } from '@/hooks/useQuantumKPIs';
import { toast } from 'sonner';

interface KPICardProps {
  name: string;
  value: number;
  label: string;
  icon: React.ReactNode;
  format?: 'number' | 'percent' | 'currency' | 'hours' | 'days';
  trend?: { direction: 'up' | 'down' | 'stable'; percent: number };
  description?: string;
  target?: number;
}

const KPICard = ({ name, value, label, icon, format = 'number', trend, description, target }: KPICardProps) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percent': return `${val.toFixed(1)}%`;
      case 'currency': return `€${val.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case 'hours': return `${val.toFixed(1)}h`;
      case 'days': return `${val.toFixed(1)} days`;
      default: return val.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend.direction === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{formatValue(value)}</div>
          {trend && (
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon()}
              <span className={trend.direction === 'up' ? 'text-green-500' : trend.direction === 'down' ? 'text-red-500' : 'text-muted-foreground'}>
                {trend.percent.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {target && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Target: {formatValue(target)}</span>
              <span>{Math.min(100, (value / target) * 100).toFixed(0)}%</span>
            </div>
            <Progress value={Math.min(100, (value / target) * 100)} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const getKPIValue = (metrics: KPIMetric[], kpiName: string): number => {
  const metric = metrics.find(m => m.kpi_name === kpiName);
  return metric?.value || 0;
};

const WorkforceTab = ({ metrics }: { metrics: KPIMetric[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICard 
      name="hours_worked" 
      value={getKPIValue(metrics, 'hours_worked')} 
      label="Hours Worked" 
      icon={<Clock className="h-4 w-4" />} 
      format="hours"
      description="Total tracked hours this period"
    />
    <KPICard 
      name="tasks_completed" 
      value={getKPIValue(metrics, 'tasks_completed')} 
      label="Tasks Completed" 
      icon={<CheckCircle className="h-4 w-4" />}
      description="Count of completed tasks"
    />
    <KPICard 
      name="task_completion_pct" 
      value={getKPIValue(metrics, 'task_completion_pct')} 
      label="Task Completion %" 
      icon={<Target className="h-4 w-4" />} 
      format="percent"
      target={80}
      description="Completed ÷ Assigned"
    />
    <KPICard 
      name="tasks_per_hour" 
      value={getKPIValue(metrics, 'tasks_per_hour')} 
      label="Tasks per Hour" 
      icon={<Gauge className="h-4 w-4" />}
      description="Productivity rate"
    />
    <KPICard 
      name="productivity_index" 
      value={getKPIValue(metrics, 'productivity_index')} 
      label="Productivity Index" 
      icon={<BarChart3 className="h-4 w-4" />}
      description="Tasks/Hour × Completion %"
    />
  </div>
);

const PipelineTab = ({ metrics }: { metrics: KPIMetric[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICard 
      name="pipelines_open" 
      value={getKPIValue(metrics, 'pipelines_open')} 
      label="Pipelines Open" 
      icon={<Briefcase className="h-4 w-4" />}
      description="Active job pipelines"
    />
    <KPICard 
      name="pipelines_closed" 
      value={getKPIValue(metrics, 'pipelines_closed')} 
      label="Pipelines Closed (Won)" 
      icon={<CheckCircle className="h-4 w-4" />}
      description="Successfully filled positions"
    />
    <KPICard 
      name="pipelines_lost" 
      value={getKPIValue(metrics, 'pipelines_lost')} 
      label="Pipelines Lost" 
      icon={<TrendingDown className="h-4 w-4" />}
      description="Lost or cancelled"
    />
    <KPICard 
      name="pipeline_win_rate" 
      value={getKPIValue(metrics, 'pipeline_win_rate')} 
      label="Win Rate" 
      icon={<Award className="h-4 w-4" />} 
      format="percent"
      target={60}
      description="Won ÷ (Won + Lost)"
    />
    <KPICard 
      name="avg_deal_size" 
      value={getKPIValue(metrics, 'avg_deal_size')} 
      label="Avg Deal Size" 
      icon={<DollarSign className="h-4 w-4" />} 
      format="currency"
      description="Revenue per closed position"
    />
  </div>
);

const RecruitmentTab = ({ metrics }: { metrics: KPIMetric[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <KPICard 
      name="cto_score" 
      value={getKPIValue(metrics, 'cto_score')} 
      label="CTO Score" 
      icon={<Target className="h-4 w-4" />} 
      format="percent"
      description="Offers ÷ Shortlisted candidates"
    />
    <KPICard 
      name="avg_time_to_hire" 
      value={getKPIValue(metrics, 'avg_time_to_hire')} 
      label="Avg Time to Hire" 
      icon={<Timer className="h-4 w-4" />} 
      format="days"
      description="Requisition open → hire"
    />
    <KPICard 
      name="candidate_meetings" 
      value={getKPIValue(metrics, 'candidate_meetings')} 
      label="Candidate Meetings" 
      icon={<Users className="h-4 w-4" />}
      description="Interview calls this period"
    />
    <KPICard 
      name="client_meetings" 
      value={getKPIValue(metrics, 'client_meetings')} 
      label="Client Meetings" 
      icon={<Briefcase className="h-4 w-4" />}
      description="Discovery / status calls"
    />
    <KPICard 
      name="meeting_to_offer_ratio" 
      value={getKPIValue(metrics, 'meeting_to_offer_ratio')} 
      label="Meeting-to-Offer Ratio" 
      icon={<Percent className="h-4 w-4" />} 
      format="percent"
      description="Offers ÷ Total Meetings"
    />
    <KPICard 
      name="hours_per_placement" 
      value={getKPIValue(metrics, 'hours_per_placement')} 
      label="Hours per Placement" 
      icon={<Clock className="h-4 w-4" />} 
      format="hours"
      description="True efficiency measure"
    />
  </div>
);

const ExperienceTab = ({ metrics }: { metrics: KPIMetric[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICard 
      name="nps_candidate" 
      value={getKPIValue(metrics, 'nps_candidate')} 
      label="NPS Candidate Score" 
      icon={<Heart className="h-4 w-4" />}
      description="Promoters – Detractors"
    />
    <KPICard 
      name="nps_client" 
      value={getKPIValue(metrics, 'nps_client')} 
      label="NPS Client Score" 
      icon={<Star className="h-4 w-4" />}
      description="Partner satisfaction"
    />
    <KPICard 
      name="avg_csat" 
      value={getKPIValue(metrics, 'avg_csat')} 
      label="Avg CSAT Score" 
      icon={<Star className="h-4 w-4" />}
      target={4.5}
      description="1-5 at key milestones"
    />
    <KPICard 
      name="referral_rate" 
      value={getKPIValue(metrics, 'referral_rate')} 
      label="Referral Rate" 
      icon={<Users className="h-4 w-4" />} 
      format="percent"
      description="Referral leads ÷ total"
    />
  </div>
);

const UtilisationTab = ({ metrics }: { metrics: KPIMetric[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <KPICard 
      name="capacity_load" 
      value={getKPIValue(metrics, 'capacity_load')} 
      label="Capacity Load" 
      icon={<Gauge className="h-4 w-4" />} 
      format="percent"
      target={85}
      description="Scheduled ÷ 40h"
    />
    <KPICard 
      name="idle_time_pct" 
      value={getKPIValue(metrics, 'idle_time_pct')} 
      label="Idle Time %" 
      icon={<Clock className="h-4 w-4" />} 
      format="percent"
      description="Idle ÷ tracked time"
    />
  </div>
);

const FinancialTab = ({ metrics }: { metrics: KPIMetric[] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <KPICard 
      name="revenue_per_billable_hour" 
      value={getKPIValue(metrics, 'revenue_per_billable_hour')} 
      label="Revenue per Billable Hour" 
      icon={<DollarSign className="h-4 w-4" />} 
      format="currency"
      description="Net rev ÷ billable hrs"
    />
    <KPICard 
      name="bonus_earned" 
      value={getKPIValue(metrics, 'bonus_earned')} 
      label="Bonus Earned" 
      icon={<Award className="h-4 w-4" />} 
      format="currency"
      description="Total bonus logged"
    />
    <KPICard 
      name="bonus_pct_of_revenue" 
      value={getKPIValue(metrics, 'bonus_pct_of_revenue')} 
      label="Bonus % of Revenue" 
      icon={<Percent className="h-4 w-4" />} 
      format="percent"
      description="Comp leverage check"
    />
    <KPICard 
      name="cost_per_placement" 
      value={getKPIValue(metrics, 'cost_per_placement')} 
      label="Cost per Placement" 
      icon={<Wallet className="h-4 w-4" />} 
      format="currency"
      description="Direct costs ÷ placements"
    />
  </div>
);

export const QuantumPerformanceMatrix = () => {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const { data: metrics, isLoading, error } = useKPIMetrics(period);
  const refreshKPIs = useRefreshKPIs();

  const handleRefresh = async () => {
    try {
      await refreshKPIs.mutateAsync(period);
      toast.success('KPI metrics refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh KPI metrics');
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Error loading KPI metrics</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quantum Performance Matrix 360</h1>
          <p className="text-muted-foreground">
            Unified KPI stack fusing productivity, pipeline health and experience scores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button 
              variant={period === 'weekly' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setPeriod('weekly')}
            >
              Weekly
            </Button>
            <Button 
              variant={period === 'monthly' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshKPIs.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshKPIs.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="workforce" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
            <TabsTrigger value="workforce" className="flex items-center gap-2 py-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Workforce</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2 py-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="flex items-center gap-2 py-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Recruitment</span>
            </TabsTrigger>
            <TabsTrigger value="experience" className="flex items-center gap-2 py-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Experience</span>
            </TabsTrigger>
            <TabsTrigger value="utilisation" className="flex items-center gap-2 py-2">
              <Gauge className="h-4 w-4" />
              <span className="hidden sm:inline">Utilisation</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2 py-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workforce">
            <WorkforceTab metrics={metrics?.workforce || []} />
          </TabsContent>
          <TabsContent value="pipeline">
            <PipelineTab metrics={metrics?.pipeline || []} />
          </TabsContent>
          <TabsContent value="recruitment">
            <RecruitmentTab metrics={metrics?.recruitment || []} />
          </TabsContent>
          <TabsContent value="experience">
            <ExperienceTab metrics={metrics?.experience || []} />
          </TabsContent>
          <TabsContent value="utilisation">
            <UtilisationTab metrics={metrics?.utilisation || []} />
          </TabsContent>
          <TabsContent value="financial">
            <FinancialTab metrics={metrics?.financial || []} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default QuantumPerformanceMatrix;
