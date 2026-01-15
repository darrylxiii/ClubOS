import { memo, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Flame, Medal } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  rank: number;
  score: number;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

export const Leaderboard = memo(() => {
  const [monthlyLeaders, setMonthlyLeaders] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: monthly } = await supabase
      .from('leaderboard_entries' as any)
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('leaderboard_type', 'monthly_completions')
      .gte('period_start', periodStart.toISOString())
      .order('rank')
      .limit(10);

    const { data: allTime } = await supabase
      .from('leaderboard_entries' as any)
      .select(`
        *,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('leaderboard_type', 'all_time_streak')
      .order('rank')
      .limit(10);

    if (monthly) setMonthlyLeaders(monthly as any);
    if (allTime) setAllTimeLeaders(allTime as any);
    setLoading(false);
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-amber-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const LeaderboardList = ({ entries }: { entries: LeaderboardEntry[] }) => (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Card key={entry.user_id} className="p-4 hover:bg-accent transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 text-center">
              {getMedalIcon(entry.rank)}
            </div>
            
            <Avatar className="w-12 h-12">
              <AvatarImage src={entry.profiles?.avatar_url} />
              <AvatarFallback>
                {entry.profiles?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="font-medium">{entry.profiles?.full_name || 'Anonymous'}</p>
              <p className="text-sm text-muted-foreground">
                {entry.score} {entry.score === 1 ? 'course' : 'courses'}
              </p>
            </div>

            {entry.rank <= 3 && (
              <Badge variant="secondary" className="ml-auto">
                Top {entry.rank}
              </Badge>
            )}
          </div>
        </Card>
      ))}

      {entries.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No entries yet</p>
        </Card>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Leaderboard</h2>
        <p className="text-muted-foreground">
          Top learners in The Quantum Club Academy
        </p>
      </div>

      <Tabs defaultValue="monthly" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monthly" className="gap-2">
            <Flame className="w-4 h-4" />
            This Month
          </TabsTrigger>
          <TabsTrigger value="alltime" className="gap-2">
            <Trophy className="w-4 h-4" />
            All Time
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <LeaderboardList entries={monthlyLeaders} />
        </TabsContent>

        <TabsContent value="alltime">
          <LeaderboardList entries={allTimeLeaders} />
        </TabsContent>
      </Tabs>
    </div>
  );
});

Leaderboard.displayName = 'Leaderboard';
