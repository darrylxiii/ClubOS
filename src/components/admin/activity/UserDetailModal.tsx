import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Clock, TrendingUp, Calendar, MousePointerClick, Mail, Building2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface UserDetailModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailModal({ userId, open, onOpenChange }: UserDetailModalProps) {
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-detail', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      // Fetch activity tracking
      const { data: activity, error: activityError } = await supabase
        .from('user_activity_tracking')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Fetch recent session events (last 50)
      const { data: sessionEvents, error: eventsError } = await supabase
        .from('user_session_events')
        .select('*')
        .eq('user_id', userId)
        .order('event_timestamp', { ascending: false })
        .limit(50);

      // Fetch company if applicable
      let company = null;
      if (profile?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', profile.company_id)
          .single();
        company = companyData;
      }

      return {
        profile,
        roles: roles?.map(r => r.role) || [],
        activity: activity || null,
        sessionEvents: sessionEvents || [],
        company,
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
          <DialogDescription>Comprehensive activity history for this user</DialogDescription>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3">
              <Card className="bg-muted/10">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Activity className="w-3 h-3" />
                    Total Actions
                  </div>
                  <div className="text-xl font-bold">
                    {userData.activity?.total_actions?.toLocaleString() || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/10">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Score (24h)
                  </div>
                  <div className="text-xl font-bold">
                    {userData.activity?.activity_score || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/10">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
                    Sessions
                  </div>
                  <div className="text-xl font-bold">
                    {(userData.activity as any)?.session_count || 0}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/10">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Clock className="w-3 h-3" />
                    Last Active
                  </div>
                  <div className="text-sm font-medium">
                    {userData.activity?.last_activity_at
                      ? formatDistanceToNow(new Date(userData.activity.last_activity_at), { addSuffix: true })
                      : 'Never'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline */}
            <Tabs defaultValue="events" className="w-full">
              <TabsList>
                <TabsTrigger value="events">Recent Events</TabsTrigger>
                <TabsTrigger value="info">Profile Info</TabsTrigger>
              </TabsList>
              
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
