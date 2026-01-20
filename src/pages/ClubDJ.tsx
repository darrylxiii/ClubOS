import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useRole } from "@/contexts/RoleContext";
import { Loader2, Music2, Radio, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlaylistManager } from "@/components/club-dj/PlaylistManager";
import { TrackUploader } from "@/components/club-dj/TrackUploader";
import { DualDeckMixer } from "@/components/club-dj/DualDeckMixer";
import { TrackList } from "@/components/club-dj/TrackList";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function ClubDJ() {
  const { currentRole, loading } = useRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("playlists");
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);

  const { data: queue } = useQuery({
    queryKey: ['dj-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dj_queue')
        .select(`
          *,
          tracks (
            id,
            title,
            artist,
            file_url,
            cover_image_url,
            duration_seconds
          )
        `)
        .order('position');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: liveSession } = useQuery({
    queryKey: ['live-session'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('dj_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!isLive) {
        // Start live session
        const { data, error } = await supabase
          .from('live_sessions')
          .insert({
            dj_id: user.id,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        return { active: true, session: data };
      } else {
        // End live session
        const { error } = await supabase
          .from('live_sessions')
          .update({ 
            is_active: false, 
            ended_at: new Date().toISOString() 
          })
          .eq('dj_id', user.id)
          .eq('is_active', true);

        if (error) throw error;
        return { active: false, session: null };
      }
    },
    onSuccess: (result) => {
      setIsLive(result.active);
      toast.success(result.active ? 'You are now LIVE! 🎵' : 'Stopped live broadcast');
      queryClient.invalidateQueries({ queryKey: ['live-session'] });
      queryClient.invalidateQueries({ queryKey: ['has-live-session'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to toggle live status');
    },
  });

  useEffect(() => {
    if (liveSession?.is_active) {
      setIsLive(true);
    }
  }, [liveSession]);

  useEffect(() => {
    if (!loading && currentRole && currentRole !== 'admin') {
      console.log('[ClubDJ] Redirecting non-admin user:', currentRole);
      navigate('/home');
    }
  }, [currentRole, loading, navigate]);

  if (loading || !currentRole) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (currentRole !== 'admin') {
    console.log('[ClubDJ] Non-admin role detected:', currentRole);
    return null;
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 backdrop-blur-sm border border-primary/20">
              <Radio className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Club DJ Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage playlists, upload tracks, and DJ live for The Quantum Club Radio
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-black/20 backdrop-blur-xl border border-white/10 p-1">
            <TabsTrigger 
              value="playlists" 
              className="data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              <Music2 className="h-4 w-4 mr-2" />
              Playlists
            </TabsTrigger>
            <TabsTrigger 
              value="upload"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger 
              value="mixer"
              className="data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              <Radio className="h-4 w-4 mr-2" />
              DJ Mixer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="playlists" className="mt-6">
            <PlaylistManager />
          </TabsContent>

            <TabsContent value="upload" className="mt-6 space-y-8">
              <TrackUploader />
              <TrackList />
            </TabsContent>

          <TabsContent value="mixer" className="mt-6 space-y-6">
            {/* Live Status Banner */}
            <AnimatePresence>
              {isLive && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-3xl bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-red-500/30 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                      <div>
                        <h3 className="text-xl font-bold">DJ Now Live!</h3>
                        <p className="text-sm text-muted-foreground">
                          Broadcasting to The Quantum Club Radio
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => goLiveMutation.mutate()}
                      variant="outline"
                      className="border-red-500/50 hover:bg-red-500/20"
                    >
                      Stop Broadcast
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Go Live Button */}
            {!isLive && (
              <Button
                onClick={() => goLiveMutation.mutate()}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
              >
                <Radio className="h-4 w-4 mr-2" />
                Go Live
              </Button>
            )}

            {/* Dual Deck Mixer */}
            <DualDeckMixer
              trackA={queue?.[0]?.tracks}
              trackB={queue?.[1]?.tracks}
              liveSessionId={liveSession?.id}
              queueTracks={queue || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
