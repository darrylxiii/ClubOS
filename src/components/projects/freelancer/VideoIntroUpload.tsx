import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Video, Upload, Trash2, Play, Pause, Loader2 } from "lucide-react";

interface VideoIntroUploadProps {
  currentVideoUrl?: string | null;
  onVideoUploaded?: (url: string) => void;
}

export function VideoIntroUpload({ currentVideoUrl, onVideoUploaded }: VideoIntroUploadProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Validate file
      if (!file.type.startsWith("video/")) {
        throw new Error("Please upload a video file");
      }
      
      // Max 60 seconds / 50MB
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("Video must be under 50MB");
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/video-intro.${fileExt}`;
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("freelancer-media")
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("freelancer-media")
        .getPublicUrl(fileName);
      
      // Update freelance profile
      const { error: updateError } = await (supabase as any)
        .from("freelance_profiles")
        .update({ video_intro_url: publicUrl })
        .eq("user_id", user.id);
      
      if (updateError) throw updateError;
      
      return publicUrl;
    },
    onSuccess: (url) => {
      toast.success("Video uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["freelance-profile"] });
      onVideoUploaded?.(url);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("freelancer-media")
        .remove([`${user.id}/video-intro.mp4`, `${user.id}/video-intro.webm`, `${user.id}/video-intro.mov`]);
      
      if (deleteError) console.warn("Storage delete warning:", deleteError);
      
      // Update profile
      const { error: updateError } = await (supabase as any)
        .from("freelance_profiles")
        .update({ video_intro_url: null })
        .eq("user_id", user.id);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Video removed");
      queryClient.invalidateQueries({ queryKey: ["freelance-profile"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Introduction
        </CardTitle>
        <CardDescription>
          Upload a 60-second video to introduce yourself to potential clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentVideoUrl ? (
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={currentVideoUrl}
                className="w-full h-full object-cover"
                onEnded={() => setIsPlaying(false)}
              />
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-16 w-16 text-white" />
                ) : (
                  <Play className="h-16 w-16 text-white" />
                )}
              </button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace Video
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium mb-1">Upload your video introduction</p>
            <p className="text-sm text-muted-foreground mb-4">
              Max 60 seconds • MP4, WebM, or MOV • Up to 50MB
            </p>
            <Button disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Video
                </>
              )}
            </Button>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <p className="text-xs text-muted-foreground">
          💡 Tip: Introduce yourself, highlight your expertise, and share what makes you unique. 
          Videos increase client engagement by 40%.
        </p>
      </CardContent>
    </Card>
  );
}
