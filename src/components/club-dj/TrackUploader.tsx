import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Music, Image as ImageIcon, Loader2, Plus, X, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TrackUploader() {
  const queryClient = useQueryClient();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [uploadMode, setUploadMode] = useState<"file" | "youtube">("file");

  const { data: playlists } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }
      setAudioFile(file);
      // Auto-fill title from filename if empty
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        setTitle(fileName);
      }
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleYoutubeDownload = async () => {
    if (!youtubeUrl) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('download-youtube-audio', {
        body: { youtubeUrl }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Convert base64 to blob
      const binaryString = atob(data.audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const file = new File([blob], data.metadata.filename, { type: 'audio/mpeg' });

      // Set the file and metadata
      setAudioFile(file);
      setTitle(data.metadata.title);
      setArtist(data.metadata.artist);

      // Download thumbnail if available
      if (data.metadata.thumbnailUrl) {
        try {
          const thumbnailResponse = await fetch(data.metadata.thumbnailUrl);
          const thumbnailBlob = await thumbnailResponse.blob();
          const thumbnailFile = new File([thumbnailBlob], 'thumbnail.jpg', { type: 'image/jpeg' });
          setCoverFile(thumbnailFile);
          setCoverPreview(URL.createObjectURL(thumbnailBlob));
        } catch (err) {
          console.error('Failed to download thumbnail:', err);
        }
      }

      toast.success('Audio downloaded from YouTube!');
      setUploadMode('file'); // Switch to file mode to show the downloaded track
    } catch (error: any) {
      console.error('YouTube download error:', error);
      toast.error(error.message || 'Failed to download from YouTube');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      toast.error('Please select an audio file');
      return;
    }

    setLoading(true);

    try {
      // Upload audio file
      const audioExt = audioFile.name.split('.').pop();
      const audioFileName = `${Math.random()}.${audioExt}`;
      const { error: audioError } = await supabase.storage
        .from('music-tracks')
        .upload(audioFileName, audioFile);

      if (audioError) throw audioError;

      const { data: { publicUrl: audioUrl } } = supabase.storage
        .from('music-tracks')
        .getPublicUrl(audioFileName);

      // Upload cover if provided
      let coverUrl = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverFileName = `${Math.random()}.${coverExt}`;
        const { error: coverError } = await supabase.storage
          .from('track-covers')
          .upload(coverFileName, coverFile);

        if (coverError) throw coverError;

        const { data: { publicUrl } } = supabase.storage
          .from('track-covers')
          .getPublicUrl(coverFileName);

        coverUrl = publicUrl;
      }

      // Get audio duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(audioFile);
      await new Promise((resolve) => {
        audio.onloadedmetadata = resolve;
      });
      const duration = Math.floor(audio.duration);

      // Create track
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .insert([{
          title,
          artist: artist || null,
          file_url: audioUrl,
          cover_image_url: coverUrl,
          duration_seconds: duration,
          tags: tags,
          created_by: user.id,
        }])
        .select()
        .single();

      if (trackError) throw trackError;

      // Add to playlist if selected
      if (selectedPlaylist && track) {
        const { data: playlistTracks } = await supabase
          .from('playlist_tracks')
          .select('position')
          .eq('playlist_id', selectedPlaylist)
          .order('position', { ascending: false })
          .limit(1);

        const nextPosition = playlistTracks && playlistTracks[0] 
          ? playlistTracks[0].position + 1 
          : 0;

        const { error: linkError } = await supabase
          .from('playlist_tracks')
          .insert([{
            playlist_id: selectedPlaylist,
            track_id: track.id,
            position: nextPosition,
          }]);

        if (linkError) throw linkError;
      }

      toast.success('Track uploaded successfully');
      
      // Reset form
      setAudioFile(null);
      setCoverFile(null);
      setCoverPreview("");
      setTitle("");
      setArtist("");
      setSelectedPlaylist("");
      setTags([]);
      
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload track');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-3xl bg-black/20 backdrop-blur-xl border border-white/10 p-6">
        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "file" | "youtube")} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 bg-black/20">
            <TabsTrigger value="file" className="data-[state=active]:bg-primary">
              <Upload className="h-4 w-4 mr-2" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="youtube" className="data-[state=active]:bg-primary">
              <Youtube className="h-4 w-4 mr-2" />
              YouTube URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="youtube-url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleYoutubeDownload}
                    disabled={loading || !youtubeUrl}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Youtube className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Download audio from YouTube. Please ensure you have rights to use the content.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="file" className="mt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Audio File Upload */}
              <div className="space-y-2">
                <Label>Audio File</Label>
                <label className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/50 transition-colors cursor-pointer">
              {audioFile ? (
                <div className="text-center">
                  <Music className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Upload audio file (MP3, WAV, M4A)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Max 20MB</p>
                </div>
              )}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleAudioChange}
              />
            </label>
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label>Cover Image (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              {coverPreview && (
                <div className="aspect-square rounded-2xl overflow-hidden">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <label className={`flex flex-col items-center justify-center aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/50 transition-colors cursor-pointer ${coverPreview ? '' : 'col-span-2'}`}>
                <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Upload cover</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </label>
            </div>
          </div>

          {/* Track Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="title">Track Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quantum Beats"
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="artist">Artist</Label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="DJ Quantum"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Genre, mood, occasion..."
              />
              <Button type="button" onClick={addTag} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add to Playlist */}
          <div className="space-y-2">
            <Label>Add to Playlist (Optional)</Label>
            <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
              <SelectTrigger>
                <SelectValue placeholder="Select a playlist" />
              </SelectTrigger>
              <SelectContent>
                {playlists?.map((playlist) => (
                  <SelectItem key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading || !audioFile}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Track
              </>
            )}
          </Button>
        </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
