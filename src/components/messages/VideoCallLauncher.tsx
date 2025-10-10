import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface VideoCallLauncherProps {
  conversationId: string;
  participantName: string;
}

export function VideoCallLauncher({ conversationId, participantName }: VideoCallLauncherProps) {
  const [open, setOpen] = useState(false);

  const handleStartCall = () => {
    // Integration point for video calling service (e.g., Agora, Twilio, etc.)
    toast.success(`Starting video call with ${participantName}...`);
    setOpen(false);
    
    // TODO: Implement actual video call integration
    // This would typically:
    // 1. Generate a meeting room/token
    // 2. Notify other participants
    // 3. Open video interface
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-200 hover:scale-110 shadow-glass-sm"
          title="Start video call"
        >
          <Video className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Start Video Call</DialogTitle>
          <DialogDescription>
            You're about to start a video call with {participantName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="glass-subtle rounded-xl p-4">
            <p className="text-sm text-muted-foreground">
              Make sure your camera and microphone are ready
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartCall} className="gap-2">
              <Video className="w-4 h-4" />
              Start Call
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
