import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Clock, Calendar, Bell, Radio } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { useTranslation } from 'react-i18next';

/**
 * Upcoming DJ schedule — shows who's playing when.
 * Uses the `dj_schedules` table if it exists, otherwise shows
 * recent live sessions as a "past shows" fallback.
 */

interface ScheduleEntry {
  id: string;
  dj_name: string;
  dj_avatar: string | null;
  title: string;
  starts_at: string;
  duration_minutes: number;
  genre?: string;
  is_live: boolean;
}

function formatScheduleTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isPast(date)) return `Started ${formatDistanceToNow(date, { addSuffix: true })}`;
  if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`;
  if (isTomorrow(date)) return `Tomorrow at ${format(date, 'HH:mm')}`;
  return format(date, 'EEE, MMM d · HH:mm');
}

export const DJSchedule = memo(function DJSchedule() {
  const { t } = useTranslation('common');
  // Fetch recent + upcoming sessions from live_sessions with profiles
  const { data: schedule } = useQuery({
    queryKey: ['dj-schedule'],
    queryFn: async () => {
      // Get recent/active sessions as "schedule"
      const { data, error } = await supabase
        .from('live_sessions')
        .select('id, dj_id, started_at, ended_at, is_active, listener_count')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const entries: ScheduleEntry[] = await Promise.all(
        (data || []).map(async (s) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', s.dj_id)
            .maybeSingle();

          const duration = s.ended_at
            ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000)
            : null;

          return {
            id: s.id,
            dj_name: profile?.full_name || 'Anonymous DJ',
            dj_avatar: profile?.avatar_url || null,
            title: s.is_active ? 'Live Now' : 'Past Set',
            starts_at: s.started_at,
            duration_minutes: duration || 60,
            is_live: s.is_active || false,
          };
        })
      );

      return entries;
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });

  if (!schedule || schedule.length === 0) return null;

  const liveNow = schedule.filter((s) => s.is_live);
  const past = schedule.filter((s) => !s.is_live).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary/60" />
        <h3 className="text-sm font-semibold">DJ Sessions</h3>
      </div>

      <div className="space-y-2">
        {/* Live Now */}
        {liveNow.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={entry.dj_avatar || undefined} />
                <AvatarFallback className="text-xs">{entry.dj_name[0]}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 animate-pulse ring-2 ring-background" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.dj_name}</p>
              <div className="flex items-center gap-1 text-xs text-red-400">
                <Radio className="h-3 w-3" />
                <span>{t('common:liveNow', 'Live Now')}</span>
              </div>
            </div>
            <Badge variant="destructive" className="text-[10px]">LIVE</Badge>
          </motion.div>
        ))}

        {/* Past sessions */}
        {past.map((entry, i) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: (liveNow.length + i) * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={entry.dj_avatar || undefined} />
              <AvatarFallback className="text-xs">{entry.dj_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{entry.dj_name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatScheduleTime(entry.starts_at)}</span>
                <span>· {entry.duration_minutes}m</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});
