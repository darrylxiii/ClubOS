import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Music } from "lucide-react";
import { toast } from "sonner";
import { PlaylistDialog } from "./PlaylistDialog";
import { SpotifyPlaylistDialog } from "./SpotifyPlaylistDialog";
import { PlaylistCard } from "./PlaylistCard";

export function PlaylistManager() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [spotifyDialogOpen, setSpotifyDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select(`
          *,
          playlist_tracks(count)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist deleted');
    },
    onError: () => {
      toast.error('Failed to delete playlist');
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from('playlists')
        .update({ is_published: !isPublished })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      toast.success('Playlist updated');
    },
    onError: () => {
      toast.error('Failed to update playlist');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Playlists</h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setSpotifyDialogOpen(true)}
            variant="outline"
            className="border-green-500/50 hover:bg-green-500/10"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Spotify Playlist
          </Button>
          <Button
            onClick={() => {
              setSelectedPlaylist(null);
              setDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Playlist
          </Button>
        </div>
      </div>

      {/* Playlists Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="uploaded">Uploaded Tracks</TabsTrigger>
          <TabsTrigger value="spotify">Spotify Playlists</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : playlists && playlists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onEdit={(p) => {
                    setSelectedPlaylist(p);
                    setDialogOpen(true);
                  }}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onTogglePublish={(id, isPublished) => 
                    togglePublishMutation.mutate({ id, isPublished })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10">
              <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No playlists yet. Create your first one!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="uploaded" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : playlists?.filter(p => p.playlist_type === 'uploaded').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists
                .filter(p => p.playlist_type === 'uploaded')
                .map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onEdit={(p) => {
                      setSelectedPlaylist(p);
                      setDialogOpen(true);
                    }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onTogglePublish={(id, isPublished) => 
                      togglePublishMutation.mutate({ id, isPublished })
                    }
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10">
              <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No uploaded playlists yet.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="spotify" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : playlists?.filter(p => p.playlist_type === 'spotify').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists
                .filter(p => p.playlist_type === 'spotify')
                .map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    playlist={playlist}
                    onEdit={(p) => {
                      setSelectedPlaylist(p);
                      setDialogOpen(true);
                    }}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onTogglePublish={(id, isPublished) => 
                      togglePublishMutation.mutate({ id, isPublished })
                    }
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10">
              <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No Spotify playlists yet. Add one!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Playlist Dialog */}
      <PlaylistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        playlist={selectedPlaylist}
        onSuccess={() => {
          setDialogOpen(false);
          setSelectedPlaylist(null);
          queryClient.invalidateQueries({ queryKey: ['playlists'] });
        }}
      />

      {/* Spotify Playlist Dialog */}
      <SpotifyPlaylistDialog
        open={spotifyDialogOpen}
        onOpenChange={setSpotifyDialogOpen}
        onSuccess={() => {
          setSpotifyDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['playlists'] });
        }}
      />
    </div>
  );
}
