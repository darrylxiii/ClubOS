import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Upload, X, Plus, Video, Music, Clock } from 'lucide-react';
import type { DJSetFormData, TracklistEntry } from './types';

const GENRES = [
  'House', 'Techno', 'Trance', 'Drum & Bass', 'Dubstep',
  'Deep House', 'Tech House', 'Melodic Techno', 'Progressive',
  'Afro House', 'Minimal', 'Ambient', 'Hip-Hop', 'R&B',
  'Disco', 'Funk', 'Jazz', 'Experimental', 'Other',
];

interface SetUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetUploadDialog({ open, onOpenChange }: SetUploadDialogProps) {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DJSetFormData>({
    title: '',
    description: '',
    dj_name: '',
    dj_id: null,
    video_url: '',
    video_embed_url: '',
    audio_url: '',
    thumbnail_url: '',
    cover_image_url: '',
    duration_seconds: 0,
    recorded_at: '',
    venue: '',
    genre: '',
    tags: [],
    tracklist: [],
    video_quality: null,
    is_featured: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [tracklistInput, setTracklistInput] = useState('');
  const [durationInput, setDurationInput] = useState('');

  const update = (field: keyof DJSetFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      update('tags', [...form.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    update('tags', form.tags.filter((t) => t !== tag));
  };

  const parseDuration = (input: string): number => {
    // Accepts "1:30:00", "90:00", "90", "1h30m"
    const hms = input.match(/^(\d+):(\d+):(\d+)$/);
    if (hms) return +hms[1] * 3600 + +hms[2] * 60 + +hms[3];
    const ms = input.match(/^(\d+):(\d+)$/);
    if (ms) return +ms[1] * 60 + +ms[2];
    const hm = input.match(/^(\d+)h\s*(\d+)m?$/i);
    if (hm) return +hm[1] * 3600 + +hm[2] * 60;
    const min = parseInt(input);
    if (!isNaN(min)) return min * 60;
    return 0;
  };

  const parseTracklist = (text: string): TracklistEntry[] => {
    // Accepts format: "00:12:30 Artist - Title" per line
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+?)\s*[-–]\s*(.+)$/);
        if (match) {
          return { time: match[1], artist: match[2].trim(), title: match[3].trim() };
        }
        // Fallback: no timestamp
        const parts = line.split(/\s*[-–]\s*/);
        return {
          time: '',
          artist: parts[0]?.trim() || '',
          title: parts[1]?.trim() || line.trim(),
        };
      });
  };

  // Detect video type from URL
  const detectVideoEmbed = (url: string): string => {
    if (!url) return '';
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return '';
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const duration = parseDuration(durationInput);
      const tracklist = parseTracklist(tracklistInput);
      const embedUrl = form.video_embed_url || detectVideoEmbed(form.video_url);
      const hasVideo = !!(form.video_url || embedUrl);

      const { error } = await supabase.from('dj_sets' as any).insert({
        title: form.title,
        description: form.description || null,
        dj_name: form.dj_name,
        dj_id: form.dj_id,
        video_url: form.video_url || null,
        video_embed_url: embedUrl || null,
        audio_url: form.audio_url || null,
        thumbnail_url: form.thumbnail_url || null,
        cover_image_url: form.cover_image_url || null,
        duration_seconds: duration,
        recorded_at: form.recorded_at || null,
        venue: form.venue || null,
        genre: form.genre || null,
        tags: form.tags,
        tracklist: tracklist.length > 0 ? tracklist : null,
        play_count: 0,
        like_count: 0,
        is_featured: form.is_featured,
        is_published: true,
        has_video: hasVideo,
        video_quality: form.video_quality,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('radio.setUploadedSuccessfully', 'Set uploaded successfully'));
      queryClient.invalidateQueries({ queryKey: ['dj-sets'] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('radio.failedToUploadSet', 'Failed to upload set'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('radio.addDjSet', 'Add DJ Set')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Title + DJ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('radio.setTitle', 'Set Title')} *</Label>
              <Input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Boiler Room London 2024"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('radio.djName', 'DJ Name')} *</Label>
              <Input
                value={form.dj_name}
                onChange={(e) => update('dj_name', e.target.value)}
                placeholder="DJ Quantum"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>{t('radio.description', 'Description')}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Deep house set recorded live at..."
              rows={2}
            />
          </div>

          {/* Video URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" />
              {t('radio.videoUrl', 'Video URL (YouTube, Vimeo, or direct MP4/HLS)')}
            </Label>
            <Input
              value={form.video_url}
              onChange={(e) => {
                update('video_url', e.target.value);
                update('video_embed_url', detectVideoEmbed(e.target.value));
              }}
              placeholder="https://youtube.com/watch?v=... or https://stream.example.com/video.m3u8"
            />
            {form.video_embed_url && (
              <p className="text-xs text-green-500">{t('radio.embedDetected', 'Embed detected')}: {form.video_embed_url}</p>
            )}
          </div>

          {/* Audio URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5" />
              {t('radio.audioUrl', 'Audio URL (for audio-only playback)')}
            </Label>
            <Input
              value={form.audio_url}
              onChange={(e) => update('audio_url', e.target.value)}
              placeholder="https://storage.example.com/set.mp3"
            />
          </div>

          {/* Thumbnail + Cover */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('radio.thumbnailUrl', 'Thumbnail URL')}</Label>
              <Input
                value={form.thumbnail_url}
                onChange={(e) => update('thumbnail_url', e.target.value)}
                placeholder="Preview image URL"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('radio.coverArtUrl', 'Cover Art URL')}</Label>
              <Input
                value={form.cover_image_url}
                onChange={(e) => update('cover_image_url', e.target.value)}
                placeholder="High-res cover URL"
              />
            </div>
          </div>

          {/* Duration + Date + Venue */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('radio.duration', 'Duration')}
              </Label>
              <Input
                value={durationInput}
                onChange={(e) => setDurationInput(e.target.value)}
                placeholder="1:30:00 or 90"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('radio.recordedDate', 'Recorded Date')}</Label>
              <Input
                type="date"
                value={form.recorded_at}
                onChange={(e) => update('recorded_at', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('radio.venue', 'Venue')}</Label>
              <Input
                value={form.venue}
                onChange={(e) => update('venue', e.target.value)}
                placeholder="Fabric London"
              />
            </div>
          </div>

          {/* Genre + Quality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('radio.genre', 'Genre')}</Label>
              <Select value={form.genre} onValueChange={(v) => update('genre', v)}>
                <SelectTrigger><SelectValue placeholder={t('radio.selectGenre', 'Select genre')} /></SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('radio.videoQuality', 'Video Quality')}</Label>
              <Select value={form.video_quality || ''} onValueChange={(v) => update('video_quality', v || null)}>
                <SelectTrigger><SelectValue placeholder={t('radio.selectQuality', 'Select quality')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p HD</SelectItem>
                  <SelectItem value="1080p">1080p Full HD</SelectItem>
                  <SelectItem value="4k">4K Ultra HD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>{t('radio.tags', 'Tags')}</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag..."
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={addTag}><Plus className="h-4 w-4" /></Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tracklist */}
          <div className="space-y-1.5">
            <Label>{t('radio.tracklist', 'Tracklist (one per line: "00:12:30 Artist - Title")')}</Label>
            <Textarea
              value={tracklistInput}
              onChange={(e) => setTracklistInput(e.target.value)}
              placeholder={"00:00:00 Bicep - Glue\n00:05:30 Disclosure - Latch\n00:12:00 Jamie XX - Gosh"}
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between">
            <Label>{t('radio.featuredSet', 'Featured Set')}</Label>
            <Switch
              checked={form.is_featured}
              onCheckedChange={(v) => update('is_featured', v)}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.title || !form.dj_name || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? t('radio.uploading', 'Uploading...') : t('radio.addSet', 'Add Set')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
