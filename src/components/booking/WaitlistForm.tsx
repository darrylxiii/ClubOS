import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Bell } from "lucide-react";
import { format } from "date-fns";
import { bookingFormSchema } from "@/lib/bookingSchemas";
import { z } from "zod";

interface WaitlistFormProps {
  bookingLinkId: string;
  bookingLinkTitle: string;
  preferredDate: Date;
  onSuccess?: () => void;
}

const waitlistSchema = bookingFormSchema.extend({
  preferred_time_range: z.string().min(1, "Please select a preferred time"),
});

export function WaitlistForm({
  bookingLinkId,
  bookingLinkTitle,
  preferredDate,
  onSuccess,
}: WaitlistFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    preferred_time_range: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      waitlistSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          const field = error.path[0] as string;
          fieldErrors[field] = error.message;
        });
        setErrors(fieldErrors);
        toast.error("Please fix the errors in the form");
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("booking_waitlist").insert({
        booking_link_id: bookingLinkId,
        guest_name: formData.name,
        guest_email: formData.email,
        guest_phone: formData.phone || null,
        preferred_dates: [format(preferredDate, "yyyy-MM-dd")],
        preferred_time_range: formData.preferred_time_range,
        notes: formData.notes || null,
      });

      if (error) throw error;

      toast.success("Added to waitlist! We'll notify you when a slot opens up.");
      onSuccess?.();
    } catch (error: any) {
      console.error("Waitlist error:", error);
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Join Waitlist</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          No slots available for {format(preferredDate, "MMMM d, yyyy")}
        </p>
        <p className="text-xs text-muted-foreground">
          We'll notify you if a slot becomes available
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setErrors({ ...errors, name: "" });
            }}
            placeholder="Your full name"
            required
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              setErrors({ ...errors, email: "" });
            }}
            placeholder="you@example.com"
            required
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => {
              setFormData({ ...formData, phone: e.target.value });
              setErrors({ ...errors, phone: "" });
            }}
            placeholder="+1 (555) 000-0000"
            className={errors.phone ? "border-destructive" : ""}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="time_range">
            Preferred Time <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.preferred_time_range}
            onValueChange={(value) => {
              setFormData({ ...formData, preferred_time_range: value });
              setErrors({ ...errors, preferred_time_range: "" });
            }}
          >
            <SelectTrigger className={errors.preferred_time_range ? "border-destructive" : ""}>
              <SelectValue placeholder="Select preferred time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning (8 AM - 12 PM)</SelectItem>
              <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
              <SelectItem value="evening">Evening (5 PM - 9 PM)</SelectItem>
              <SelectItem value="any">Any time</SelectItem>
            </SelectContent>
          </Select>
          {errors.preferred_time_range && (
            <p className="text-sm text-destructive">{errors.preferred_time_range}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any specific requirements or alternative dates..."
            rows={3}
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full min-h-[44px]" size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining Waitlist...
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Join Waitlist
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          You'll receive an email notification when a slot becomes available
        </p>
      </form>
    </div>
  );
}
