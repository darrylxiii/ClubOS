import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity, Clock, TrendingUp, Calendar, MousePointerClick, Mail, Building2,
  LogIn, Timer, UserPlus, Award, DollarSign, Phone, BarChart3, Wallet, Gift, Percent, Users2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  calculateUserShareEarnings,
  aggregateEmployeeEarnings,
  type RevenueShareConfig,
  type InvoiceForShare,
  type AggregatedEarnings,
} from '@/lib/employeeEarnings';

interface UserDetailModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActivityTracking {
  last_activity_at: string | null;
  last_login_at: string | null;
  total_actions: number | null;
  session_count: number | null;
  total_session_duration_minutes: number | null;
  activity_level: string | null;
  activity_score: number | null;
}

interface RecruiterMetrics {
  calls_made: number | null;
  emails_sent: number | null;
  candidates_added: number | null;
  candidates_placed: number | null;
  candidates_screened: number | null;
  outreach_count: number | null;
  interviews_scheduled: number | null;
  placement_revenue: number | null;
}

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

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function UserDetailModal({ userId, open, onOpenChange }: UserDetailModalProps) {
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-detail-v3', userId],
    queryFn: async () => {
      if (!userId) return null;

      const currentYear = new Date().getFullYear();

      const [
        profileRes, rolesRes, activityRes, eventsRes, sourcedRes, placementsRes,
        recruiterMetricsRes, employeeProfileRes, payoutsRes, sharesRes, invoicesRes, meetingsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('user_activity_tracking').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_session_events').select('*').eq('user_id', userId).order('event_timestamp', { ascending: false }).limit(50),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('sourced_by', userId),
        supabase.from('placement_fees').select('fee_amount, status').eq('sourced_by', userId).neq('status', 'cancelled'),
        supabase.from('recruiter_activity_metrics').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('employee_profiles').select('id, user_id').eq('user_id', userId).maybeSingle(),
        supabase.from('referral_payouts').select('id, payout_amount, status, created_at, paid_at').eq('referrer_user_id', userId),
        supabase.from('referral_revenue_shares').select('*').eq('user_id', userId).eq('is_active', true),
        supabase.from('moneybird_sales_invoices').select('id, total_amount, net_amount, state_normalized, invoice_date, contact_name, contact_id').gte('invoice_date', `${currentYear}-01-01`),
        supabase.from('meeting_participants').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      if (profileRes.error) throw profileRes.error;

      // Company lookup
      let company = null;
      if (profileRes.data?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profileRes.data.company_id)
          .single();
        company = companyData;
      }

      // Fetch commissions if employee
      let commissions: Array<{ gross_amount: number; status: string }> = [];
      if (employeeProfileRes.data?.id) {
        const { data: commData } = await supabase
          .from('employee_commissions')
          .select('gross_amount, status')
          .eq('employee_id', employeeProfileRes.data.id);
        commissions = commData || [];
      }

      const placementCount = placementsRes.data?.length || 0;
      const totalRevenue = (placementsRes.data || []).reduce((s: number, f: any) => s + (Number(f.fee_amount) || 0), 0);

      // Calculate earnings
      const payouts = payoutsRes.data || [];
      const shares = (sharesRes.data || []) as RevenueShareConfig[];
      const invoices = (invoicesRes.data || []) as InvoiceForShare[];
      const shareEarnings = calculateUserShareEarnings(shares, invoices);
      const earnings = aggregateEmployeeEarnings(commissions, payouts, shareEarnings);

      return {
        profile: profileRes.data,
        roles: rolesRes.data?.map(r => r.role) || [],
        activity: (activityRes.data || null) as ActivityTracking | null,
        sessionEvents: eventsRes.data || [],
        company,
        candidatesSourced: sourcedRes.count || 0,
        placements: placementCount,
        revenue: totalRevenue,
        recruiterMetrics: (recruiterMetricsRes.data || null) as RecruiterMetrics | null,
        earnings,
        meetingsAttended: meetingsRes.count || 0,
        hasShares: shares.length > 0,
      };
    },
    enabled: !!userId && open,
  });

  const getStatusColor = (lastActivity: string | null) => {
    if (!lastActivity) return 'bg-muted-foreground/40';
    const minutesAgo = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60);
    if (minutesAgo < 2) return 'bg-green-500';
    if (minutesAgo < 30) return 'bg-yellow-500';
    return 'bg-muted-foreground/40';
  };

  const getActivityBadge = (level: string | undefined) => {
    switch (level) {
      case 'highly_active': return <Badge className="bg-emerald-500">Highly Active</Badge>;
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'moderate': return <Badge className="bg-yellow-500 text-black">Moderate</Badge>;
      case 'low': return <Badge className="bg-orange-500">Low</Badge>;
      default: return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>Comprehensive activity, performance, and earnings data</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading user details...</div>
        ) : userData ? (
          <div className="space-y-4">
            {/* User Header */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-border/20">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userData.profile.avatar_url || undefined} />
                  <AvatarFallback className="text-lg">
                    {userData.profile.full_name?.charAt(0) || userData.profile.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(userData.activity?.last_activity_at ?? null)}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {userData.profile.full_name || 'Unnamed User'}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  {userData.profile.email}
                </div>
                {userData.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Building2 className="w-3 h-3" />
                    {userData.company.name}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {userData.roles.map(role => (
                    <Badge key={role} variant="outline" className="capitalize">{role}</Badge>
                  ))}
                  {getActivityBadge(userData.activity?.activity_level ?? undefined)}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="performance" className="w-full">
              <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="info">Profile</TabsTrigger>
              </TabsList>

              {/* Performance Tab */}
              <TabsContent value="performance">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <LogIn className="w-3 h-3" />
                          Logins
                        </div>
                        <div className="text-xl font-bold">{userData.activity?.session_count || 0}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Timer className="w-3 h-3" />
                          Time Online
                        </div>
                        <div className="text-xl font-bold">{formatDuration(userData.activity?.total_session_duration_minutes || 0)}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Activity className="w-3 h-3" />
                          Actions
                        </div>
                        <div className="text-xl font-bold">{userData.activity?.total_actions?.toLocaleString() || 0}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <UserPlus className="w-3 h-3" />
                          Sourced
                        </div>
                        <div className="text-xl font-bold">{userData.candidatesSourced}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Award className="w-3 h-3" />
                          Placements
                        </div>
                        <div className="text-xl font-bold">{userData.placements}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <DollarSign className="w-3 h-3" />
                          Revenue
                        </div>
                        <div className="text-xl font-bold">{formatRevenue(userData.revenue)}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Users2 className="w-3 h-3" />
                          Meetings
                        </div>
                        <div className="text-xl font-bold">{userData.meetingsAttended}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Timestamps */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          Last Login
                        </div>
                        <div className="text-sm font-medium">
                          {userData.activity?.last_login_at
                            ? formatDistanceToNow(new Date(userData.activity.last_login_at), { addSuffix: true })
                            : 'Never'}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <TrendingUp className="w-3 h-3" />
                          Activity Score
                        </div>
                        <div className="text-sm font-medium">
                          {userData.activity?.activity_score || 0}/100
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recruiter Metrics */}
                  {userData.recruiterMetrics && (
                    <Card className="bg-muted/10">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Recruiter Activity Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { label: 'Calls Made', value: userData.recruiterMetrics.calls_made || 0, icon: Phone },
                            { label: 'Emails Sent', value: userData.recruiterMetrics.emails_sent || 0, icon: Mail },
                            { label: 'Candidates Added', value: userData.recruiterMetrics.candidates_added || 0, icon: UserPlus },
                            { label: 'Candidates Placed', value: userData.recruiterMetrics.candidates_placed || 0, icon: Award },
                          ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                              <div>
                                <div className="text-xs text-muted-foreground">{label}</div>
                                <div className="text-sm font-bold">{value}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Earnings Tab */}
              <TabsContent value="earnings">
                <div className="space-y-4">
                  {/* Earnings KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Wallet className="w-3 h-3" />
                          Total Earnings
                        </div>
                        <div className="text-xl font-bold">{formatCurrencyFull(userData.earnings.totalEarnings)}</div>
                        <div className="flex gap-2 mt-1 text-xs">
                          <span className="text-green-500">Paid: {formatRevenue(userData.earnings.totalPaid)}</span>
                          <span className="text-yellow-500">Pending: {formatRevenue(userData.earnings.totalPending)}</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <DollarSign className="w-3 h-3" />
                          Commissions
                        </div>
                        <div className="text-xl font-bold">{formatCurrencyFull(userData.earnings.commissions.total)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Paid: {formatRevenue(userData.earnings.commissions.paid)}
                        </div>
                      </CardContent>
                    </Card>
                    {userData.hasShares && (
                      <Card className="bg-muted/10">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                            <Percent className="w-3 h-3" />
                            Revenue Shares
                          </div>
                          <div className="text-xl font-bold">{formatCurrencyFull(userData.earnings.shareEarnings.projected)}</div>
                          <div className="text-xs text-green-500 mt-1">
                            Realized: {formatRevenue(userData.earnings.shareEarnings.realized)}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Gift className="w-3 h-3" />
                          Referral Payouts
                        </div>
                        <div className="text-xl font-bold">{formatCurrencyFull(userData.earnings.referralPayouts.total)}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Paid: {formatRevenue(userData.earnings.referralPayouts.paid)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary */}
                  <Card className="bg-muted/10 border-primary/20">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-2">Earnings Breakdown</div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Commissions</span>
                          <span className="font-medium">{formatCurrencyFull(userData.earnings.commissions.total)}</span>
                        </div>
                        {userData.hasShares && (
                          <div className="flex justify-between text-sm">
                            <span>Revenue Share Earnings</span>
                            <span className="font-medium">{formatCurrencyFull(userData.earnings.shareEarnings.projected)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>Referral Payouts</span>
                          <span className="font-medium">{formatCurrencyFull(userData.earnings.referralPayouts.total)}</span>
                        </div>
                        <div className="border-t border-border/20 pt-2 flex justify-between text-sm font-bold">
                          <span>Total Take-Home</span>
                          <span className="text-primary">{formatCurrencyFull(userData.earnings.totalEarnings)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[300px]">
                      <div className="p-4 space-y-2">
                        {userData.sessionEvents.map((event: any) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-3 p-2 rounded hover:bg-muted/10"
                          >
                            <MousePointerClick className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium capitalize">
                                {event.event_type?.replace(/_/g, ' ') || 'Unknown Event'}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {event.page_path || 'No path'}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(event.event_timestamp), 'MMM dd, HH:mm')}
                            </div>
                          </div>
                        ))}
                        {userData.sessionEvents.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No recent events recorded
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Profile Info Tab */}
              <TabsContent value="info">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Email Verified</div>
                        <div className="text-sm">{userData.profile.email_verified ? 'Yes' : 'No'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Phone</div>
                        <div className="text-sm">{userData.profile.phone || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Location</div>
                        <div className="text-sm">{userData.profile.location || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Current Title</div>
                        <div className="text-sm">{userData.profile.current_title || 'Not provided'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Member Since</div>
                        <div className="text-sm">
                          {userData.profile.created_at
                            ? format(new Date(userData.profile.created_at), 'MMM dd, yyyy')
                            : 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Onboarding</div>
                        <div className="text-sm">
                          {userData.profile.onboarding_completed_at ? 'Completed' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">User not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
