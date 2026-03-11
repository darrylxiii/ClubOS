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
  LogIn, Timer, UserPlus, Award, DollarSign, Phone, BarChart3,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface UserDetailModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function UserDetailModal({ userId, open, onOpenChange }: UserDetailModalProps) {
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-detail-v2', userId],
    queryFn: async () => {
      if (!userId) return null;

      const [profileRes, rolesRes, activityRes, eventsRes, sourcedRes, placementsRes, recruiterMetricsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('user_activity_tracking').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_session_events').select('*').eq('user_id', userId).order('event_timestamp', { ascending: false }).limit(50),
        supabase.from('applications').select('id', { count: 'exact', head: true }).eq('sourced_by', userId),
        supabase.from('placement_fees').select('fee_amount, status').eq('sourced_by', userId).neq('status', 'cancelled'),
        supabase.from('recruiter_activity_metrics').select('*').eq('user_id', userId).maybeSingle(),
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

      const placementCount = placementsRes.data?.length || 0;
      const totalRevenue = (placementsRes.data || []).reduce((s: number, f: any) => s + (Number(f.fee_amount) || 0), 0);

      return {
        profile: profileRes.data,
        roles: rolesRes.data?.map(r => r.role) || [],
        activity: activityRes.data || null,
        sessionEvents: eventsRes.data || [],
        company,
        candidatesSourced: sourcedRes.count || 0,
        placements: placementCount,
        revenue: totalRevenue,
        recruiterMetrics: recruiterMetricsRes.data || null,
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
          <DialogDescription>Comprehensive activity and performance data</DialogDescription>
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
                <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background ${getStatusColor(userData.activity?.last_activity_at)}`} />
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
                  {getActivityBadge(userData.activity?.activity_level)}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="performance" className="w-full">
              <TabsList>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="info">Profile</TabsTrigger>
              </TabsList>

              {/* Performance Tab */}
              <TabsContent value="performance">
                <div className="space-y-4">
                  {/* Primary KPI Cards */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <LogIn className="w-3 h-3" />
                          Logins
                        </div>
                        <div className="text-xl font-bold">
                          {(userData.activity as any)?.session_count || 0}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Timer className="w-3 h-3" />
                          Time Online
                        </div>
                        <div className="text-xl font-bold">
                          {formatDuration((userData.activity as any)?.total_session_duration_minutes || 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/10">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Activity className="w-3 h-3" />
                          Actions
                        </div>
                        <div className="text-xl font-bold">
                          {userData.activity?.total_actions?.toLocaleString() || 0}
                        </div>
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
                          {(userData.activity as any)?.last_login_at
                            ? formatDistanceToNow(new Date((userData.activity as any).last_login_at), { addSuffix: true })
                            : 'Never'
                          }
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

                  {/* Recruiter Metrics (if available) */}
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
                            { label: 'Calls Made', value: (userData.recruiterMetrics as any)?.calls_made || 0, icon: Phone },
                            { label: 'Emails Sent', value: (userData.recruiterMetrics as any)?.emails_sent || 0, icon: Mail },
                            { label: 'Candidates Added', value: (userData.recruiterMetrics as any)?.candidates_added || 0, icon: UserPlus },
                            { label: 'Candidates Placed', value: (userData.recruiterMetrics as any)?.candidates_placed || 0, icon: Award },
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
                            : 'Unknown'
                          }
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
