import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock } from "lucide-react";

interface Strategist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  current_title: string | null;
}

function formatSla(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function CompactStrategist() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['compact-strategist', user?.id],
    queryFn: async () => {
      const { data: cp } = await supabase
        .from('candidate_profiles')
        .select('assigned_strategist_id')
        .eq('id', user!.id)
        .maybeSingle();

      if (!cp?.assigned_strategist_id) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, current_title')
        .eq('id', cp.assigned_strategist_id)
        .maybeSingle();

      if (!profile) return null;

      // Compute SLA
      let avgResponseMin: number | null = null;
      try {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user!.id);

        if (participants?.length) {
          const convIds = participants.map(p => p.conversation_id);
          const { data: msgs } = await supabase
            .from('messages')
            .select('conversation_id, sender_id, created_at')
            .in('conversation_id', convIds)
            .order('created_at', { ascending: true })
            .limit(500);

          if (msgs?.length) {
            const byConv = new Map<string, typeof msgs>();
            for (const m of msgs) {
              const arr = byConv.get(m.conversation_id) || [];
              arr.push(m);
              byConv.set(m.conversation_id, arr);
            }

            const deltas: number[] = [];
            for (const [, convMsgs] of byConv) {
              for (let i = 0; i < convMsgs.length - 1; i++) {
                if (convMsgs[i].sender_id === user!.id) {
                  for (let j = i + 1; j < convMsgs.length; j++) {
                    if (convMsgs[j].sender_id === profile.id) {
                      const delta =
                        (new Date(convMsgs[j].created_at).getTime() -
                          new Date(convMsgs[i].created_at).getTime()) /
                        60000;
                      if (delta > 0 && delta < 10080) deltas.push(delta);
                      break;
                    }
                  }
                }
              }
            }

            if (deltas.length >= 2) {
              avgResponseMin = deltas.reduce((a, b) => a + b, 0) / deltas.length;
            }
          }
        }
      } catch (e) {
        console.error("SLA compute error:", e);
      }

      return { strategist: profile as Strategist, avgResponseMin };
    },
    enabled: !!user,
    staleTime: 30 * 60_000,
  });

  if (!data?.strategist) return null;

  const { strategist, avgResponseMin } = data;

  const initials = strategist.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="glass-subtle rounded-2xl px-5 py-3.5 flex items-center gap-3">
      <Avatar className="h-9 w-9 border border-border/30">
        <AvatarImage src={strategist.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{strategist.full_name}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-muted-foreground truncate">
            {strategist.current_title || "Talent Strategist"}
          </p>
          {avgResponseMin !== null && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <Clock className="h-2.5 w-2.5" />
              ~{formatSla(avgResponseMin)}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="shrink-0 h-8"
        onClick={() => navigate(`/messages?to=${strategist.id}`)}
      >
        <MessageCircle className="h-3.5 w-3.5 mr-1" />
        Message
      </Button>
    </div>
  );
}
