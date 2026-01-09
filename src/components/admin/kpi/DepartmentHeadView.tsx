import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  UserCheck
} from 'lucide-react';
import { KPIRadarChart } from './KPIRadarChart';
import { KPIHeatMap } from './KPIHeatMap';
import { InteractiveSparkline } from './InteractiveSparkline';
import type { UnifiedKPI, DomainHealth, KPIDomain } from '@/hooks/useUnifiedKPIs';

interface DepartmentHeadViewProps {
  allKPIs: UnifiedKPI[];
  domainHealth: DomainHealth[];
  selectedDomain?: KPIDomain;
  onDomainChange?: (domain: KPIDomain) => void;
  onKPIClick?: (kpi: UnifiedKPI) => void;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  kpiPerformance: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  topKPIs: { name: string; value: number; status: 'success' | 'warning' | 'critical' }[];
}

// Mock team data - in production this would come from the database
const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Senior Recruiter',
    kpiPerformance: 94,
    trend: 'up',
    trendValue: 12,
    topKPIs: [
      { name: 'Placements', value: 8, status: 'success' },
      { name: 'Time to Hire', value: 21, status: 'success' },
      { name: 'Client NPS', value: 85, status: 'success' },
    ],
  },
  {
    id: '2',
    name: 'Marcus Johnson',
    role: 'Recruiter',
    kpiPerformance: 78,
    trend: 'up',
    trendValue: 5,
    topKPIs: [
      { name: 'Placements', value: 5, status: 'warning' },
      { name: 'Time to Hire', value: 28, status: 'warning' },
      { name: 'Client NPS', value: 72, status: 'success' },
    ],
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Junior Recruiter',
    kpiPerformance: 65,
    trend: 'down',
    trendValue: 3,
    topKPIs: [
      { name: 'Placements', value: 3, status: 'critical' },
      { name: 'Time to Hire', value: 35, status: 'critical' },
      { name: 'Client NPS', value: 68, status: 'warning' },
    ],
  },
  {
    id: '4',
    name: 'David Kim',
    role: 'Senior Recruiter',
    kpiPerformance: 88,
    trend: 'stable',
    trendValue: 0,
    topKPIs: [
      { name: 'Placements', value: 7, status: 'success' },
      { name: 'Time to Hire', value: 24, status: 'success' },
      { name: 'Client NPS', value: 80, status: 'success' },
    ],
  },
];

export function DepartmentHeadView({
  allKPIs,
  domainHealth,
  selectedDomain = 'operations',
  onDomainChange,
  onKPIClick,
}: DepartmentHeadViewProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [viewTab, setViewTab] = useState<'team' | 'comparison' | 'trends'>('team');

  // Filter KPIs by selected domain
  const domainKPIs = useMemo(() => 
    allKPIs.filter(k => k.domain === selectedDomain),
    [allKPIs, selectedDomain]
  );

  // Calculate domain statistics
  const domainStats = useMemo(() => {
    const health = domainHealth.find(d => d.domain === selectedDomain);
    return {
      healthScore: health?.healthScore || 0,
      totalKPIs: health?.totalKPIs || 0,
      onTarget: health?.onTarget || 0,
      warnings: health?.warnings || 0,
      critical: health?.critical || 0,
    };
  }, [domainHealth, selectedDomain]);

  // Top performers and underperformers
  const { topPerformers, needsAttention } = useMemo(() => {
    const sorted = [...domainKPIs].sort((a, b) => {
      // Success > warning > critical
      const statusOrder = { success: 0, warning: 1, critical: 2, neutral: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    return {
      topPerformers: sorted.slice(0, 5),
      needsAttention: sorted.filter(k => k.status === 'critical' || k.status === 'warning').slice(0, 5),
    };
  }, [domainKPIs]);

  // Team performance summary
  const teamSummary = useMemo(() => {
    const avgPerformance = mockTeamMembers.reduce((sum, m) => sum + m.kpiPerformance, 0) / mockTeamMembers.length;
    const improving = mockTeamMembers.filter(m => m.trend === 'up').length;
    const declining = mockTeamMembers.filter(m => m.trend === 'down').length;
    
    return { avgPerformance, improving, declining, total: mockTeamMembers.length };
  }, []);

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Department Performance
          </h2>
          <p className="text-sm text-muted-foreground">
            Team metrics and individual performance tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedDomain} onValueChange={(v) => onDomainChange?.(v as KPIDomain)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Department Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Department Health</p>
                <p className="text-2xl font-bold">{domainStats.healthScore.toFixed(0)}%</p>
              </div>
              <div className={cn(
                "p-2 rounded-full",
                domainStats.healthScore >= 80 ? "bg-emerald-500/10" :
                domainStats.healthScore >= 60 ? "bg-amber-500/10" : "bg-rose-500/10"
              )}>
                <Target className={cn(
                  "h-5 w-5",
                  domainStats.healthScore >= 80 ? "text-emerald-500" :
                  domainStats.healthScore >= 60 ? "text-amber-500" : "text-rose-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Team Avg Performance</p>
                <p className="text-2xl font-bold">{teamSummary.avgPerformance.toFixed(0)}%</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Improving</p>
                <p className="text-2xl font-bold text-emerald-500">{teamSummary.improving}</p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
                <p className="text-2xl font-bold text-rose-500">{teamSummary.declining}</p>
              </div>
              <ArrowDownRight className="h-5 w-5 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as typeof viewTab)}>
        <TabsList>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Comparison
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-4 space-y-4">
          {/* Team Member Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockTeamMembers.map(member => (
              <Card key={member.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {member.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : member.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-rose-500" />
                      ) : null}
                      <span className={cn(
                        member.trend === 'up' ? 'text-emerald-500' :
                        member.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground'
                      )}>
                        {member.trendValue > 0 ? '+' : ''}{member.trendValue}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Overall Performance</span>
                      <span className="font-medium">{member.kpiPerformance}%</span>
                    </div>
                    <Progress 
                      value={member.kpiPerformance} 
                      className={cn(
                        "h-2",
                        member.kpiPerformance >= 80 ? "[&>div]:bg-emerald-500" :
                        member.kpiPerformance >= 60 ? "[&>div]:bg-amber-500" : "[&>div]:bg-rose-500"
                      )}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.topKPIs.map((kpi, i) => (
                      <Badge 
                        key={i}
                        variant={kpi.status === 'success' ? 'default' : kpi.status === 'warning' ? 'secondary' : 'destructive'}
                        className="text-[10px]"
                      >
                        {kpi.name}: {kpi.value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KPIRadarChart domainHealth={domainHealth} size={300} />
            <KPIHeatMap kpis={domainKPIs} groupBy="category" onCellClick={onKPIClick} />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topPerformers.map(kpi => (
              <Card key={kpi.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => onKPIClick?.(kpi)}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{kpi.displayName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{kpi.category.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant={kpi.status === 'success' ? 'default' : kpi.status === 'warning' ? 'secondary' : 'destructive'}>
                      {kpi.status}
                    </Badge>
                  </div>
                  <InteractiveSparkline kpi={kpi} width={200} height={50} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Needs Attention Section */}
      {needsAttention.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Needs Attention
            </CardTitle>
            <CardDescription>KPIs requiring immediate focus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {needsAttention.map(kpi => (
                <div 
                  key={kpi.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => onKPIClick?.(kpi)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      kpi.status === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
                    )} />
                    <div>
                      <p className="text-sm font-medium">{kpi.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        Current: {kpi.value.toLocaleString()}{kpi.unit || ''}
                        {kpi.targetValue && ` | Target: ${kpi.targetValue.toLocaleString()}${kpi.unit || ''}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={kpi.status === 'critical' ? 'destructive' : 'secondary'}>
                    {kpi.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
