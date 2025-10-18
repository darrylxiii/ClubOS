import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ImagePlus, Video, Upload, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileHeaderUploadProps {
  currentMediaUrl?: string | null;
  currentMediaType?: string | null;
  onUploadComplete: () => void;
}

export const ProfileHeaderUpload = ({ 
  currentMediaUrl, 
  currentMediaType,
  onUploadComplete 
}: ProfileHeaderUploadProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (mediaType === "image" && !isImage) {
      toast.error("Please select an image file");
      return;
    }
    
    if (mediaType === "video" && !isVideo) {
      toast.error("Please select a video file");
      return;
    }

    // Validate file size (max 50MB for video, 10MB for image)
    const maxSize = mediaType === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${mediaType === "video" ? "50MB" : "10MB"}`);
      return;
    }

    setUploading(true);

    try {
      // Delete old header if exists
      if (currentMediaUrl) {
        const oldPath = currentMediaUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("profile-headers")
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new file
      const fileExt = file.name.split(".").pop();
      const fileName = `header-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-headers")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("profile-headers")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          header_media_url: publicUrl,
          header_media_type: mediaType,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("Header uploaded successfully!");
      onUploadComplete();
      setOpen(false);
    } catch (error) {
      console.error("Error uploading header:", error);
      toast.error("Failed to upload header");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!user || !currentMediaUrl) return;

    setDeleting(true);

    try {
      // Delete from storage
      const path = currentMediaUrl.split("/").pop();
      if (path) {
        await supabase.storage
          .from("profile-headers")
          .remove([`${user.id}/${path}`]);
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          header_media_url: null,
          header_media_type: null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Header removed successfully!");
      onUploadComplete();
      setOpen(false);
    } catch (error) {
      console.error("Error deleting header:", error);
      toast.error("Failed to remove header");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentMediaUrl ? (
            <>
              <ImagePlus className="w-4 h-4" />
              Change Header
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Add Header
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Header / Wallpaper</DialogTitle>
          <DialogDescription>
            Upload an image or video as your profile header. Videos will autoplay on loop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Media Type</Label>
            <RadioGroup value={mediaType} onValueChange={(v) => setMediaType(v as "image" | "video")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="image" id="image" />
                <Label htmlFor="image" className="flex items-center gap-2 cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  Image (max 10MB)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="video" id="video" />
                <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer">
                  <Video className="w-4 h-4" />
                  Video (max 50MB)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={mediaType === "image" ? "image/*" : "video/*"}
              onChange={handleFileSelect}
              className="hidden"
              id="header-upload"
            />
            <Label htmlFor="header-upload">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose {mediaType === "image" ? "Image" : "Video"}
                  </>
                )}
              </Button>
            </Label>
          </div>

          {currentMediaUrl && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Header
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};