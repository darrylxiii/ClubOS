import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Shield, Users, Briefcase, Target, TrendingUp, Clock, Mail,
  LogIn, Timer, UserPlus, Award, DollarSign,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
}

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
  const config = ROLE_CONFIG[role];

  const { data: employees, isLoading } = useQuery({
    queryKey: ['role-intelligence', role],
    queryFn: async () => {
      // 1. Get user IDs for this role
      const { data: roleRows, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', role);
      if (rolesError) throw rolesError;

      const userIds = roleRows?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      // 2. Parallel fetch: profiles, activity, applications sourced, placement fees
      const [profilesRes, activityRes, sourcedRes, placementsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds),
        supabase
          .from('user_activity_tracking')
          .select('user_id, last_activity_at, last_login_at, total_actions, session_count, total_session_duration_minutes, activity_level')
          .in('user_id', userIds),
        supabase
          .from('applications')
          .select('sourced_by')
          .in('sourced_by', userIds),
        supabase
          .from('placement_fees')
          .select('sourced_by, fee_amount, status')
          .in('sourced_by', userIds)
          .neq('status', 'cancelled'),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      // Build lookup maps
      const activityMap = new Map(
        (activityRes.data || []).map(a => [a.user_id, a])
      );

      // Count candidates sourced per user
      const sourcedCountMap = new Map<string, number>();
      (sourcedRes.data || []).forEach((app: any) => {
        if (app.sourced_by) {
          sourcedCountMap.set(app.sourced_by, (sourcedCountMap.get(app.sourced_by) || 0) + 1);
        }
      });

      // Count placements + sum revenue per user
      const placementMap = new Map<string, { count: number; revenue: number }>();
      (placementsRes.data || []).forEach((fee: any) => {
        if (fee.sourced_by) {
          const existing = placementMap.get(fee.sourced_by) || { count: 0, revenue: 0 };
          existing.count += 1;
          existing.revenue += Number(fee.fee_amount) || 0;
          placementMap.set(fee.sourced_by, existing);
        }
      });

      // 3. Combine
      const result: EmployeeRow[] = (profilesRes.data || []).map(profile => {
        const activity = activityMap.get(profile.id);
        const lastActivity = activity?.last_activity_at;
        const minutesAgo = lastActivity
          ? (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60)
          : Infinity;
        const placement = placementMap.get(profile.id);

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
        };
      });

      return result.sort((a, b) => {
        if (!a.last_activity_at) return 1;
        if (!b.last_activity_at) return -1;
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      });
    },
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    staleTime: 60000,
  });

  // Summary stats
  const stats = {
    total: employees?.length || 0,
    online: employees?.filter(e => e.online_status === 'online').length || 0,
    totalLogins: employees?.reduce((s, e) => s + e.session_count, 0) || 0,
    totalHoursOnline: employees?.reduce((s, e) => s + e.total_session_duration_minutes, 0) || 0,
    totalCandidates: employees?.reduce((s, e) => s + e.candidates_sourced, 0) || 0,
    totalPlacements: employees?.reduce((s, e) => s + e.placements, 0) || 0,
    totalRevenue: employees?.reduce((s, e) => s + e.revenue, 0) || 0,
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
      case 'highly_active': return <Badge className="bg-emerald-500">Highly Active</Badge>;
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'moderate': return <Badge className="bg-yellow-500 text-black">Moderate</Badge>;
      case 'low': return <Badge className="bg-orange-500">Low</Badge>;
      default: return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading {config.label.toLowerCase()} intelligence...</div>;
  }

  const RoleIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Summary Cards — 7 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Total</CardTitle>
            <RoleIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Online</CardTitle>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.online}</div>
            <p className="text-xs text-muted-foreground">Right now</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Logins</CardTitle>
            <LogIn className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.totalLogins.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Time Online</CardTitle>
            <Timer className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatDuration(stats.totalHoursOnline)}</div>
            <p className="text-xs text-muted-foreground">Combined</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Sourced</CardTitle>
            <UserPlus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">Candidates</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Placements</CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{stats.totalPlacements}</div>
            <p className="text-xs text-muted-foreground">Successful</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium">Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatRevenue(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Table */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>{config.label} Performance</CardTitle>
          <CardDescription>Real-time monitoring with full KPIs</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/20 mb-2">
            <span>Employee</span>
            <span className="text-right">Logins</span>
            <span className="text-right">Time Online</span>
            <span className="text-right">Sourced</span>
            <span className="text-right">Placements</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Last Login</span>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {employees?.map((emp) => (
                <div
                  key={emp.user_id}
                  className="p-3 rounded-lg bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors"
                >
                  {/* Desktop: grid row */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 items-center">
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
                          <span className="font-medium text-sm truncate">
                            {emp.full_name || 'Unnamed'}
                          </span>
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
                    <div className="text-right text-xs text-muted-foreground">
                      {emp.last_login_at
                        ? formatDistanceToNow(new Date(emp.last_login_at), { addSuffix: true })
                        : 'Never'
                      }
                    </div>
                  </div>

                  {/* Mobile: stacked */}
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
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Logins:</span> {emp.session_count}</div>
                      <div><span className="text-muted-foreground">Online:</span> {formatDuration(emp.total_session_duration_minutes)}</div>
                      <div><span className="text-muted-foreground">Sourced:</span> {emp.candidates_sourced}</div>
                      <div><span className="text-muted-foreground">Placed:</span> {emp.placements}</div>
                      <div><span className="text-muted-foreground">Rev:</span> {formatRevenue(emp.revenue)}</div>
                      <div>
                        <span className="text-muted-foreground">Login:</span>{' '}
                        {emp.last_login_at
                          ? formatDistanceToNow(new Date(emp.last_login_at), { addSuffix: true })
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!employees || employees.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No {config.label.toLowerCase()} found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
