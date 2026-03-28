import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Trophy, Clock, Users, Flame } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DJStats {
  dj_id: string;
  full_name: string;
  avatar_url: string | null;
  total_sessions: number;
  total_minutes: number;
  peak_listeners: number;
  total_listeners: number;
}

const RANK_COLORS = ['text-yellow-400', 'text-zinc-300', 'text-amber-600'];
const RANK_BADGES = ['🥇', '🥈', '🥉'];

export const DJLeaderboard = memo(function DJLeaderboard() {
  const { data: leaderboard } = useQuery({
    queryKey: ['dj-leaderboard'],
    queryFn: async () => {
      // Aggregate stats from live_sessions
      const { data: sessions, error } = await supabase
        .from('live_sessions')
        .select('dj_id, started_at, ended_at, listener_count')
        .not('ended_at', 'is', null);

      if (error) throw error;

      // Group by DJ
      const djMap = new Map<string, {
        total_sessions: number;
        total_minutes: number;
        peak_listeners: number;
        total_listeners: number;
      }>();

      for (const s of sessions || []) {
        const existing = djMap.get(s.dj_id) || {
          total_sessions: 0, total_minutes: 0, peak_listeners: 0, total_listeners: 0,
        };
        existing.total_sessions++;
        if (s.started_at && s.ended_at) {
          existing.total_minutes += Math.round(
            (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
          );
        }
        existing.peak_listeners = Math.max(existing.peak_listeners, s.listener_count || 0);
        existing.total_listeners += s.listener_count || 0;
        djMap.set(s.dj_id, existing);
      }

      // Fetch profiles
      const djIds = Array.from(djMap.keys());
      if (djIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', djIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      const stats: DJStats[] = djIds.map((id) => {
        const s = djMap.get(id)!;
        const p = profileMap.get(id);
        return {
          dj_id: id,
          full_name: p?.full_name || 'Anonymous DJ',
          avatar_url: p?.avatar_url || null,
          ...s,
        };
      });

      // Sort by total listeners (engagement score)
      return stats.sort((a, b) => b.total_listeners - a.total_listeners).slice(0, 10);
    },
    staleTime: 300000, // 5 min
  });

  if (!leaderboard || leaderboard.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-500/70" />
        <h3 className="text-sm font-semibold">Top DJs</h3>
      </div>

      <div className="space-y-1.5">
        {leaderboard.map((dj, i) => (
          <motion.div
            key={dj.dj_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-colors"
          >
            {/* Rank */}
            <div className="w-6 text-center flex-shrink-0">
              {i < 3 ? (
                <span className="text-base">{RANK_BADGES[i]}</span>
              ) : (
                <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>
              )}
            </div>

            {/* Avatar */}
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={dj.avatar_url || undefined} />
              <AvatarFallback className="text-xs">{dj.full_name[0]}</AvatarFallback>
            </Avatar>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${i < 3 ? RANK_COLORS[i] : ''}`}>
                {dj.full_name}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Flame className="h-2.5 w-2.5" />
                  {dj.total_sessions} sets
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {dj.total_minutes < 60
                    ? `${dj.total_minutes}m`
                    : `${Math.floor(dj.total_minutes / 60)}h ${dj.total_minutes % 60}m`}
                </span>
                <span className="flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" />
                  {dj.peak_listeners} peak
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});
