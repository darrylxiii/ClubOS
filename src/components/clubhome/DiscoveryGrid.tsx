import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Bookmark, MessageSquare, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

// ── For You column ──
function ForYouColumn() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['discovery-for-you', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: matches } = await supabase
        .from('match_scores')
        .select('job_id, overall_score')
        .eq('user_id', user.id)
        .gte('overall_score', 70)
        .order('overall_score', { ascending: false })
        .limit(2);

      if (!matches?.length) return [];

      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const ids = matches.filter(m => uuidRe.test(m.job_id)).map(m => m.job_id);
      if (!ids.length) return [];

      const { data: jobData } = await supabase
        .from('jobs')
        .select('id, title, location, companies:company_id(name)')
        .in('id', ids);

      return (jobData || []).map(j => ({
        ...j,
        score: matches.find(m => m.job_id === j.id)?.overall_score || 0,
        company_name: (j.companies as any)?.name || '',
      }));
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  return (
    <Column
      icon={<Sparkles className="h-3.5 w-3.5" />}
      title="For you"
      seeAllPath="/jobs"
      loading={isLoading}
      empty={!jobs?.length}
      emptyText={!user ? "Sign in for matches" : "No matches yet — we're working on it"}
    >
      {jobs?.map(job => (
        <button
          key={job.id}
          onClick={() => navigate(`/jobs/${job.id}`)}
          className="w-full text-left p-3 rounded-xl bg-card/30 border border-border/20 hover:bg-card/50 hover:border-border/40 transition-all group"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{job.title}</p>
            <Badge variant="outline" className="text-[10px] shrink-0 border-success/30 text-success">
              {Math.round(job.score)}%
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.company_name}</span>
            {job.location && (
              <>
                <MapPin className="h-3 w-3 shrink-0 ml-1" />
                <span className="truncate">{job.location}</span>
              </>
            )}
          </div>
        </button>
      ))}
    </Column>
  );
}

// ── Saved column ──
function SavedColumn() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: saved, isLoading } = useQuery({
    queryKey: ['discovery-saved', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('saved_jobs')
        .select('id, job_id, job:jobs(id, title, location, company:companies(name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2);
      return (data || []) as any[];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const count = saved?.length || 0;

  return (
    <Column
      icon={<Bookmark className="h-3.5 w-3.5" />}
      title="Saved"
      count={count}
      seeAllPath="/jobs?filter=saved"
      loading={isLoading}
      empty={!count}
      emptyText="No saved roles yet"
    >
      {saved?.map((s: any) => (
        <button
          key={s.id}
          onClick={() => navigate(`/jobs/${s.job_id}`)}
          className="w-full text-left p-3 rounded-xl bg-card/30 border border-border/20 hover:bg-card/50 hover:border-border/40 transition-all group"
        >
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {s.job?.title || 'Untitled'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{s.job?.company?.name || 'Company'}</span>
          </div>
        </button>
      ))}
    </Column>
  );
}

// ── Messages column ──
function MessagesColumn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: msgData, isLoading: loading } = useQuery({
    queryKey: ['discovery-messages', user?.id],
    queryFn: async () => {
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user!.id);

      if (!parts?.length) return { msgs: [], unread: 0 };

      const { data: recent } = await supabase
        .from('messages')
        .select('id, content, created_at, is_read, sender_id')
        .in('conversation_id', parts.map(p => p.conversation_id))
        .neq('sender_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(2);

      if (!recent?.length) return { msgs: [], unread: 0 };

      const senderIds = [...new Set(recent.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      const pm = new Map(profiles?.map(p => [p.id, p]) || []);

      const formatted = recent.map(m => ({
        ...m,
        sender_name: pm.get(m.sender_id)?.full_name || 'Unknown',
        sender_avatar: pm.get(m.sender_id)?.avatar_url,
      }));

      return { msgs: formatted, unread: formatted.filter(m => !m.is_read).length };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Realtime subscription for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('discovery-messages-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        // Refetch on new message
        window.dispatchEvent(new CustomEvent('invalidate-messages'));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const msgs = msgData?.msgs || [];
  const unread = msgData?.unread || 0;

  return (
    <Column
      icon={<MessageSquare className="h-3.5 w-3.5" />}
      title="Messages"
      count={unread || undefined}
      countVariant="unread"
      seeAllPath="/messages"
      loading={loading}
      empty={!msgs.length}
      emptyText="No messages yet"
    >
      {msgs.map(m => (
        <button
          key={m.id}
          onClick={() => navigate('/messages')}
          className={`w-full text-left p-3 rounded-xl border transition-all group ${
            !m.is_read ? 'bg-primary/5 border-primary/20' : 'bg-card/30 border-border/20 hover:bg-card/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={m.sender_avatar || undefined} />
              <AvatarFallback className="text-[9px]">{m.sender_name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium truncate">{m.sender_name}</span>
            {!m.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{m.content}</p>
          <span className="text-[10px] text-muted-foreground/60 mt-1 block">
            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
          </span>
        </button>
      ))}
    </Column>
  );
}

// ── Shared Column wrapper ──
function Column({
  icon,
  title,
  count,
  countVariant,
  seeAllPath,
  loading,
  empty,
  emptyText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  countVariant?: 'unread';
  seeAllPath: string;
  loading: boolean;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 min-w-0 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {icon}
          {title}
          {count !== undefined && count > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none ${
              countVariant === 'unread'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {count}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] text-muted-foreground px-2"
          onClick={() => navigate(seeAllPath)}
        >
          See all
          <ArrowRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : empty ? (
        <div className="rounded-xl border border-dashed border-border/30 py-6 text-center">
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

// ── Main grid ──
export function DiscoveryGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
      <ForYouColumn />
      <SavedColumn />
      <MessagesColumn />
    </div>
  );
}
