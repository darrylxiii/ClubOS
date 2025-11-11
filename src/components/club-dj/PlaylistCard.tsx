import { Music, Edit2, Trash2, Eye, EyeOff, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface PlaylistCardProps {
  playlist: any;
  onEdit: (playlist: any) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, isPublished: boolean) => void;
}

export function PlaylistCard({ playlist, onEdit, onDelete, onTogglePublish }: PlaylistCardProps) {
  const trackCount = playlist.playlist_tracks?.[0]?.count || 0;
  const isSpotify = playlist.playlist_type === 'spotify';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative rounded-3xl overflow-hidden bg-black/20 backdrop-blur-xl border border-white/10 hover:border-primary/30 transition-all duration-300"
    >
      {/* Cover Image */}
      <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        {playlist.cover_image_url ? (
          <img
            src={playlist.cover_image_url}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-20 w-20 text-primary/40" />
          </div>
        )}

        {/* Spotify Badge */}
        {isSpotify && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded bg-green-500 text-white text-xs font-bold">
            Spotify
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="bg-card/10 hover:bg-card/20 text-white"
            onClick={() => onEdit(playlist)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="bg-card/10 hover:bg-card/20 text-white"
            onClick={() => onTogglePublish(playlist.id, playlist.is_published)}
          >
            {playlist.is_published ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="bg-card/10 hover:bg-card/20 text-white"
            onClick={() => onDelete(playlist.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Live Badge */}
        {playlist.is_live && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-lg truncate">{playlist.name}</h3>
        {playlist.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {playlist.description}
          </p>
        )}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {isSpotify ? `${playlist.play_count || 0} plays` : `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            playlist.is_published 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {playlist.is_published ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
