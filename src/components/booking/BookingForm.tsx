import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Calendar, Clock } from "lucide-react";
import { format, parse } from "date-fns";

interface BookingFormProps {
  bookingLink: {
    id: string;
    user_id: string;
    duration_minutes: number;
    custom_questions?: any[];
  };
  selectedDate: Date;
  selectedTime: string;
  onComplete: (bookingId: string) => void;
}

export function BookingForm({
  bookingLink,
  selectedDate,
  selectedTime,
  onComplete,
}: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Please provide your name and email");
      return;
    }

    setLoading(true);
    try {
      // Parse the selected time to create start/end times
      const [time, period] = selectedTime.toLowerCase().split(" ");
      let [hours, minutes] = time.split(":").map(Number);
      
      if (period === "pm" && hours !== 12) hours += 12;
      if (period === "am" && hours === 12) hours = 0;

      const scheduledStart = new Date(selectedDate);
      scheduledStart.setHours(hours, minutes, 0, 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + bookingLink.duration_minutes);

      const { data, error } = await supabase.functions.invoke("create-booking", {
        body: {
          bookingLinkId: bookingLink.id,
          guestName: formData.name,
          guestEmail: formData.email,
          guestPhone: formData.phone || null,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notes: formData.notes || null,
        },
      });

      if (error) throw error;

      toast.success("Booking confirmed!");
      onComplete(data.booking.id);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast.error(error.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <h3 className="text-lg font-semibold mb-3">Enter Your Details</h3>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(selectedDate, "MMM d, yyyy")}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {selectedTime}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Anything else you'd like to share..."
            rows={3}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scheduling...
            </>
          ) : (
            "Schedule Event"
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By scheduling, you agree to receive email confirmations and reminders.
        </p>
      </form>
    </div>
  );
}
