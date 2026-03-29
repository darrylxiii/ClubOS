import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Shield, Users, Briefcase, TrendingUp, Clock,
  LogIn, Timer, UserPlus, Award, DollarSign, Wallet, ArrowUpDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserDetailModal } from './UserDetailModal';
import {
  calculateUserShareEarnings,
  aggregateEmployeeEarnings,
  type RevenueShareConfig,
  type InvoiceForShare,
} from '@/lib/employeeEarnings';
import { useTranslation } from 'react-i18next';

interface RoleIntelligenceTabProps {
  role: 'admin' | 'strategist' | 'recruiter';
}

interface EmployeeRow {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  last_activity_at: string | null;
  last_login_at: string | null;
  total_actions: number;
  session_count: number;
  total_session_duration_minutes: number;
  activity_level: string;
  online_status: 'online' | 'away' | 'offline';
  candidates_sourced: number;
  placements: number;
  revenue: number;
  commissions_earned: number;
  total_earnings: number;
}

type SortField = 'name' | 'logins' | 'time' | 'sourced' | 'placements' | 'revenue' | 'earnings' | 'last_login';

const ROLE_CONFIG = {
  admin: { label: 'Admins', icon: Shield },
  strategist: { label: 'Strategists', icon: Users },
  recruiter: { label: 'Recruiters', icon: Briefcase },
} as const;

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatRevenue(amount: number): string {
  if (!amount) return '€0';
  if (amount >= 1000) return `€${(amount / 1000).toFixed(1)}k`;
  return `€${amount.toLocaleString()}`;
}

export function RoleIntelligenceTab({ role }: RoleIntelligenceTabProps) {
  const { t } = useTranslation('admin');
  const config = ROLE_CONFIG[role];
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('last_login');
  const [sortAsc, setSortAsc] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['role-intelligence', role],
    queryFn: async () => {
      const { data: roleRows, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', role);
      if (rolesError) throw rolesError;

      const userIds = roleRows?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const currentYear = new Date().getFullYear();

      const [profilesRes, activityRes, sourcedRes, placementsRes, employeeProfilesRes, payoutsRes, sharesRes, invoicesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', userIds),
        supabase.from('user_activity_tracking').select('user_id, last_activity_at, last_login_at, total_actions, session_count, total_session_duration_minutes, activity_level').in('user_id', userIds),
        supabase.from('applications').select('sourced_by').in('sourced_by', userIds),
        supabase.from('placement_fees').select('sourced_by, fee_amount, status').in('sourced_by', userIds).neq('status', 'cancelled'),
        supabase.from('employee_profiles').select('id, user_id').in('user_id', userIds),
        supabase.from('referral_payouts').select('referrer_user_id, payout_amount, status').in('referrer_user_id', userIds),
        supabase.from('referral_revenue_shares').select('*').in('user_id', userIds).eq('is_active', true),
        supabase.from('moneybird_sales_invoices').select('id, total_amount, net_amount, state_normalized, invoice_date, contact_name, contact_id').gte('invoice_date', `${currentYear}-01-01`),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const activityMap = new Map((activityRes.data || []).map(a => [a.user_id, a]));

      const sourcedCountMap = new Map<string, number>();
      (sourcedRes.data || []).forEach((app: any) => {
        if (app.sourced_by) sourcedCountMap.set(app.sourced_by, (sourcedCountMap.get(app.sourced_by) || 0) + 1);
      });

      const placementMap = new Map<string, { count: number; revenue: number }>();
      (placementsRes.data || []).forEach((fee: any) => {
        if (fee.sourced_by) {
          const existing = placementMap.get(fee.sourced_by) || { count: 0, revenue: 0 };
          existing.count += 1;
          existing.revenue += Number(fee.fee_amount) || 0;
          placementMap.set(fee.sourced_by, existing);
        }
      });

      // Employee profile ID mapping (user_id → employee_id)
      const empProfileMap = new Map((employeeProfilesRes.data || []).map(ep => [ep.user_id, ep.id]));

      // Commissions: need to fetch per employee_id
      const empIds = (employeeProfilesRes.data || []).map(ep => ep.id);
      let commissionsMap = new Map<string, number>();
      if (empIds.length > 0) {
        const { data: commissions } = await supabase
          .from('employee_commissions')
          .select('employee_id, gross_amount, status')
          .in('employee_id', empIds);
        
        // Map employee_id → user_id for aggregation
        const empToUser = new Map((employeeProfilesRes.data || []).map(ep => [ep.id, ep.user_id]));
        (commissions || []).forEach((c: any) => {
          const uid = empToUser.get(c.employee_id);
          if (uid) commissionsMap.set(uid, (commissionsMap.get(uid) || 0) + (Number(c.gross_amount) || 0));
        });
      }

      // Referral payouts per user
      const payoutMap = new Map<string, number>();
      (payoutsRes.data || []).forEach((p: any) => {
        payoutMap.set(p.referrer_user_id, (payoutMap.get(p.referrer_user_id) || 0) + (Number(p.payout_amount) || 0));
      });

      // Revenue shares per user
      const sharesData = (sharesRes.data || []) as RevenueShareConfig[];
      const invoicesData = (invoicesRes.data || []) as InvoiceForShare[];
      const shareEarningsMap = new Map<string, number>();
      const userShareGroups = new Map<string, RevenueShareConfig[]>();
      for (const s of sharesData) {
        const existing = userShareGroups.get(s.user_id) || [];
        existing.push(s);
        userShareGroups.set(s.user_id, existing);
      }
      for (const [uid, shares] of userShareGroups) {
        const se = calculateUserShareEarnings(shares, invoicesData);
        shareEarningsMap.set(uid, se.projected);
      }

      const result: EmployeeRow[] = (profilesRes.data || []).map(profile => {
        const activity = activityMap.get(profile.id);
        const lastActivity = activity?.last_activity_at;
        const minutesAgo = lastActivity ? (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60) : Infinity;
        const placement = placementMap.get(profile.id);
        const commEarned = commissionsMap.get(profile.id) || 0;
        const payoutEarned = payoutMap.get(profile.id) || 0;
        const shareEarned = shareEarningsMap.get(profile.id) || 0;

        return {
          user_id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          last_activity_at: activity?.last_activity_at || null,
          last_login_at: activity?.last_login_at || null,
          total_actions: activity?.total_actions || 0,
          session_count: activity?.session_count || 0,
          total_session_duration_minutes: activity?.total_session_duration_minutes || 0,
          activity_level: activity?.activity_level || 'inactive',
          online_status: minutesAgo < 2 ? 'online' : minutesAgo < 30 ? 'away' : 'offline',
          candidates_sourced: sourcedCountMap.get(profile.id) || 0,
          placements: placement?.count || 0,
          revenue: placement?.revenue || 0,
          commissions_earned: commEarned,
          total_earnings: commEarned + payoutEarned + shareEarned,
        };
      });

      return result;
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 60000,
  });

  // Sorting
  const sortedEmployees = [...(employees || [])].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    switch (sortField) {
      case 'name': return dir * (a.full_name || '').localeCompare(b.full_name || '');
      case 'logins': return dir * (a.session_count - b.session_count);
      case 'time': return dir * (a.total_session_duration_minutes - b.total_session_duration_minutes);
      case 'sourced': return dir * (a.candidates_sourced - b.candidates_sourced);
      case 'placements': return dir * (a.placements - b.placements);
      case 'revenue': return dir * (a.revenue - b.revenue);
      case 'earnings': return dir * (a.total_earnings - b.total_earnings);
      case 'last_login':
        if (!a.last_login_at) return 1;
        if (!b.last_login_at) return -1;
        return dir * (new Date(a.last_login_at).getTime() - new Date(b.last_login_at).getTime());
      default: return 0;
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setModalOpen(true);
  };

  const stats = {
    total: employees?.length || 0,
    online: employees?.filter(e => e.online_status === 'online').length || 0,
    totalLogins: employees?.reduce((s, e) => s + e.session_count, 0) || 0,
    totalHoursOnline: employees?.reduce((s, e) => s + e.total_session_duration_minutes, 0) || 0,
    totalCandidates: employees?.reduce((s, e) => s + e.candidates_sourced, 0) || 0,
    totalPlacements: employees?.reduce((s, e) => s + e.placements, 0) || 0,
    totalRevenue: employees?.reduce((s, e) => s + e.revenue, 0) || 0,
    totalEarnings: employees?.reduce((s, e) => s + e.total_earnings, 0) || 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-muted-foreground/40';
    }
  };

  const getActivityBadge = (level: string) => {
    switch (level) {
      case 'highly_active': return <Badge className="bg-emerald-500">{t('activity.roleIntelligenceTab.highlyActive')}</Badge>;
      case 'active': return <Badge className="bg-green-500">{t('common:status.active')}</Badge>;
      case 'moderate': return <Badge className="bg-yellow-500 text-black">{t('activity.roleIntelligenceTab.moderate')}</Badge>;
      case 'low': return <Badge className="bg-orange-500">{t('activity.roleIntelligenceTab.low')}</Badge>;
      default: return <Badge variant="secondary">{t('common:status.inactive')}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading {config.label.toLowerCase()} intelligence...</div>;
  }

  const RoleIcon = config.icon;

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <span
      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && <ArrowUpDown className="w-3 h-3 text-primary" />}
    </span>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards — 8 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">{t('activity.roleIntelligenceTab.total')}</CardTitle>
            <RoleIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">{t('activity.roleIntelligenceTab.online2')}</CardTitle>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.online}</div>
            <p className="text-xs text-muted-foreground">{t('activity.roleIntelligenceTab.rightNow')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">{t('activity.roleIntelligenceTab.logins2')}</CardTitle>
            <LogIn className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.totalLogins.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{t('activity.roleIntelligenceTab.allTime')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">{t('activity.roleIntelligenceTab.timeOnline')}</CardTitle>
            <Timer className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatDuration(stats.totalHoursOnline)}</div>
            <p className="text-xs text-muted-foreground">{t('activity.roleIntelligenceTab.combined')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">{t('activity.roleIntelligenceTab.sourced2')}</CardTitle>
            <UserPlus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">{t('activity.roleIntelligenceTab.candidates')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">{t('activity.roleIntelligenceTab.placements')}</CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.totalPlacements}</div>
            <p className="text-xs text-muted-foreground">{t('activity.roleIntelligenceTab.successful')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">{t('activity.roleIntelligenceTab.revenue')}</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatRevenue(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{t('activity.roleIntelligenceTab.generated')}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">{t('activity.roleIntelligenceTab.earnings')}</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatRevenue(stats.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">{t('activity.roleIntelligenceTab.takehome')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Table */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>{config.label} Performance</CardTitle>
          <CardDescription>{t('activity.roleIntelligenceTab.clickAnyRowToSeeFull')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/20 mb-2">
            <SortHeader field="name">{t('activity.roleIntelligenceTab.employee')}</SortHeader>
            <SortHeader field="logins"><span className="text-right w-full">{t('activity.roleIntelligenceTab.logins2')}</span></SortHeader>
            <SortHeader field="time"><span className="text-right w-full">{t('activity.roleIntelligenceTab.timeOnline')}</span></SortHeader>
            <SortHeader field="sourced"><span className="text-right w-full">{t('activity.roleIntelligenceTab.sourced2')}</span></SortHeader>
            <SortHeader field="placements"><span className="text-right w-full">{t('activity.roleIntelligenceTab.placements')}</span></SortHeader>
            <SortHeader field="revenue"><span className="text-right w-full">{t('activity.roleIntelligenceTab.revenue')}</span></SortHeader>
            <SortHeader field="earnings"><span className="text-right w-full">{t('activity.roleIntelligenceTab.earnings')}</span></SortHeader>
            <SortHeader field="last_login"><span className="text-right w-full">{t('activity.roleIntelligenceTab.lastLogin')}</span></SortHeader>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {sortedEmployees.map((emp) => (
                <div
                  key={emp.user_id}
                  className="p-3 rounded-lg bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => handleUserClick(emp.user_id)}
                >
                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-2 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={emp.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {emp.full_name?.charAt(0) || emp.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusColor(emp.online_status)}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{emp.full_name || 'Unnamed'}</span>
                          {getActivityBadge(emp.activity_level)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{emp.email}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm font-medium">{emp.session_count}</div>
                    <div className="text-right text-sm font-medium">{formatDuration(emp.total_session_duration_minutes)}</div>
                    <div className="text-right text-sm font-medium">{emp.candidates_sourced}</div>
                    <div className="text-right text-sm font-medium">{emp.placements}</div>
                    <div className="text-right text-sm font-medium">{formatRevenue(emp.revenue)}</div>
                    <div className="text-right text-sm font-medium text-primary">{formatRevenue(emp.total_earnings)}</div>
                    <div className="text-right text-xs text-muted-foreground">
                      {emp.last_login_at
                        ? formatDistanceToNow(new Date(emp.last_login_at), { addSuffix: true })
                        : 'Never'}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={emp.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {emp.full_name?.charAt(0) || emp.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${getStatusColor(emp.online_status)}`} />
                      </div>
                      <div>
                        <span className="font-medium text-sm">{emp.full_name || 'Unnamed'}</span>
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      </div>
                      {getActivityBadge(emp.activity_level)}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><span className="text-muted-foreground">{"Logins:"}</span> {emp.session_count}</div>
                      <div><span className="text-muted-foreground">{"Online:"}</span> {formatDuration(emp.total_session_duration_minutes)}</div>
                      <div><span className="text-muted-foreground">{"Sourced:"}</span> {emp.candidates_sourced}</div>
                      <div><span className="text-muted-foreground">{"Placed:"}</span> {emp.placements}</div>
                      <div><span className="text-muted-foreground">{"Rev:"}</span> {formatRevenue(emp.revenue)}</div>
                      <div><span className="text-muted-foreground">{"Earned:"}</span> {formatRevenue(emp.total_earnings)}</div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">{"Login:"}</span>{' '}
                        {emp.last_login_at
                          ? formatDistanceToNow(new Date(emp.last_login_at), { addSuffix: true })
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {sortedEmployees.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No {config.label.toLowerCase()} found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <UserDetailModal
        userId={selectedUserId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
