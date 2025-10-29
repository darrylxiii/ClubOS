import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, X } from "lucide-react";

interface CallInitiationDialogProps {
  open: boolean;
  onClose: () => void;
  participantName: string;
  participantAvatar?: string;
  onStartAudioCall: () => void;
  onStartVideoCall: () => void;
}

export function CallInitiationDialog({
  open,
  onClose,
  participantName,
  participantAvatar,
  onStartAudioCall,
  onStartVideoCall
}: CallInitiationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-primary/20">
        <div className="relative bg-gradient-to-b from-background to-background/95 p-8">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-primary/10"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Participant info */}
          <div className="flex flex-col items-center space-y-4 mt-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-primary/20">
                <AvatarImage src={participantAvatar} alt={participantName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {participantName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background" />
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-semibold text-foreground">
                {participantName}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how to connect
              </p>
            </div>
          </div>

          {/* Call type buttons */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <Button
              onClick={onStartAudioCall}
              size="lg"
              className="h-auto py-6 flex flex-col gap-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
              variant="outline"
            >
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <Phone className="h-7 w-7" />
              </div>
              <span className="text-base font-medium">Audio Call</span>
            </Button>

            <Button
              onClick={onStartVideoCall}
              size="lg"
              className="h-auto py-6 flex flex-col gap-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Video className="h-7 w-7" />
              </div>
              <span className="text-base font-medium">Video Call</span>
            </Button>
          </div>

          {/* Footer hint */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            Your call will be end-to-end encrypted
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
