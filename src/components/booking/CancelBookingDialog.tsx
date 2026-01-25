import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  /** Guest access token for guest-initiated cancellations */
  accessToken?: string;
  onCancelled: () => void;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  accessToken,
  onCancelled,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    setLoading(true);
    try {
      // If we have an accessToken, use guest-booking-actions, otherwise use cancel-booking
      if (accessToken) {
        const { error } = await supabase.functions.invoke("guest-booking-actions", {
          body: {
            action: 'cancel',
            bookingId,
            accessToken,
            cancelReason: reason.trim(),
          },
        });

        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke("cancel-booking", {
          body: {
            bookingId,
            reason: reason.trim(),
          },
        });

        if (error) throw error;
      }

      toast.success("Booking cancelled successfully");
      onOpenChange(false);
      onCancelled();
    } catch (error: unknown) {
      console.error("Cancel error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel booking";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Both you and the booking owner will be notified.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cancelling this booking will send notifications and remove it from calendars.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason</Label>
            <Textarea
              id="reason"
              placeholder="Please provide a reason for cancelling..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Keep Booking
          </Button>
          <Button
            variant="default"
            onClick={handleCancel}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
