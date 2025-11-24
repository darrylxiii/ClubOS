import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarIcon, Clock } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

interface RescheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  currentDate?: string;
  onRescheduled: () => void;
}

export function RescheduleMeetingDialog({
  open,
  onOpenChange,
  bookingId,
  currentDate,
  onRescheduled,
}: RescheduleMeetingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentDate ? new Date(currentDate) : undefined
  );
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingDuration, setBookingDuration] = useState<number>(60); // Default 60 minutes

  // Fetch booking duration when dialog opens
  useEffect(() => {
    if (open && bookingId) {
      fetchBookingDuration();
    }
  }, [open, bookingId]);

  const fetchBookingDuration = async () => {
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('scheduled_start, scheduled_end, booking_links(duration_minutes)')
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      if (booking) {
        // Calculate duration from scheduled times, or use booking link duration
        const duration = booking.scheduled_start && booking.scheduled_end
          ? differenceInMinutes(new Date(booking.scheduled_end), new Date(booking.scheduled_start))
          : (booking.booking_links as any)?.duration_minutes || 60;
        setBookingDuration(duration);
      }
    } catch (error) {
      console.error('Error fetching booking duration:', error);
      // Keep default 60 minutes
    }
  };

  // Generate time slots (9 AM to 6 PM, 30-minute intervals)
  const timeSlots = [];
  for (let hour = 9; hour < 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      timeSlots.push(timeString);
    }
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select both date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      // Combine date and time
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const newDateTime = new Date(selectedDate);
      newDateTime.setHours(hours, minutes, 0, 0);

      // Use the fetched booking duration
      const newEndDateTime = new Date(newDateTime.getTime() + bookingDuration * 60 * 1000);
      
      // Call reschedule edge function
      const { error } = await supabase.functions.invoke("handle-booking-reschedule", {
        body: {
          bookingId,
          newStart: newDateTime.toISOString(),
          newEnd: newEndDateTime.toISOString(),
        },
      });

      if (error) throw error;

      toast.success("Meeting rescheduled successfully");
      setSelectedDate(undefined);
      setSelectedTime("");
      onOpenChange(false);
      onRescheduled();
    } catch (error: any) {
      console.error("Error rescheduling meeting:", error);
      toast.error(error.message || "Failed to reschedule meeting");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Meeting</DialogTitle>
          <DialogDescription>
            Select a new date and time for this meeting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Time</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {time}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedDate || !selectedTime}>
            {isSubmitting ? "Rescheduling..." : "Reschedule Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


