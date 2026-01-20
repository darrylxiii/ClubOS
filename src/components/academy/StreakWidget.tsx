import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const StreakWidget = () => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreak = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query activity_timeline for consecutive days
      const { data } = await supabase
        .from('activity_timeline')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        let currentStreak = 1;
        let lastDate = new Date(data[0].created_at);
        lastDate.setHours(0, 0, 0, 0);

        for (let i = 1; i < data.length; i++) {
          const date = new Date(data[i].created_at);
          date.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            currentStreak++;
            lastDate = date;
          } else if (diffDays > 1) {
            break;
          }
        }
        setStreak(currentStreak);
      }
      setLoading(false);
    };

    fetchStreak();
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
        <CardHeader className="pb-3">
          <div className="h-5 w-28 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-10 w-16 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-40 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Learning Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-orange-500">{streak}</span>
          <span className="text-muted-foreground">days</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Keep learning daily to maintain your streak!
        </p>
      </CardContent>
    </Card>
  );
};
