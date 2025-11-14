import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const WeeklyGoalWidget = () => {
  const [hoursThisWeek, setHoursThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const weeklyGoal = 5; // Default goal of 5 hours per week

  useEffect(() => {
    setLoading(true);
    const fetchWeeklyProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('learner_progress')
        .select('time_spent_minutes')
        .eq('user_id', user.id)
        .gte('last_accessed_at', startOfWeek.toISOString());

      if (data) {
        const totalMinutes = data.reduce((sum: number, item: any) => sum + (item.time_spent_minutes || 0), 0);
        setHoursThisWeek(Math.round((totalMinutes / 60) * 10) / 10);
      }
      setLoading(false);
    };

    fetchWeeklyProgress();
  }, []);

  const progress = Math.min((hoursThisWeek / weeklyGoal) * 100, 100);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-24 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          <div className="h-2 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Weekly Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{hoursThisWeek}h</span>
          <span className="text-muted-foreground">/ {weeklyGoal}h</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {progress >= 100 
            ? '🎉 Goal achieved! Keep it up!' 
            : `${(weeklyGoal - hoursThisWeek).toFixed(1)}h left to reach your goal`}
        </p>
      </CardContent>
    </Card>
  );
};
