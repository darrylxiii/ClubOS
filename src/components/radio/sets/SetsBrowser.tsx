import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock, Eye, Heart, Video, Music, Sparkles, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { DJSet } from './types';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const QUALITY_BADGES: Record<string, { label: string; className: string }> = {
  '4k': { label: '4K', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  '1080p': { label: 'HD', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  '720p': { label: '720p', className: 'bg-white/10 text-white/60 border-white/10' },
};

const GENRE_FILTERS = [
  'All', 'House', 'Techno', 'Trance', 'Deep House', 'Tech House',
  'Melodic Techno', 'Drum & Bass', 'Disco', 'Ambient', 'Hip-Hop',
];

// ── Featured Hero Set ──────────────────────────────────────────────────────────

function FeaturedHero({ set, onClick }: { set: DJSet; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative rounded-3xl overflow-hidden cursor-pointer group h-[400px] md:h-[500px]"
      onClick={onClick}
    >
      {/* Background */}
      <div className="absolute inset-0">
        {set.thumbnail_url || set.cover_image_url ? (
          <img
            src={set.thumbnail_url || set.cover_image_url || ''}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 space-y-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/80 text-white border-0">
            <Sparkles className="h-3 w-3 mr-1" />
            Featured Set
          </Badge>
          {set.video_quality && QUALITY_BADGES[set.video_quality] && (
            <Badge variant="outline" className={QUALITY_BADGES[set.video_quality].className}>
              {set.has_video && <Video className="h-3 w-3 mr-1" />}
              {QUALITY_BADGES[set.video_quality].label}
            </Badge>
          )}
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-white max-w-xl leading-tight">
          {set.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-white/70">
          <span className="font-medium text-white">{set.dj_name}</span>
          {set.venue && <span>{set.venue}</span>}
          {set.genre && <Badge variant="secondary" className="text-xs">{set.genre}</Badge>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(set.duration_seconds)}
          </span>
        </div>

        {set.description && (
          <p className="text-sm text-white/50 max-w-lg line-clamp-2">{set.description}</p>
        )}

        <Button
          size="lg"
          className="bg-white text-black hover:bg-white/90 font-semibold rounded-full px-10 gap-2 mt-2"
        >
          <Play className="h-5 w-5" fill="currentColor" />
          {set.has_video ? 'Watch Now' : 'Listen Now'}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Set Card ───────────────────────────────────────────────────────────────────

function SetCard({ set, onClick, index }: { set: DJSet; onClick: () => void; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black/30 mb-3">
        {set.thumbnail_url || set.cover_image_url ? (
          <img
            src={set.thumbnail_url || set.cover_image_url || ''}
            alt={set.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-black flex items-center justify-center">
            {set.has_video ? <Video className="h-10 w-10 text-white/20" /> : <Music className="h-10 w-10 text-white/20" />}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Play button on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                <Play className="h-6 w-6 text-black ml-0.5" fill="currentColor" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[11px] text-white/80 font-mono">
          {formatDuration(set.duration_seconds)}
        </div>

        {/* Quality badge */}
        {set.video_quality && QUALITY_BADGES[set.video_quality] && (
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className={`text-[10px] ${QUALITY_BADGES[set.video_quality].className}`}>
              {QUALITY_BADGES[set.video_quality].label}
            </Badge>
          </div>
        )}

        {/* Media type icon */}
        <div className="absolute top-2 left-2">
          {set.has_video ? (
            <Video className="h-4 w-4 text-white/60" />
          ) : (
            <Music className="h-4 w-4 text-white/60" />
          )}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1 px-0.5">
        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
          {set.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{set.dj_name}</span>
          {set.genre && (
            <>
              <span className="text-white/20">·</span>
              <span>{set.genre}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70">
          <span className="flex items-center gap-0.5">
            <Eye className="h-3 w-3" />
            {set.play_count}
          </span>
          <span className="flex items-center gap-0.5">
            <Heart className="h-3 w-3" />
            {set.like_count}
          </span>
          {set.venue && <span>{set.venue}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Browser ───────────────────────────────────────────────────────────────

export function SetsBrowser() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');

  const { data: sets, isLoading } = useQuery({
    queryKey: ['dj-sets', genre],
    queryFn: async () => {
      let query = supabase
        .from('dj_sets' as any)
        .select('*')
        .eq('is_published', true)
        .order('is_featured', { ascending: false })
        .order('play_count', { ascending: false });

      if (genre !== 'All') {
        query = query.eq('genre', genre);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as DJSet[];
    },
    staleTime: 60000,
  });

  const filteredSets = (sets || []).filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.dj_name.toLowerCase().includes(q) ||
      s.venue?.toLowerCase().includes(q) ||
      s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const featured = filteredSets.find((s) => s.is_featured);
  const rest = filteredSets.filter((s) => s !== featured);

  const goToSet = (id: string) => navigate(`/radio/set/${id}`);

  return (
    <div className="space-y-8">
      {/* Search + Genre Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sets, DJs, venues..."
            className="pl-9 bg-black/20 border-white/10"
          />
        </div>
      </div>

      {/* Genre Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {GENRE_FILTERS.map((g) => (
          <button
            key={g}
            onClick={() => setGenre(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              genre === g
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Featured Hero */}
      {featured && !search && <FeaturedHero set={featured} onClick={() => goToSet(featured.id)} />}

      {/* Grid */}
      {rest.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {rest.map((set, i) => (
            <SetCard key={set.id} set={set} index={i} onClick={() => goToSet(set.id)} />
          ))}
        </div>
      ) : (
        !isLoading && (
          <div className="text-center py-16">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {search ? 'No sets match your search' : 'No sets available yet'}
            </p>
          </div>
        )
      )}
    </div>
  );
}
