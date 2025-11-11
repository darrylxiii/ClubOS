import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, Play, Heart } from "lucide-react";
import { motion } from "framer-motion";

const MOOD_FILTERS = [
  { label: "All", value: null },
  { label: "🎯 Focus", value: "Focus" },
  { label: "💪 Energy", value: "Energy" },
  { label: "😌 Chill", value: "Chill" },
  { label: "❤️ Romantic", value: "Romantic" },
  { label: "🎉 Party", value: "Party" },
  { label: "🧘 Zen", value: "Zen" },
];

export function RadioPlaylists() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: playlists, isLoading } = useQuery({
    queryKey: ['spotify-playlists', selectedMood],
    queryFn: async () => {
      let query = supabase
        .from('playlists')
        .select('*')
        .eq('playlist_type', 'spotify')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('play_count', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;

      // Filter by mood on client side since we're using array contains
      if (selectedMood) {
        return data.filter(p => 
          p.mood_tags?.some((tag: string) => 
            tag.toLowerCase().includes(selectedMood.toLowerCase())
          )
        );
      }

      return data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">🎵 Choose Your Vibe</h2>
        <p className="text-muted-foreground">
          Stream curated Spotify playlists for every mood
        </p>
      </div>

      {/* Mood Filters */}
      <div className="flex flex-wrap gap-2">
        {MOOD_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant={selectedMood === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMood(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Playlists Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-96 rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : playlists && playlists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((playlist) => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="group relative overflow-hidden bg-black/20 backdrop-blur-xl border border-white/10 hover:border-primary/30 transition-all duration-300">
                {/* Spotify Embed Preview */}
                <div className="aspect-square relative">
                  <iframe
                    src={playlist.spotify_embed_url}
                    className="w-full h-full border-0"
                    allow="encrypted-media"
                    loading="lazy"
                  />
                  
                  {/* Featured Badge */}
                  {playlist.is_featured && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      ⭐ Featured
                    </div>
                  )}

                  {/* Spotify Badge */}
                  <div className="absolute bottom-3 right-3">
                    <img
                      src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png"
                      alt="Spotify"
                      className="h-6 opacity-80"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-lg truncate">{playlist.name}</h3>
                    {playlist.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {playlist.description}
                      </p>
                    )}
                  </div>

                  {/* Mood Tags */}
                  {playlist.mood_tags && playlist.mood_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {playlist.mood_tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {playlist.mood_tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{playlist.mood_tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Stats & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {playlist.play_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {playlist.like_count || 0}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/radio/playlist/${playlist.id}`)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Play
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 bg-black/20 backdrop-blur-xl">
          <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            {selectedMood 
              ? `No playlists found for ${selectedMood} mood` 
              : 'No playlists available yet'}
          </p>
        </Card>
      )}
    </div>
  );
}
