import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProposeTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  bookingLinkSlug: string;
  accessToken?: string;
  proposerEmail?: string;
  proposerName?: string;
  onProposed?: () => void;
  /** Legacy: direct submit handler (takes precedence if provided) */
  onSubmit?: (proposedStart: string, proposedEnd: string, message?: string) => Promise<void>;
  durationMinutes?: number;
  title?: string;
}

export function ProposeTimeDialog({
  open,
  onOpenChange,
  bookingId,
  bookingLinkSlug,
  accessToken,
  proposerEmail,
  proposerName,
  onProposed,
  onSubmit,
  durationMinutes = 30,
  title = "Meeting",
}: ProposeTimeDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Generate time slots from 8 AM to 8 PM in 30-minute increments
  const timeSlots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 20 && minute > 0) break; // Stop at 8 PM
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      timeSlots.push(`${h}:${m}`);
    }
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const proposedStart = setMinutes(setHours(selectedDate, hours), minutes);
    const proposedEnd = new Date(proposedStart.getTime() + durationMinutes * 60 * 1000);

    if (proposedStart <= new Date()) {
      toast.error("Please select a time in the future");
      return;
    }

    setLoading(true);
    try {
      // If legacy onSubmit is provided, use it
      if (onSubmit) {
        await onSubmit(
          proposedStart.toISOString(),
          proposedEnd.toISOString(),
          message.trim() || undefined
        );
      } else {
        // Use the guest-booking-actions edge function
        const { error } = await supabase.functions.invoke("guest-booking-actions", {
          body: {
            action: 'propose_time',
            bookingId,
            accessToken,
            proposedStart: proposedStart.toISOString(),
            proposedEnd: proposedEnd.toISOString(),
            proposalMessage: message.trim() || undefined,
            guestEmail: proposerEmail,
          },
        });

        if (error) throw error;
      }
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedTime("");
      setMessage("");
      onOpenChange(false);
      
      if (onProposed) {
        onProposed();
      } else {
        toast.success("Time proposal submitted! The host will be notified.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit proposal";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Propose Different Time</DialogTitle>
          <DialogDescription>
            Suggest an alternative time for "{title}". The host will review your proposal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Select Date
            </Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date() || date > addDays(new Date(), 60)}
              className="rounded-md border"
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Select Time
            </Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {formatTimeDisplay(time)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {selectedDate && selectedTime && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="font-medium">Your proposed time:</p>
              <p className="text-muted-foreground">
                {format(selectedDate, "EEEE, MMMM d, yyyy")} at {formatTimeDisplay(selectedTime)}
              </p>
              <p className="text-muted-foreground">
                Duration: {durationMinutes} minutes
              </p>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="proposal-message">Message (optional)</Label>
            <Textarea
              id="proposal-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Let the host know why this time works better for you..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedDate || !selectedTime}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
