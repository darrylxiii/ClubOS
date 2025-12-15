import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Upload, Trash2, Loader2, Play, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FreelanceVideoIntroProps {
  userId: string;
  freelanceProfile: any;
  onUpdate: () => void;
}

export function FreelanceVideoIntro({ userId, freelanceProfile, onUpdate }: FreelanceVideoIntroProps) {
  const [saving, setSaving] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>(freelanceProfile?.video_intro_url || "");
  const [inputUrl, setInputUrl] = useState<string>(freelanceProfile?.video_intro_url || "");

  useEffect(() => {
    if (freelanceProfile?.video_intro_url) {
      setVideoUrl(freelanceProfile.video_intro_url);
      setInputUrl(freelanceProfile.video_intro_url);
    }
  }, [freelanceProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          video_intro_url: inputUrl.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      
      setVideoUrl(inputUrl.trim());
      toast.success("Video intro saved");
      onUpdate();
    } catch (error: any) {
      console.error("Error saving video intro:", error);
      toast.error("Failed to save video intro");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          video_intro_url: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      
      setVideoUrl("");
      setInputUrl("");
      toast.success("Video intro removed");
      onUpdate();
    } catch (error: any) {
      console.error("Error removing video intro:", error);
      toast.error("Failed to remove video intro");
    } finally {
      setSaving(false);
    }
  };

  // Extract video ID for embedding
  const getEmbedUrl = (url: string) => {
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) {
      return `https://www.loom.com/embed/${loomMatch[1]}`;
    }
    return null;
  };

  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Introduction
        </CardTitle>
        <CardDescription>
          Add a personal video to stand out from other freelancers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            A 60-90 second video introduction can increase your proposal acceptance rate by up to 50%.
            Introduce yourself, your skills, and why clients should work with you.
          </AlertDescription>
        </Alert>

        {/* Current Video Preview */}
        {embedUrl ? (
          <div className="space-y-3">
            <Label>Current Video</Label>
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(videoUrl, "_blank")}
                className="gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open Original
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={saving}
                className="gap-1 text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </Button>
            </div>
          </div>
        ) : videoUrl ? (
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-3">
              <Play className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{videoUrl}</p>
                <p className="text-sm text-muted-foreground">
                  Video URL added (embedding not supported for this platform)
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* Video URL Input */}
        <div className="space-y-3">
          <Label htmlFor="video-url">
            {videoUrl ? "Update Video URL" : "Add Video URL"}
          </Label>
          <div className="flex gap-2">
            <Input
              id="video-url"
              type="url"
              placeholder="https://youtube.com/watch?v=... or loom.com/share/..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleSave} 
              disabled={saving || inputUrl === videoUrl}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Supported: YouTube, Vimeo, Loom. Upload your video there first, then paste the link.
          </p>
        </div>

        {/* Tips */}
        <div className="p-4 rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">Tips for a great video intro</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Keep it 60-90 seconds</li>
            <li>• Use good lighting and clear audio</li>
            <li>• Introduce yourself and your expertise</li>
            <li>• Mention what types of projects you excel at</li>
            <li>• Show your personality - clients want to work with real people</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
