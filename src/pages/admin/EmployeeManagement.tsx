import { useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllEmployees } from "@/hooks/useEmployeeProfile";
import { useTeamRevenue } from "@/hooks/useTeamRevenue";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/revenueCalculations";
import { format } from "date-fns";
import {
  Users, Trophy, Target, DollarSign, ClipboardCheck,
  LayoutDashboard, UserCog, BarChart3, Activity, Wallet,
  GraduationCap, TrendingUp, Download, Search,
} from "lucide-react";

import { useAdminRealtime } from "@/hooks/useAdminRealtime";
import { NeedsAttentionPanel } from "@/components/employees/NeedsAttentionPanel";
import { EmployeeProfileManager } from "@/components/employees/EmployeeProfileManager";
import { TeamOverviewDashboard } from "@/components/employees/TeamOverviewDashboard";
import { TeamPerformanceComparison } from "@/components/employees/TeamPerformanceComparison";
import { TeamCommissionsApproval } from "@/components/employees/TeamCommissionsApproval";
import { TargetManagementPanel } from "@/components/employees/TargetManagementPanel";
import { CommissionTierBuilder } from "@/components/employees/CommissionTierBuilder";
import { PayoutScheduler } from "@/components/employees/PayoutScheduler";
import { PerformanceReviewPanel } from "@/components/employees/PerformanceReviewPanel";
import { TrainingRecordsPanel } from "@/components/employees/TrainingRecordsPanel";
import { OnboardingChecklist } from "@/components/employees/OnboardingChecklist";
import { RecruiterProductivityPanel } from "@/components/employees/RecruiterProductivityPanel";

const TAB_MAP: Record<string, string> = {
  overview: 'overview', employees: 'employees', 'team-performance': 'team-performance',
  productivity: 'productivity', 'targets-commissions': 'targets-commissions', 'reviews-development': 'reviews-development',
};

export default function EmployeeManagement() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'overview';
  const [leaderboardSearch, setLeaderboardSearch] = useState("");

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'overview' ? {} : { tab: value }, { replace: true });
  };

  useAdminRealtime();

  const { data: employees } = useAllEmployees();
  const { data: teamRevenue, isLoading: revenueLoading } = useTeamRevenue();

  const { data: stats } = useQuery({
    queryKey: ['employee-management-stats'],
    queryFn: async () => {
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount, status')
        .in('status', ['pending', 'approved', 'paid']);
      const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0;
      const approved = commissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0;
      const paid = commissions?.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0;
      const { count: pendingReviews } = await supabase.from('performance_reviews').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      return { pending, approved, paid, pendingReviews: pendingReviews || 0 };
    },
  });

  const totalTeamRevenue = teamRevenue?.reduce((sum, m) => sum + m.revenue, 0) || 0;
  const totalDeals = teamRevenue?.reduce((sum, m) => sum + m.deals, 0) || 0;

  const filteredRevenue = leaderboardSearch.trim()
    ? teamRevenue?.filter(m => m.name.toLowerCase().includes(leaderboardSearch.toLowerCase()))
    : teamRevenue;

  const exportLeaderboardCSV = () => {
    if (!filteredRevenue?.length) return;
    const headers = "Rank,Name,Revenue,Deals\n";
    const rows = filteredRevenue.map((m, i) => `${i + 1},"${m.name}",${m.revenue},${m.deals}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `revenue-leaderboard-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RoleGate allowedRoles={['admin']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('employeeManagement.text2')}</h1>
          <p className="text-muted-foreground">{t('employeeManagement.desc')}</p>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Users} color="text-primary bg-primary/10" value={employees?.length || 0} label={t('employeeManagement.text3')} />
          <StatCard icon={TrendingUp} color="text-emerald-500 bg-emerald-500/10" value={formatCurrency(totalTeamRevenue)} label="Team Revenue YTD" />
          <StatCard icon={Trophy} color="text-cyan-500 bg-cyan-500/10" value={totalDeals} label="Total Placements" />
          <StatCard icon={DollarSign} color="text-amber-500 bg-amber-500/10" value={formatCurrency(stats?.pending || 0)} label={t('employeeManagement.text4')} />
          <StatCard icon={DollarSign} color="text-blue-500 bg-blue-500/10" value={formatCurrency(stats?.approved || 0)} label={t('employeeManagement.text5')} />
          <StatCard icon={ClipboardCheck} color="text-purple-500 bg-purple-500/10" value={stats?.pendingReviews || 0} label={t('employeeManagement.text7')} />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <ScrollArea className="w-full" type="scroll">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="overview" className="gap-1.5 text-xs"><LayoutDashboard className="h-4 w-4" />Overview</TabsTrigger>
              <TabsTrigger value="employees" className="gap-1.5 text-xs"><UserCog className="h-4 w-4" />{t('employeeManagement.text9')}</TabsTrigger>
              <TabsTrigger value="team-performance" className="gap-1.5 text-xs"><BarChart3 className="h-4 w-4" />Team Performance</TabsTrigger>
              <TabsTrigger value="productivity" className="gap-1.5 text-xs"><Activity className="h-4 w-4" />Productivity</TabsTrigger>
              <TabsTrigger value="targets-commissions" className="gap-1.5 text-xs"><Wallet className="h-4 w-4" />Targets & Commissions</TabsTrigger>
              <TabsTrigger value="reviews-development" className="gap-1.5 text-xs"><GraduationCap className="h-4 w-4" />Reviews & Development</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="overview" className="space-y-6">
            <NeedsAttentionPanel onTabChange={handleTabChange} />
            <Card>
              <div className="p-6 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-500" />Revenue Leaderboard</h3>
                  <p className="text-xs text-muted-foreground mt-1">Ranked by placement fee revenue (YTD)</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name..." value={leaderboardSearch} onChange={e => setLeaderboardSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                  </div>
                  <Button variant="outline" size="sm" onClick={exportLeaderboardCSV} disabled={!filteredRevenue?.length}><Download className="h-4 w-4 mr-1" />CSV</Button>
                </div>
              </div>
              <div className="px-6 pb-6">
                {revenueLoading ? (
                  <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
                ) : !filteredRevenue?.length ? (
                  <p className="text-muted-foreground text-center py-12">{leaderboardSearch.trim() ? `No results for "${leaderboardSearch}".` : "No revenue data yet."}</p>
                ) : (
                  <div className="space-y-2">
                    {filteredRevenue.map((member, index) => (
                      <button key={member.id} className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors w-full text-left" onClick={() => navigate(`/admin/employees/${member.id}`)}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                          {index === 0 ? <Trophy className="h-5 w-5 text-amber-500" /> :
                           index === 1 ? <span className="text-sm font-bold text-slate-400">2</span> :
                           index === 2 ? <span className="text-sm font-bold text-orange-600">3</span> :
                           <span className="text-sm font-bold text-muted-foreground">{index + 1}</span>}
                        </div>
                        <Avatar className="h-9 w-9"><AvatarImage src={member.avatarUrl} /><AvatarFallback className="text-xs">{member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{member.name}</p><p className="text-xs text-muted-foreground">{member.deals} deal{member.deals !== 1 ? 's' : ''}</p></div>
                        <div className="text-right"><p className="font-bold">{formatCurrency(member.revenue)}</p>{member.isCurrentUser && <Badge variant="secondary" className="text-[10px]">You</Badge>}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="employees"><EmployeeProfileManager /></TabsContent>

          <TabsContent value="team-performance" className="space-y-6">
            <TeamOverviewDashboard />
            <TeamPerformanceComparison />
            <TeamCommissionsApproval />
          </TabsContent>

          <TabsContent value="productivity"><RecruiterProductivityPanel /></TabsContent>

          <TabsContent value="targets-commissions" className="space-y-8">
            <section><h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Target Management</h3><TargetManagementPanel /></section>
            <div className="border-t border-border/50" />
            <section><h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Commission Tiers</h3><CommissionTierBuilder /></section>
            <div className="border-t border-border/50" />
            <section><h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" />Payout Scheduler</h3><PayoutScheduler /></section>
          </TabsContent>

          <TabsContent value="reviews-development" className="space-y-8">
            <section><h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Performance Reviews</h3><PerformanceReviewPanel /></section>
            <div className="border-t border-border/50" />
            <section><h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Training Records</h3><TrainingRecordsPanel /></section>
            <div className="border-t border-border/50" />
            <section><h3 className="text-lg font-semibold mb-4">Onboarding</h3><OnboardingChecklist /></section>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}

function StatCard({ icon: Icon, color, value, label }: { icon: React.ElementType; color: string; value: string | number; label: string }) {
  return (
    <Card><CardContent className="pt-5 pb-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${color.split(' ').slice(1).join(' ')}`}><Icon className={`h-4 w-4 ${color.split(' ')[0]}`} /></div><div className="min-w-0"><p className="text-xl font-bold truncate">{value}</p><p className="text-[10px] text-muted-foreground truncate">{label}</p></div></div></CardContent></Card>
  );
}
