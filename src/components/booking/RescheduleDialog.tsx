import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookingCalendar } from "./BookingCalendar";
import { BookingTimeSlots } from "./BookingTimeSlots";
import { toast } from "sonner";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    guest_name: string;
    scheduled_start: string;
    scheduled_end: string;
  };
  bookingLink: {
    id: string;
    slug: string;
    title: string;
    duration_minutes: number;
    color: string;
    user_id: string;
    advance_booking_days: number;
    min_notice_hours: number;
  };
  onRescheduled?: () => void;
}

export function RescheduleDialog({ open, onOpenChange, booking, bookingLink, onRescheduled }: RescheduleDialogProps) {
  const [step, setStep] = useState<"date" | "time" | "reason">("date");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep("time");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("reason");
  };

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const [hours, minutes, period] = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i)?.slice(1) || [];
      let hour = parseInt(hours);
      if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
      if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

      const newStart = new Date(selectedDate);
      newStart.setHours(hour, parseInt(minutes), 0, 0);

      const newEnd = new Date(newStart.getTime() + bookingLink.duration_minutes * 60 * 1000);

      const { error } = await supabase.functions.invoke("handle-booking-reschedule", {
        body: {
          bookingId: booking.id,
          newStart: newStart.toISOString(),
          newEnd: newEnd.toISOString(),
          reason: reason || undefined,
        },
      });

      if (error) throw error;

      toast.success("Booking rescheduled successfully!");
      onRescheduled?.();
      onOpenChange(false);
      
      // Reset state
      setStep("date");
      setSelectedDate(null);
      setSelectedTime("");
      setReason("");
    } catch (error: any) {
      console.error("Error rescheduling:", error);
      toast.error(error.message || "Failed to reschedule booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Booking</DialogTitle>
          <DialogDescription>
            Choose a new date and time for your meeting with {booking.guest_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "date" && (
            <div>
              <h3 className="font-semibold mb-4">Select a new date</h3>
              <BookingCalendar
                bookingLink={bookingLink}
                onDateSelect={handleDateSelect}
              />
            </div>
          )}

          {step === "time" && selectedDate && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("date")}
                className="mb-4"
              >
                ← Change Date
              </Button>
              <BookingTimeSlots
                bookingLink={bookingLink}
                selectedDate={selectedDate}
                onTimeSelect={handleTimeSelect}
              />
            </div>
          )}

          {step === "reason" && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("time")}
                className="mb-2"
              >
                ← Change Time
              </Button>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">New meeting time:</p>
                <p className="text-lg font-bold">
                  {selectedDate?.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  at {selectedTime}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for rescheduling (optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Let them know why you're rescheduling..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReschedule}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "Rescheduling..." : "Confirm Reschedule"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
