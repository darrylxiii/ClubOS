import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Target, TrendingUp, Clock, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StrategistActivity {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  last_activity_at: string | null;
  total_actions: number;
  activity_level: string;
  online_status: 'online' | 'away' | 'offline';
}

export function StrategistIntelligenceTab() {
  const { data: strategists, isLoading } = useQuery({
    queryKey: ['strategist-intelligence'],
    queryFn: async () => {
      // Get all strategists from user_roles
      const { data: strategistRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'strategist');

      if (rolesError) throw rolesError;

      const strategistIds = strategistRoles?.map(r => r.user_id) || [];
      
      if (strategistIds.length === 0) return [];

      // Get profiles for strategists
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', strategistIds);

      if (profilesError) throw profilesError;

      // Get activity tracking for strategists
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity_tracking')
        .select('*')
        .in('user_id', strategistIds);

      if (activityError) throw activityError;

      // Combine data
      const result: StrategistActivity[] = profiles?.map(profile => {
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
    total: strategists?.length || 0,
    online: strategists?.filter(s => s.online_status === 'online').length || 0,
    active: strategists?.filter(s => s.activity_level !== 'inactive').length || 0,
    totalActions: strategists?.reduce((sum, s) => sum + s.total_actions, 0) || 0,
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
    return <div className="p-6">Loading strategist intelligence...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Strategists</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Team members</p>
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
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
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
            <Target className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategist List */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Strategist Activity</CardTitle>
          <CardDescription>Real-time monitoring of strategist team members</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {strategists?.map((strategist) => (
                <div 
                  key={strategist.user_id} 
                  className="p-4 rounded-lg bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={strategist.avatar_url || undefined} />
                          <AvatarFallback>
                            {strategist.full_name?.charAt(0) || (strategist.email ?? '?').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(strategist.online_status)}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {strategist.full_name || 'Unnamed Strategist'}
                          </span>
                          {getActivityBadge(strategist.activity_level)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {strategist.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {strategist.total_actions.toLocaleString()} actions
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {strategist.last_activity_at
                          ? formatDistanceToNow(new Date(strategist.last_activity_at), { addSuffix: true })
                          : 'Never'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!strategists || strategists.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No strategists found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
