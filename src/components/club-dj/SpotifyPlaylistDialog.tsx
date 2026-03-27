import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Music, X } from "lucide-react";
import { extractSpotifyInfo, getSpotifyEmbedUrl } from "@/lib/spotifyEmbedUtils";
import { SpotifyEmbed } from "@/components/feed/SpotifyEmbed";

const MOOD_TAGS = [
  { category: "Focus", tags: ["Deep Work", "Study", "Concentration", "Flow State", "Coding"] },
  { category: "Energy", tags: ["Workout", "Motivation", "Hype", "Power", "Gym"] },
  { category: "Chill", tags: ["Relaxation", "Coffee", "Sunday Morning", "Evening Wind Down"] },
  { category: "Romantic", tags: ["Date Night", "Love Songs", "Intimate", "Sensual"] },
  { category: "Party", tags: ["Club Vibes", "Pre-Game", "Dance", "High Energy"] },
  { category: "Zen", tags: ["Meditation", "Yoga", "Calm", "Peaceful", "Spa"] },
  { category: "Night", tags: ["Late Night", "Moody", "Ambient", "After Hours"] },
  { category: "Morning", tags: ["Wake Up", "Uplifting", "Fresh Start", "Sunrise"] },
];

const GENRES = ["Electronic", "Hip-Hop", "Jazz", "Classical", "Rock", "Pop", "Indie", "R&B", "House", "Techno", "Lo-Fi", "Ambient"];

const ENERGY_LEVELS = [
  { value: "low", label: "Low (Chill)" },
  { value: "medium", label: "Medium (Steady)" },
  { value: "high", label: "High (Upbeat)" },
  { value: "very_high", label: "Very High (Intense)" },
];

interface SpotifyPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SpotifyPlaylistDialog({ open, onOpenChange, onSuccess }: SpotifyPlaylistDialogProps) {
  const { t } = useTranslation('common');
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>([]);
  const [genre, setGenre] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [spotifyInfo, setSpotifyInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (url) {
      const info = extractSpotifyInfo(url);
      if (info && info.type === 'playlist') {
        setSpotifyInfo(info);
      } else {
        setSpotifyInfo(null);
        if (url.includes('spotify') && !info) {
          toast.error(t("invalid_spotify_playlist_url", "Invalid Spotify playlist URL"));
        }
      }
    }
  }, [url]);

  const handleMoodTagToggle = (tag: string) => {
    setSelectedMoodTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!spotifyInfo) {
      toast.error(t("please_enter_a_valid", "Please enter a valid Spotify playlist URL"));
      return;
    }

    if (!name.trim()) {
      toast.error(t("please_enter_a_playlist", "Please enter a playlist name"));
      return;
    }

    if (selectedMoodTags.length === 0) {
      toast.error(t("please_select_at_least", "Please select at least one mood tag"));
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('playlists')
        .insert([{
          name: name.trim(),
          description: description.trim() || null,
          playlist_type: 'spotify',
          spotify_playlist_id: spotifyInfo.id,
          spotify_embed_url: getSpotifyEmbedUrl('playlist', spotifyInfo.id),
          mood_tags: selectedMoodTags,
          genre: genre || null,
          energy_level: energyLevel || null,
          is_featured: isFeatured,
          is_published: true,
          created_by: user.id,
        }]);

      if (error) throw error;

      toast.success(t("spotify_playlist_added_successfully", "Spotify playlist added successfully"));
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error saving playlist:', error);
      toast.error(t("failed_to_save_playlist", "Failed to save playlist"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUrl("");
    setName("");
    setDescription("");
    setSelectedMoodTags([]);
    setGenre("");
    setEnergyLevel("");
    setIsFeatured(false);
    setSpotifyInfo(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-green-500" />
            Add Spotify Playlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Spotify URL */}
          <div className="space-y-2">
            <Label>{t("spotify_playlist_url", "Spotify Playlist URL")}</Label>
            <Input
              placeholder="https://open.spotify.com/playlist/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste any Spotify playlist URL
            </p>
          </div>

          {/* Preview */}
          {spotifyInfo && (
            <div className="space-y-2">
              <Label>{t("preview", "Preview")}</Label>
              <SpotifyEmbed
                type="playlist"
                spotifyId={spotifyInfo.id}
                url={spotifyInfo.url}
              />
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label>{t("playlist_name", "Playlist Name *")}</Label>
            <Input
              placeholder={t("eg_deep_focus_beats", "e.g., Deep Focus Beats")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t("description", "Description")}</Label>
            <Textarea
              placeholder={t("describe_the_vibe_and", "Describe the vibe and mood...")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Mood Tags */}
          <div className="space-y-3">
            <Label>{t("mood_tags_select_at", "Mood Tags * (Select at least one)")}</Label>
            <div className="space-y-3">
              {MOOD_TAGS.map((category) => (
                <div key={category.category} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {category.category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedMoodTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleMoodTagToggle(tag)}
                      >
                        {tag}
                        {selectedMoodTags.includes(tag) && (
                          <X className="ml-1 h-3 w-3" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Genre */}
          <div className="space-y-2">
            <Label>{t("genre", "Genre")}</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger>
                <SelectValue placeholder={t("select_genre", "Select genre")} />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Energy Level */}
          <div className="space-y-2">
            <Label>{t("energy_level", "Energy Level")}</Label>
            <Select value={energyLevel} onValueChange={setEnergyLevel}>
              <SelectTrigger>
                <SelectValue placeholder={t("select_energy_level", "Select energy level")} />
              </SelectTrigger>
              <SelectContent>
                {ENERGY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="featured">{t("mark_as_featured", "Mark as Featured")}</Label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || !spotifyInfo || !name.trim() || selectedMoodTags.length === 0}
              className="flex-1"
            >
              {loading ? "Saving..." : "Add Playlist"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
