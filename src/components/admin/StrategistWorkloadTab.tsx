import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStrategistWorkload, type Period, type StrategistWorkload } from "@/hooks/useStrategistWorkload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Briefcase, Loader2, AlertTriangle, CheckCircle, Trophy, DollarSign, Activity, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type SortKey = 'performanceScore' | 'placements' | 'revenue' | 'candidatesSourced' | 'pipelineActions' | 'capacityPercent';

const RANK_COLORS = ["bg-amber-500", "bg-slate-400", "bg-orange-700"];

const formatRevenue = (amount: number) => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
};

export function StrategistWorkloadTab() {
  const { t } = useTranslation('common');
  const [period, setPeriod] = useState<Period>('monthly');
  const [sortKey, setSortKey] = useState<SortKey>('performanceScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { data: workloads, isLoading, error } = useStrategistWorkload(period);

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="text-center py-12 text-destructive">Failed to load workload data</div>;

  const getCapacityColor = (p: number) => p >= 90 ? 'text-destructive' : p >= 70 ? 'text-warning' : 'text-success';
  const getCapacityBadge = (p: number) => {
    if (p >= 90) return { label: 'At Capacity', variant: 'destructive' as const, icon: AlertTriangle };
    if (p >= 70) return { label: 'High Load', variant: 'secondary' as const, icon: AlertTriangle };
    return { label: 'Available', variant: 'outline' as const, icon: CheckCircle };
  };

  const sorted = [...(workloads || [])].sort((a, b) => {
    const aVal = a[sortKey] as number; const bVal = b[sortKey] as number;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const totals = sorted.reduce((acc, w) => ({
    companies: acc.companies + w.companyCount, candidates: acc.candidates + w.candidateCount,
    pipelines: acc.pipelines + w.activePipelines, placements: acc.placements + w.placements,
    revenue: acc.revenue + w.revenue, actions: acc.actions + w.pipelineActions,
  }), { companies: 0, candidates: 0, pipelines: 0, placements: 0, revenue: 0, actions: 0 });

  const periodLabel = period === 'weekly' ? 'this week' : period === 'monthly' ? 'this month' : period === 'quarterly' ? 'this quarter' : 'this year';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Team Performance</h3>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="annual">Annual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard icon={Building2} iconColor="text-blue-500" value={totals.companies} label="Total Companies" subtitle={`across ${sorted.length} strategists`} />
        <SummaryCard icon={Users} iconColor="text-violet-500" value={totals.candidates} label="Total Candidates" subtitle="assigned to strategists" />
        <SummaryCard icon={Briefcase} iconColor="text-cyan-500" value={totals.pipelines} label="Active Pipelines" subtitle="jobs being worked" />
        <SummaryCard icon={Trophy} iconColor="text-amber-500" value={totals.placements} label="Placements" subtitle={periodLabel} />
        <SummaryCard icon={DollarSign} iconColor="text-emerald-500" value={formatRevenue(totals.revenue)} label="Revenue" subtitle={periodLabel} />
        <SummaryCard icon={Activity} iconColor="text-rose-500" value={totals.actions} label="Pipeline Actions" subtitle="last 7 days" />
      </div>

      <div className="hidden md:flex items-center gap-2 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
        <div className="flex-1 min-w-0">Strategist</div>
        {(['performanceScore', 'placements', 'revenue', 'candidatesSourced', 'pipelineActions', 'capacityPercent'] as SortKey[]).map(key => (
          <button key={key} onClick={() => toggleSort(key)} className={cn("flex items-center gap-0.5 w-16 justify-center cursor-pointer hover:text-foreground transition-colors", sortKey === key && "text-primary")}>
            {key === 'performanceScore' ? 'Score' : key === 'placements' ? 'Placed' : key === 'revenue' ? 'Revenue' : key === 'candidatesSourced' ? 'Sourced' : key === 'pipelineActions' ? 'Actions' : 'Capacity'}
            {sortKey === key ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : <ArrowUpDown className="h-2.5 w-2.5 opacity-40" />}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map(strategist => {
          const cap = getCapacityBadge(strategist.capacityPercent);
          const CapIcon = cap.icon;
          const ri = strategist.rank - 1;
          return (
            <div key={strategist.id} className="flex flex-wrap md:flex-nowrap items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
              <div className="relative shrink-0">
                {ri < 3 && <div className={cn("absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center z-10 shadow", RANK_COLORS[ri])}><span className="text-[8px] font-bold text-white">#{strategist.rank}</span></div>}
                <Avatar className="h-12 w-12"><AvatarImage src={strategist.avatar_url || undefined} /><AvatarFallback>{strategist.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium truncate">{strategist.full_name}</p>
                  <Badge variant={cap.variant} className="text-[10px] px-1.5 py-0 h-5"><CapIcon className="h-3 w-3 mr-0.5" />{cap.label}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {strategist.title && <span>{strategist.title}</span>}
                  {strategist.title && strategist.lastActiveAt && <span className="text-border">|</span>}
                  {strategist.lastActiveAt && <span className="text-muted-foreground/60">Active {formatDistanceToNow(new Date(strategist.lastActiveAt), { addSuffix: false })} ago</span>}
                </div>
              </div>
              {/* Mobile compact stats */}
              <div className="flex md:hidden items-center gap-3 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-primary">{strategist.placements}</p>
                  <p className="text-[10px] text-muted-foreground">Placed</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-primary">{formatRevenue(strategist.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4 text-sm">
                {[{ v: strategist.companyCount, l: 'Companies' }, { v: strategist.candidateCount, l: 'Candidates' }, { v: strategist.activePipelines, l: 'Pipelines' }, { v: strategist.candidatesSourced, l: 'Sourced' }, { v: strategist.placements, l: 'Placed', h: true }, { v: formatRevenue(strategist.revenue), l: 'Revenue', h: true }].map(s => (
                  <div key={s.l} className="text-center min-w-[52px]"><p className={cn("font-semibold tabular-nums", s.h && "text-primary")}>{s.v}</p><p className="text-[10px] text-muted-foreground">{s.l}</p></div>
                ))}
              </div>
              <div className="w-full md:w-36 space-y-2">
                <div className="flex items-center justify-between text-xs"><span className="font-bold text-lg tabular-nums">{strategist.performanceScore}</span><span className="text-[10px] text-muted-foreground">/100</span></div>
                <div className="flex items-center justify-between text-[10px] mb-1"><span className="text-muted-foreground">Capacity</span><span className={getCapacityColor(strategist.capacityPercent)}>{strategist.capacityPercent}%</span></div>
                <Progress value={strategist.capacityPercent} className="h-1.5" />
                {strategist.target?.revenueTarget != null && strategist.target.revenueTarget > 0 && (
                  <div className="pt-1"><div className="flex items-center justify-between text-[9px] text-muted-foreground/70"><span>Revenue target</span><span>{Math.round((strategist.target.revenueAchieved / strategist.target.revenueTarget) * 100)}%</span></div><Progress value={Math.min(100, (strategist.target.revenueAchieved / strategist.target.revenueTarget) * 100)} className="h-1" /></div>
                )}
              </div>
            </div>
          );
        })}
        {(!workloads || workloads.length === 0) && <div className="text-center py-8 text-muted-foreground">No strategists found</div>}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, iconColor, value, label, subtitle }: { icon: React.ElementType; iconColor: string; value: string | number; label: string; subtitle: string }) {
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Icon className={cn("h-3.5 w-3.5", iconColor)} />{label}</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-2xl font-bold">{value}</p><p className="text-[10px] text-muted-foreground">{subtitle}</p></CardContent></Card>
  );
}
