import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Loader2 } from 'lucide-react';

interface CreateCompanyStoryDialogProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryCreated: () => void;
}

export function CreateCompanyStoryDialog({
  companyId,
  open,
  onOpenChange,
  onStoryCreated,
}: CreateCompanyStoryDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Please select an image or video file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!user || !mediaFile) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('stories')
        .upload(fileName, mediaFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('company_stories')
        .insert({
          company_id: companyId,
          created_by: user.id,
          media_url: publicUrl,
          media_type: mediaFile.type.startsWith('image/') ? 'image' : 'video',
          caption: caption || null,
        });

      if (insertError) throw insertError;

      toast.success('Story created successfully');
      onStoryCreated();
      onOpenChange(false);
      setCaption('');
      setMediaFile(null);
      setMediaPreview('');
    } catch (error) {
      console.error('Error creating story:', error);
      toast.error('Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Company Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="media">Upload Image or Video</Label>
            <div className="mt-2">
              {!mediaPreview ? (
                <label
                  htmlFor="media"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent"
                >
                  <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload image or video
                  </span>
                  <Input
                    id="media"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="relative">
                  {mediaFile?.type.startsWith('image/') ? (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={mediaPreview}
                      controls
                      className="w-full h-64 rounded-lg"
                    />
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview('');
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder="Add a caption to your story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !mediaFile}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
