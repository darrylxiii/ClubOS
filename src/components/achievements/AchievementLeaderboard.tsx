import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Crown, Sparkles, TrendingUp, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  avatar_url: string;
  total_achievements: number;
  total_xp: number;
  rank_position: number;
  weekly_achievements: number;
  monthly_achievements: number;
  rarest_achievement?: {
    name: string;
    icon_emoji: string;
    rarity: string;
  };
}

export const AchievementLeaderboard = () => {
  const { user } = useAuth();
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardEntry[]>([]);
  const [weeklyLeaders, setWeeklyLeaders] = useState<LeaderboardEntry[]>([]);
  const [monthlyLeaders, setMonthlyLeaders] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [user?.id]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // Fetch all-time leaderboard
      const { data: allTime } = await supabase
        .from('achievement_leaderboard')
        .select(`
          user_id,
          total_achievements,
          total_xp,
          rank_position,
          weekly_achievements,
          monthly_achievements,
          rarest_achievement_id
        `)
        .order('total_xp', { ascending: false })
        .limit(100);

      if (allTime) {
        const leaders = await enrichLeaderboardData(allTime);
        setAllTimeLeaders(leaders);
      }

      // Weekly leaders (sort by weekly_achievements)
      const weeklyData = allTime
        ? [...allTime].sort((a, b) => b.weekly_achievements - a.weekly_achievements).slice(0, 50)
        : [];
      const weeklyLeaders = await enrichLeaderboardData(weeklyData);
      setWeeklyLeaders(weeklyLeaders);

      // Monthly leaders (sort by monthly_achievements)
      const monthlyData = allTime
        ? [...allTime].sort((a, b) => b.monthly_achievements - a.monthly_achievements).slice(0, 50)
        : [];
      const monthlyLeaders = await enrichLeaderboardData(monthlyData);
      setMonthlyLeaders(monthlyLeaders);

      // Fetch user's position
      if (user?.id) {
        const { data: userEntry } = await supabase
          .from('achievement_leaderboard')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (userEntry) {
          const enriched = await enrichLeaderboardData([userEntry]);
          setUserPosition(enriched[0] || null);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichLeaderboardData = async (data: any[]): Promise<LeaderboardEntry[]> => {
    const userIds = data.map((d) => d.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    const achievementIds = data
      .map((d) => d.rarest_achievement_id)
      .filter(Boolean);

    const { data: achievements } = await supabase
      .from('quantum_achievements')
      .select('id, name, icon_emoji, rarity')
      .in('id', achievementIds);

    const achievementMap = new Map(achievements?.map((a) => [a.id, a]) || []);

    return data.map((entry) => {
      const profile = profileMap.get(entry.user_id);
      const achievement = entry.rarest_achievement_id
        ? achievementMap.get(entry.rarest_achievement_id)
        : null;

      return {
        user_id: entry.user_id,
        full_name: profile?.full_name || 'Quantum Member',
        avatar_url: profile?.avatar_url || '',
        total_achievements: entry.total_achievements,
        total_xp: entry.total_xp,
        rank_position: entry.rank_position,
        weekly_achievements: entry.weekly_achievements,
        monthly_achievements: entry.monthly_achievements,
        rarest_achievement: achievement
          ? {
              name: achievement.name,
              icon_emoji: achievement.icon_emoji,
              rarity: achievement.rarity,
            }
          : undefined,
      };
    });
  };

  const getRankIcon = (position: number) => {
    if (position === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (position === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (position === 3) return <Medal className="h-6 w-6 text-orange-600" />;
    return <span className="text-sm font-bold text-muted-foreground">#{position}</span>;
  };

  const renderLeaderboard = (leaders: LeaderboardEntry[], metric: 'total_xp' | 'weekly_achievements' | 'monthly_achievements') => (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-2">
        {leaders.map((leader, index) => {
          const isCurrentUser = leader.user_id === user?.id;
          const position = index + 1;

          return (
            <Card
              key={leader.user_id}
              className={`
                p-4 transition-all duration-200 hover:border-primary/30
                ${isCurrentUser ? 'border-primary bg-primary/5' : ''}
                ${position <= 3 ? 'border-2' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(position)}
                </div>

                {/* Avatar */}
                <Avatar className="h-12 w-12 border-2 border-border">
                  <AvatarImage src={leader.avatar_url} />
                  <AvatarFallback>{leader.full_name.charAt(0)}</AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold truncate">
                      {leader.full_name}
                      {isCurrentUser && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          You
                        </Badge>
                      )}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {leader.total_achievements} achievements
                    </span>
                    {leader.rarest_achievement && (
                      <Badge variant="outline" className="text-xs capitalize">
                        <span className="mr-1">{leader.rarest_achievement.icon_emoji}</span>
                        {leader.rarest_achievement.rarity}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xl font-bold text-primary">
                    <Sparkles className="h-5 w-5" />
                    {metric === 'total_xp'
                      ? leader.total_xp.toLocaleString()
                      : metric === 'weekly_achievements'
                      ? leader.weekly_achievements
                      : leader.monthly_achievements}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric === 'total_xp'
                      ? 'Total XP'
                      : metric === 'weekly_achievements'
                      ? 'This Week'
                      : 'This Month'}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}

        {leaders.length === 0 && (
          <Card className="p-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No leaderboard data available yet
            </p>
          </Card>
        )}
      </div>
    </ScrollArea>
  );

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading leaderboard...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Position Card */}
      {userPosition && (
        <Card className="glass p-6 border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-4 border-primary/30">
                <AvatarImage src={userPosition.avatar_url} />
                <AvatarFallback>{userPosition.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold">Your Ranking</h3>
                <p className="text-sm text-muted-foreground">
                  #{userPosition.rank_position} globally
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                {userPosition.total_xp.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Total XP</p>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard Tabs */}
      <Card className="glass p-6">
        <Tabs defaultValue="all-time" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all-time" className="gap-2">
              <Trophy className="h-4 w-4" />
              All-Time
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-2">
              <Calendar className="h-4 w-4" />
              Monthly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-time">
            {renderLeaderboard(allTimeLeaders, 'total_xp')}
          </TabsContent>

          <TabsContent value="weekly">
            {renderLeaderboard(weeklyLeaders, 'weekly_achievements')}
          </TabsContent>

          <TabsContent value="monthly">
            {renderLeaderboard(monthlyLeaders, 'monthly_achievements')}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};
