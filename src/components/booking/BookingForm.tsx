import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { format, parse } from "date-fns";
import { getUserTimezone, parseUserTimeSelection, createBookingTime, normalizeTimeFormat, detectTimeFormat } from "@/lib/timezoneUtils";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { parseISO, setHours, setMinutes } from "date-fns";
import { RECAPTCHA_ENABLED } from "@/config/recaptcha";
import { bookingFormSchema, type BookingFormData } from "@/lib/bookingSchemas";
import { z } from "zod";
import { useBookingAnalytics } from "@/hooks/useBookingAnalytics";
import { GuestEmailInput } from "./GuestEmailInput";
import { GuestPlatformSelector } from "./GuestPlatformSelector";
import { TimezoneWarning } from "./TimezoneWarning";
import { logger } from "@/lib/logger";

interface BookingFormProps {
  bookingLink: {
    id: string;
    slug: string;
    user_id: string;
    duration_minutes: number;
    custom_questions?: any[];
    allow_guest_platform_choice?: boolean;
    available_platforms?: string[];
    video_platform?: string;
    host_timezone?: string;
  };
  selectedDate: Date;
  selectedTime: string;
  onComplete: (bookingId: string) => void;
  hasGoogleCalendar?: boolean;
}

export function BookingForm({
  bookingLink,
  selectedDate,
  selectedTime,
  onComplete,
  hasGoogleCalendar = false,
}: BookingFormProps) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { trackStep } = useBookingAnalytics(bookingLink.id);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [formData, setFormData] = useState<BookingFormData>({
    name: "",
    email: "",
    phone: "",
    notes: "",
    smsReminders: false,
  });
  const [guests, setGuests] = useState<Array<{ name?: string; email: string }>>([]);

  // Platform selection state
  const [selectedVideoPlatform, setSelectedVideoPlatform] = useState<string>(
    bookingLink.video_platform || 'quantum_club'
  );

  // Track form view on mount
  useState(() => {
    trackStep("form_view");
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Phase 7: Track form submission attempt
    trackStep("form_submit");

    // Phase 5: Zod validation with specific error messages
    try {
      bookingFormSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof BookingFormData, string>> = {};
        err.errors.forEach((error) => {
          const field = error.path[0] as keyof BookingFormData;
          fieldErrors[field] = error.message;
        });
        setErrors(fieldErrors);
        toast.error("Please fix the errors in the form");
        return;
      }
    }

    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    setLoading(true);
    setLoadingStage("Verifying availability...");

    // Phase 4: Client-side validation - verify slot is still available
    try {
      const verification = await supabase.functions.invoke("get-available-slots", {
        body: {
          bookingLinkSlug: bookingLink.slug,
          dateRange: {
            start: format(selectedDate, "yyyy-MM-dd"),
            end: format(selectedDate, "yyyy-MM-dd"),
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (verification.data?.slots) {
        // Normalize selected time to 12-hour format
        const normalizedSelectedTime = normalizeTimeFormat(selectedTime);

        console.log('[BookingForm] Verifying slot availability:', {
          selectedTime,
          normalizedSelectedTime,
          totalSlots: verification.data.slots.length
        });

        // Check if slot is still available by comparing normalized times
        const isStillAvailable = verification.data.slots.some((slot: string) => {
          // Extract time portion from slot format "09:00 - 2025-11-13"
          const slotTimePart = slot.split(" - ")[0];
          // Normalize slot time to 12-hour format for comparison
          const normalizedSlotTime = normalizeTimeFormat(slotTimePart);

          console.log('[BookingForm] Comparing:', {
            slotTimePart,
            normalizedSlotTime,
            normalizedSelectedTime,
            match: normalizedSlotTime === normalizedSelectedTime
          });

          return normalizedSlotTime === normalizedSelectedTime;
        });

        if (!isStillAvailable) {
          logger.warn('Slot no longer available', { componentName: 'BookingForm', slot: normalizedSelectedTime });
          toast.error("This time slot was just booked. Please select another time.");
          setLoading(false);
          return;
        }

        logger.debug('Slot verified as available', { componentName: 'BookingForm' });
      }
    } catch (verifyError) {
      logger.warn('Could not verify slot availability', { componentName: 'BookingForm', error: verifyError });
      // Continue with booking attempt anyway - server-side validation will catch issues
    }

    try {
      // Execute reCAPTCHA only if enabled
      let recaptchaToken = "";
      if (RECAPTCHA_ENABLED) {
        setLoadingStage("Security verification...");
        if (!executeRecaptcha) {
          toast.error("reCAPTCHA not ready. Please refresh the page.");
          setLoading(false);
          return;
        }
        recaptchaToken = await executeRecaptcha("create_booking");

        if (!recaptchaToken) {
          toast.error("Security verification failed. Please try again.");
          setLoading(false);
          return;
        }
      }

      setLoadingStage("Processing booking...");

      // Parse and validate selected time with timezone utils
      const userTimezone = getUserTimezone();

      console.log('[BookingForm] Parsing selected time:', {
        selectedDate: format(selectedDate, 'yyyy-MM-dd'),
        selectedTime,
        userTimezone
      });

      const parsedTime = parseUserTimeSelection(selectedDate, selectedTime);

      if (!parsedTime) {
        console.error('[BookingForm] Failed to parse time:', {
          original: selectedTime,
          timezone: userTimezone,
          detectedFormat: detectTimeFormat(selectedTime)
        });
        toast.error("Invalid time format. Please select a time slot again.");
        setLoading(false);
        return;
      }

      console.log('[BookingForm] Time parsed successfully:', {
        hours: parsedTime.hours,
        minutes: parsedTime.minutes
      });

      const { scheduledStart, scheduledEnd } = createBookingTime(
        selectedDate,
        parsedTime.hours,
        parsedTime.minutes,
        bookingLink.duration_minutes,
        userTimezone
      );

      const headers: Record<string, string> = {};
      if (RECAPTCHA_ENABLED && recaptchaToken) {
        headers["x-recaptcha-token"] = recaptchaToken;
      }

      setLoadingStage("Creating your booking...");
      const { data, error } = await supabase.functions.invoke("create-booking", {
        headers,
        body: {
          bookingLinkSlug: bookingLink.slug,
          guestName: formData.name,
          guestEmail: formData.email,
          guestPhone: formData.phone || null,
          scheduledStart,
          scheduledEnd,
          timezone: userTimezone,
          notes: formData.notes || null,
          guests: guests.length > 0 ? guests : undefined,
          guestSelectedPlatform: bookingLink.allow_guest_platform_choice ? selectedVideoPlatform : undefined,
          smsReminders: formData.smsReminders || false,
        },
      });

      if (error) throw error;

      setLoadingStage("Confirmed!");
      trackStep("confirmation"); // Phase 7: Track successful booking
      toast.success("Booking confirmed! Check your email for details.");
      onComplete(data.booking.id);
    } catch (error: any) {
      console.error("Booking error:", error);

      // Parse the actual error from edge function response
      let errorMsg = "Failed to create booking. Please try again.";

      if (error.context?.body) {
        try {
          const errorBody = JSON.parse(error.context.body);
          errorMsg = errorBody.error || errorMsg;
        } catch {
          // Keep default message if parsing fails
        }
      } else if (error.message) {
        errorMsg = error.message;
      }

      // Phase 5: Improved error messages
      const errorLower = errorMsg.toLowerCase();

      if (errorLower.includes("calendar") && errorLower.includes("conflict")) {
        const provider = errorLower.includes("google") ? "Google Calendar" :
          errorLower.includes("microsoft") ? "Microsoft Calendar" : "your calendar";
        toast.error(`This time conflicts with an event in ${provider}. Please select another time.`);
      } else if (errorLower.includes("no longer available") || errorLower.includes("already booked") || errorLower.includes("just booked")) {
        toast.error("This time slot was just booked by someone else. Please select another time.");
      } else if (errorLower.includes("rate limit") || errorLower.includes("too many")) {
        toast.error("Too many booking attempts. Please wait a few minutes before trying again.");
      } else if (errorLower.includes("calendar") && (errorLower.includes("unavailable") || errorLower.includes("timeout"))) {
        toast.error("Unable to verify calendar availability. Please try again or contact support.");
      } else if (errorLower.includes("validation") || errorLower.includes("invalid")) {
        toast.error("Please check your booking details and try again.");
      } else if (errorLower.includes("not found") || errorLower.includes("not active")) {
        toast.error("This booking link is no longer active.");
      } else if (errorLower.includes("recaptcha")) {
        toast.error("Verification failed. Please refresh and try again.");
      } else {
        toast.error(`Unable to complete booking: ${errorMsg}`);
      }
    } finally {
      setLoading(false);
      setLoadingStage("");
    }
  };

  const guestTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const hostTimezone = bookingLink.host_timezone || guestTimezone;

  return (
    <div className="space-y-6">
      {/* Timezone Warning at top */}
      <TimezoneWarning 
        guestTimezone={guestTimezone}
        hostTimezone={hostTimezone}
        showToggle={false}
      />

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

      {/* Guest platform selector - show if host allows choice */}
      {bookingLink.allow_guest_platform_choice && bookingLink.available_platforms && (
        <GuestPlatformSelector
          availablePlatforms={bookingLink.available_platforms}
          selectedPlatform={selectedVideoPlatform}
          onPlatformChange={setSelectedVideoPlatform}
          hasGoogleCalendar={hasGoogleCalendar}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              setErrors({ ...errors, name: undefined });
            }}
            placeholder="Your full name"
            required
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
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
              setErrors({ ...errors, email: undefined });
            }}
            placeholder="you@example.com"
            required
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        {/* SMS Opt-in with improved UX */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="smsReminders"
              checked={formData.smsReminders}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, smsReminders: checked as boolean })
              }
            />
            <label
              htmlFor="smsReminders"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Send me text message reminders
            </label>
          </div>

          {/* Phone field - shown when SMS checkbox is checked or phone has value */}
          {(formData.smsReminders || formData.phone) && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="phone">
                Phone Number {formData.smsReminders && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setErrors({ ...errors, phone: undefined });
                }}
                placeholder="+1 (555) 000-0000"
                className={errors.phone ? "border-destructive" : ""}
                required={formData.smsReminders}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
              <p className="text-xs text-muted-foreground">
                We'll send you a reminder 1 hour before your meeting.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guests">Additional Guests (optional)</Label>
          <GuestEmailInput
            guests={guests}
            onChange={setGuests}
            maxGuests={10}
          />
          <p className="text-xs text-muted-foreground">
            Invite team members to join this meeting
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => {
              setFormData({ ...formData, notes: e.target.value });
              setErrors({ ...errors, notes: undefined });
            }}
            placeholder="Anything else you'd like to share..."
            rows={3}
            className={errors.notes ? "border-destructive" : ""}
          />
          {errors.notes && (
            <p className="text-sm text-destructive">{errors.notes}</p>
          )}
        </div>

        {/* Phase 4: 44px touch target */}
        <Button type="submit" disabled={loading} className="w-full min-h-[44px]" size="lg">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Processing...</span>
                {loadingStage && (
                  <span className="text-xs opacity-80">{loadingStage}</span>
                )}
              </div>
            </div>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm Booking
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By scheduling, you agree to receive email {formData.phone && "and SMS"} confirmations and reminders.
        </p>
      </form>
    </div>
  );
}
