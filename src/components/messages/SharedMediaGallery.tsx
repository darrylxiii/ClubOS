import { useState } from 'react';
import { FileText, Image as ImageIcon, Video, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { MediaItem } from '@/hooks/useConversationMedia';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SharedMediaGalleryProps {
  media: MediaItem[];
  loading?: boolean;
}

export const SharedMediaGallery = ({ media, loading }: SharedMediaGalleryProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const handleDownload = async (item: MediaItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .download(item.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('File downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-muted-foreground">Loading media...</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No files shared yet</p>
      </div>
    );
  }

  const images = media.filter(m => m.file_type.startsWith('image/'));
  const videos = media.filter(m => m.file_type.startsWith('video/'));
  const documents = media.filter(m => !m.file_type.startsWith('image/') && !m.file_type.startsWith('video/'));

  return (
    <div className="space-y-4">
      {/* Images */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Images ({images.length})</h4>
          <div className="grid grid-cols-3 gap-2">
            {images.map((item) => (
              <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  onClick={() => handleDownload(item)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Videos ({videos.length})</h4>
          <div className="grid grid-cols-3 gap-2">
            {videos.map((item) => (
              <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  onClick={() => handleDownload(item)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Documents ({documents.length})</h4>
          <div className="space-y-2">
            {documents.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  {getFileIcon(item.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.created_at), 'MMM d, yyyy')} • {item.sender_name}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDownload(item)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
