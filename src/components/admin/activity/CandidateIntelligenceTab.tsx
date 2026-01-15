import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, TrendingUp, Briefcase, Clock, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CandidateActivity {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  last_activity_at: string | null;
  total_actions: number;
  activity_level: string;
  online_status: 'online' | 'away' | 'offline';
}

export function CandidateIntelligenceTab() {
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidate-intelligence-v2'],
    queryFn: async () => {
      // Get all candidates (users with 'user' role or no special roles)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url');

      if (profilesError) throw profilesError;

      // Get activity tracking
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity_tracking')
        .select('*');

      if (activityError) throw activityError;

      // Filter to candidates only (users with 'user' role or no admin/partner roles)
      const adminRoles = ['admin', 'strategist', 'recruiter', 'partner', 'company_admin'];
      const adminUserIds = new Set(
        userRoles?.filter(r => adminRoles.includes(r.role)).map(r => r.user_id) || []
      );

      // Combine data - candidates are users NOT in admin roles
      const result: CandidateActivity[] = profiles
        ?.filter(profile => !adminUserIds.has(profile.id))
        .map(profile => {
          const activity = activityData?.find(a => a.user_id === profile.id);
          const lastActivity = activity?.last_activity_at;
          const minutesAgo = lastActivity 
            ? (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60)
            : Infinity;
          
          return {
            user_id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
            last_activity_at: activity?.last_activity_at || null,
            total_actions: activity?.total_actions || 0,
            activity_level: activity?.activity_level || 'inactive',
            online_status: minutesAgo < 2 ? 'online' : minutesAgo < 30 ? 'away' : 'offline',
          };
        }) || [];

      return result.sort((a, b) => {
        if (!a.last_activity_at) return 1;
        if (!b.last_activity_at) return -1;
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      });
    },
    refetchInterval: 30000,
  });

  // Calculate stats
  const stats = {
    total: candidates?.length || 0,
    online: candidates?.filter(c => c.online_status === 'online').length || 0,
    active: candidates?.filter(c => c.activity_level !== 'inactive').length || 0,
    totalActions: candidates?.reduce((sum, c) => sum + c.total_actions, 0) || 0,
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
    return <div className="p-6">Loading candidate intelligence...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.online}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Candidates</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">With recent activity</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Briefcase className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Candidate List */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Candidate Activity</CardTitle>
          <CardDescription>Real-time monitoring of candidate users</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {candidates?.map((candidate) => (
                <div 
                  key={candidate.user_id} 
                  className="p-4 rounded-lg bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={candidate.avatar_url || undefined} />
                          <AvatarFallback>
                            {candidate.full_name?.charAt(0) || candidate.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(candidate.online_status)}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {candidate.full_name || 'Unnamed Candidate'}
                          </span>
                          {getActivityBadge(candidate.activity_level)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {candidate.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {candidate.total_actions.toLocaleString()} actions
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {candidate.last_activity_at
                          ? formatDistanceToNow(new Date(candidate.last_activity_at), { addSuffix: true })
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!candidates || candidates.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No candidates found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
