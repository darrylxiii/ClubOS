import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Radio, Users, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function LiveDJs() {
  const navigate = useNavigate();

  const { data: liveSessions, refetch } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          *,
          tracks:current_track_id (
            id,
            title,
            artist,
            cover_image_url
          )
        `)
        .eq('is_active', true)
        .order('started_at', { ascending: false });
      
      if (error) throw error;

      // Get profiles for each session
      const sessionsWithProfiles = await Promise.all(
        (data || []).map(async (session) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', session.dj_id)
            .single();
          
          return { ...session, profile };
        })
      );
      
      return sessionsWithProfiles;
    },
    refetchInterval: 5000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('live-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_sessions'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (!liveSessions || liveSessions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Radio className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">No DJs Live Right Now</h3>
        <p className="text-muted-foreground">
          Check back later for live broadcasts from The Quantum Club DJs
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {liveSessions.map((session: any) => (
        <Card key={session.id} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            {/* DJ Avatar */}
            <Avatar className="h-16 w-16 ring-2 ring-primary ring-offset-2">
              <AvatarImage src={session.profile?.avatar_url} />
              <AvatarFallback>
                {session.profile?.full_name?.[0] || 'DJ'}
              </AvatarFallback>
            </Avatar>

            {/* DJ Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-500 uppercase">Live</span>
              </div>
              <h3 className="font-bold text-lg truncate">
                {session.profile?.full_name || 'Anonymous DJ'}
              </h3>
              {session.tracks && (
                <p className="text-sm text-muted-foreground truncate">
                  Playing: {session.tracks.title}
                  {session.tracks.artist && ` by ${session.tracks.artist}`}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{session.listener_count || 0} listeners</span>
              </div>
            </div>

            {/* Track Cover */}
            {session.tracks?.cover_image_url && (
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
                <img
                  src={session.tracks.cover_image_url}
                  alt={session.tracks.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Tune In Button */}
            <Button
              size="lg"
              onClick={() => navigate(`/radio/${session.id}`)}
              className="flex-shrink-0"
            >
              <Play className="h-4 w-4 mr-2" />
              Tune In
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
