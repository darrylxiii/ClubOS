import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarUpload } from "@/components/AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const handleAvatarChange = async (url: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);

      if (error) throw error;

      setAvatarUrl(url);
      toast.success("Profile picture updated successfully");
      onSuccess();
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      toast.error("Failed to update profile picture");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Profile Picture</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <AvatarUpload
            avatarUrl={avatarUrl}
            onAvatarChange={handleAvatarChange}
            userId={userId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
