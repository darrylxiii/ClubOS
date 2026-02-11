import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Music, Trash2, Play, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAudioManager } from "@/hooks/useAudioManager";
import { useRef } from "react";

export function TrackList() {
  const queryClient = useQueryClient();
  const { play: managedPlay } = useAudioManager('preview');
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const { data: tracks, isLoading } = useQuery({
    queryKey: ['tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      toast.success('Track deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete track');
    },
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (trackId: string) => {
      // Get current max position
      const { data: queueData } = await supabase
        .from('dj_queue')
        .select('position')
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = queueData && queueData.length > 0 
        ? (queueData[0].position || 0) + 1 
        : 1;

      const { error } = await supabase
        .from('dj_queue')
        .insert({
          track_id: trackId,
          position: nextPosition,
          is_playing: false
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dj-queue'] });
      toast.success('Track added to DJ queue');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add track to queue');
    },
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="text-center py-12 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10">
        <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No tracks uploaded yet. Upload your first track!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Music className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Uploaded Tracks</h2>
        <Badge variant="secondary" className="ml-2">{tracks.length}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="group relative rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 p-4 hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-4">
              {/* Cover */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                {track.cover_image_url ? (
                  <img
                    src={track.cover_image_url}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{track.title}</h3>
                {track.artist && (
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {track.duration_seconds && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(track.duration_seconds)}
                    </span>
                  )}
                  {track.tags && Array.isArray(track.tags) && track.tags.length > 0 && (
                    <div className="flex gap-1">
                      {track.tags.slice(0, 2).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs py-0">
                          {tag}
                        </Badge>
                      ))}
                      {track.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs py-0">
                          +{track.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => addToQueueMutation.mutate(track.id)}
                  disabled={addToQueueMutation.isPending}
                  title="Add to DJ Queue"
                >
                  <ListPlus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (previewAudioRef.current) {
                      previewAudioRef.current.pause();
                    }
                    const audio = new Audio(track.file_url);
                    previewAudioRef.current = audio;
                    managedPlay(audio).catch(err => {
                      console.error('Preview play error:', err);
                      toast.error('Failed to preview track');
                    });
                  }}
                  title="Preview"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(track.id)}
                  disabled={deleteMutation.isPending}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
