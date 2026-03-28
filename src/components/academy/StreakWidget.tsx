import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Flame, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

const MAX_FREEZES_PER_WEEK = 2;

export const StreakWidget = () => {
  const { t } = useTranslation('common');
  const [streak, setStreak] = useState(0);
  const [freezesUsed, setFreezesUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStreak = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      <div className="glass-subtle rounded-2xl p-5 border border-orange-500/10">
        <div className="h-5 w-28 bg-muted animate-pulse rounded mb-4" />
        <div className="h-12 w-16 bg-muted animate-pulse rounded mb-2" />
        <div className="h-4 w-40 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="glass-subtle rounded-2xl p-5 border border-orange-500/10">
      <div className="text-sm font-medium flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-orange-500" />
        Learning Streak
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-bold text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]">
          {streak}
        </span>
        <span className="text-muted-foreground">days</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {t('academy.keepLearningDailyToMaintainYourStreak')}
      </p>

      {/* Streak Freeze */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-500/10">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Streak Freezes: {MAX_FREEZES_PER_WEEK - freezesUsed}/{MAX_FREEZES_PER_WEEK}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          disabled={freezesUsed >= MAX_FREEZES_PER_WEEK}
          onClick={async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) return;
            await supabase.from('learning_analytics').upsert({
              user_id: currentUser.id,
              date: new Date().toISOString().split('T')[0],
              streak_days: streak,
            }, { onConflict: 'user_id,date' });
            setFreezesUsed(prev => prev + 1);
            notify.success("Streak freeze activated!", { description: "Your streak is protected for today" });
          }}
        >
          Use Freeze
        </Button>
      </div>
    </div>
  );
};
