import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageEditor } from "@/components/image-editor";

interface ChangeAvatarDialogProps {
  open: boolean;
  onClose: () => void;
  currentAvatarUrl: string | null;
  userId: string;
  onSuccess: () => void;
}

export function ChangeAvatarDialog({ 
  open, 
  onClose, 
  currentAvatarUrl, 
  userId,
  onSuccess 
}: ChangeAvatarDialogProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);
    setEditorOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditorSave = async (blob: Blob) => {
    setEditorOpen(false);
    setUploading(true);

    try {
      // Delete old avatar
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop()?.split('?')[0];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload new
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(cacheBustedUrl);
      toast.success('Profile picture updated');
      onSuccess();
    } catch (error: unknown) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update profile picture');
    } finally {
      setUploading(false);
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
    }
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Profile Picture</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-2 border-border">
                {uploading ? (
                  <AvatarFallback><Loader2 className="w-8 h-8 animate-spin" /></AvatarFallback>
                ) : avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Profile" className="object-cover" />
                ) : (
                  <AvatarFallback><User className="w-12 h-12 text-muted-foreground" /></AvatarFallback>
                )}
              </Avatar>

              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {avatarUrl ? 'Change' : 'Upload'} Picture
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG or WEBP. Max 5MB.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedImage && (
        <ImageEditor
          image={selectedImage}
          open={editorOpen}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
          preset="avatar"
        />
      )}
    </>
  );
}
