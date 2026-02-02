import { useState, useRef, useEffect } from "react";
import { Upload, User, Loader2, X, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageEditor } from "@/components/image-editor";

interface AvatarUploadProps {
  avatarUrl: string | null;
  onAvatarChange: (url: string) => void;
  userId: string;
  required?: boolean;
}

export const AvatarUpload = ({ avatarUrl, onAvatarChange, userId, required = false }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync previewUrl with avatarUrl prop changes
  useEffect(() => {
    console.log('[AvatarUpload] Avatar URL changed:', avatarUrl);
    setPreviewUrl(avatarUrl);
  }, [avatarUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Create preview and open editor
    const objectUrl = URL.createObjectURL(file);
    setSelectedImage(objectUrl);
    setEditorOpen(true);
  };

  const handleSaveCroppedImage = async (croppedBlob: Blob) => {
    try {
      setUploading(true);
      setEditorOpen(false);

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload cropped image
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache busting
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache busting parameter
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: cacheBustedUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onAvatarChange(publicUrl);
      toast.success('Profile picture updated');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    try {
      setUploading(true);

      // Delete from storage
      const oldPath = avatarUrl.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('avatars')
          .remove([`${userId}/${oldPath}`]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      setPreviewUrl(null);
      onAvatarChange('');
      toast.success('Profile picture removed');
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  const getInitials = () => {
    // Try to get initials from user's name or email
    return 'U';
  };

  return (
    <>
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          Profile Picture
          {required && !previewUrl && (
            <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded">
              Recommended
            </span>
          )}
        </Label>
        
        {required && !previewUrl && (
          <div className="p-3 bg-muted/50 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Add a profile picture to complete your profile
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="w-24 h-24 border-2 border-border">
              {uploading ? (
                <AvatarFallback className="bg-muted">
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                </AvatarFallback>
              ) : previewUrl ? (
                <AvatarImage src={previewUrl} alt="Profile picture" className="object-cover" />
              ) : (
                <AvatarFallback className="bg-muted">
                  <User className="w-12 h-12 text-muted-foreground" />
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-fit"
            >
              <Upload className="w-4 h-4 mr-2" />
              {previewUrl ? 'Change' : 'Upload'} Picture
            </Button>

            {previewUrl && !required && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={uploading}
                className="w-fit"
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              JPG, PNG or WEBP. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {selectedImage && (
        <ImageEditor
          image={selectedImage}
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            if (selectedImage) {
              URL.revokeObjectURL(selectedImage);
              setSelectedImage(null);
            }
          }}
          preset="avatar"
          onSave={(blob) => handleSaveCroppedImage(blob)}
        />
      )}
    </>
  );
};