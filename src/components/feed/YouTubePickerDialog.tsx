import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Youtube } from 'lucide-react';
import { extractYouTubeVideoId, getYouTubeThumbnail } from '@/lib/youtubeUtils';
import { toast } from 'sonner';

interface YouTubePickerDialogProps {
  onSelect: (videoId: string, url: string) => void;
  onClose: () => void;
}

export function YouTubePickerDialog({ onSelect, onClose }: YouTubePickerDialogProps) {
  const { t } = useTranslation('common');
  const [url, setUrl] = useState('');
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    const videoId = extractYouTubeVideoId(value);
    setPreviewVideoId(videoId);
  };

  const handleAdd = () => {
    if (!previewVideoId) {
      toast.error(t("invalid_youtube_url", "Invalid YouTube URL"), {
        description: 'Please paste a valid YouTube video link',
      });
      return;
    }

    onSelect(previewVideoId, url);
    setUrl('');
    setPreviewVideoId(null);
    onClose();
    toast.success(t("youtube_video_added", "YouTube video added"));
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="font-semibold text-sm mb-2">{t("share_youtube_video", "Share YouTube Video")}</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Paste a YouTube video URL to share
        </p>
        <Input
          placeholder="https://youtube.com/watch?v=..."
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="bg-background/50"
        />
      </div>

      {previewVideoId && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">{t("preview", "Preview")}</div>
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={getYouTubeThumbnail(previewVideoId, 'hq')}
              alt={t("video_preview", "Video preview")}
              className="w-full aspect-video object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                <Youtube className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleAdd}
          disabled={!previewVideoId}
          className="flex-1"
          size="sm"
        >
          Add Video
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          size="sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
