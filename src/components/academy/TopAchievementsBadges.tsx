import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Achievement {
  id: string;
  name: string;
  icon: string;
  unlocked_at: string;
}

export const TopAchievementsBadges = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_quantum_achievements')
        .select(`
          id,
          unlocked_at,
          quantum_achievements (
            name,
            icon
          )
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      if (data) {
        const mapped = data.map((item: any) => ({
          id: item.id,
          name: item.quantum_achievements.name,
          icon: item.quantum_achievements.icon,
          unlocked_at: item.unlocked_at,
        }));
        setAchievements(mapped);
      }
      setLoading(false);
    };

    fetchAchievements();
  }, []);

  if (loading) {
    return <Card><CardContent className="h-32 animate-pulse" /></Card>;
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete courses to unlock achievements!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="h-4 w-4" />
          Recent Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              title={achievement.name}
            >
              <span className="text-3xl">{achievement.icon}</span>
              <span className="text-xs text-center line-clamp-2">{achievement.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
