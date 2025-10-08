import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Clock } from "lucide-react";
import { format } from "date-fns";

interface BookingWaitlistProps {
  bookingLink: {
    id: string;
    title: string;
  };
  preferredDate?: Date;
}

export function BookingWaitlist({ bookingLink, preferredDate }: BookingWaitlistProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error("Please provide your name and email");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-waitlist", {
        body: {
          bookingLinkId: bookingLink.id,
          guestName: formData.name,
          guestEmail: formData.email,
          guestPhone: formData.phone || null,
          preferredDates: preferredDate ? [format(preferredDate, "yyyy-MM-dd")] : [],
        },
      });

      if (error) throw error;

      toast.success("You've been added to the waitlist!");
      setSubmitted(true);
    } catch (error: any) {
      console.error("Error joining waitlist:", error);
      toast.error(error.message || "Failed to join waitlist");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">You're on the Waitlist!</h3>
          <p className="text-muted-foreground">
            We'll notify you via email as soon as a spot becomes available for {bookingLink.title}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b">
        <h3 className="text-lg font-semibold mb-2">Join the Waitlist</h3>
        <p className="text-sm text-muted-foreground">
          No times available right now? Join the waitlist and we'll notify you when spots open up.
        </p>
        {preferredDate && (
          <p className="text-sm text-muted-foreground mt-2">
            Preferred date: {format(preferredDate, "MMM d, yyyy")}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="waitlist-name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="waitlist-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="waitlist-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="waitlist-phone">Phone (optional)</Label>
          <Input
            id="waitlist-phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining Waitlist...
            </>
          ) : (
            "Join Waitlist"
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          We'll email you as soon as a spot becomes available.
        </p>
      </form>
    </div>
  );
}
