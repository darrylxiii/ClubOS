import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Trash2 } from "lucide-react";
import { formatDuration } from "@/hooks/useTimeTracking";

interface IdleDetectionModalProps {
  open: boolean;
  idleSeconds: number;
  onKeepTime: () => void;
  onDiscardTime: () => void;
}

export function IdleDetectionModal({
  open,
  idleSeconds,
  onKeepTime,
  onDiscardTime,
}: IdleDetectionModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl">You've been idle</DialogTitle>
              <DialogDescription className="mt-1">
                No activity detected for {formatDuration(idleSeconds)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-foreground">
                {formatDuration(idleSeconds)}
              </p>
              <p className="text-sm text-muted-foreground">idle time detected</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onDiscardTime}
          >
            <Trash2 className="h-4 w-4" />
            Discard Idle Time
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={onKeepTime}
          >
            <Clock className="h-4 w-4" />
            Keep Time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
