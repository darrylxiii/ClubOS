import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingForm } from "@/components/booking/BookingForm";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";
import { UnifiedDateTimeSelector } from "@/components/booking/UnifiedDateTimeSelector";
import { AIBookingAssistant } from "@/components/booking/AIBookingAssistant";
import { TimezoneSelector } from "@/components/booking/TimezoneSelector";
import { MinimalHeader } from "@/components/MinimalHeader";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { RECAPTCHA_SITE_KEY } from "@/config/recaptcha";
import { useBookingAnalytics } from "@/hooks/useBookingAnalytics";
import confetti from 'canvas-confetti';
import { formatInTimeZone } from "date-fns-tz";
import { getAvailableSlots } from "@/services/availability";

interface BookingLink {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  advance_booking_days: number;
  min_notice_hours: number;
  color: string;
  custom_questions: any;
  is_active: boolean;
  allow_guest_platform_choice?: boolean;
  available_platforms?: string[];
  video_platform?: string;
  host_display_mode?: 'full' | 'discreet' | 'avatar_only' | 'name_only';
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  work_timezone: string | null;
  display_mode?: 'full' | 'discreet' | 'avatar_only' | 'name_only';
}

interface SelectedSlot {
  start: string;
  end: string;
}

type BookingStep = "datetime" | "details" | "confirmation";
type ViewMode = "day" | "week";

export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("datetime");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  const [hostTimezone, setHostTimezone] = useState<string | null>(null);

  // Phase 7: Analytics tracking
  const analytics = useBookingAnalytics(bookingLink?.id || "");

  useEffect(() => {
    loadBookingLink();
  }, [slug]);

  const loadBookingLink = async () => {
    try {
      const response = await supabase.functions.invoke('get-booking-page', {
        body: { slug },
      });

      // Handle edge function errors
      if (response.error) {
        console.error("Edge function error:", response.error);
        toast.error('Failed to load booking page');
        setLoading(false);
        return;
      }

      const data = response.data;
      
      // Check if we got error in the response body
      if (data?.error) {
        console.error("Booking page error:", data.error);
        toast.error(data.error === 'Booking link not found' ? 'Booking link not found' : 'Failed to load booking page');
        setLoading(false);
        return;
      }

      if (!data?.bookingLink) {
        toast.error('Booking link not found');
        setLoading(false);
        return;
      }

      setBookingLink(data.bookingLink as BookingLink);
      setProfile((data.host ?? null) as Profile | null);
      setHostTimezone((data.host?.work_timezone ?? null) as string | null);
      setHasGoogleCalendar(!!data.hasGoogleCalendar);
    } catch (error: any) {
      console.error("Error loading booking link:", error);
      toast.error("Failed to load booking page");
    } finally {
      setLoading(false);
    }
  };

  const resolveSlotFromLabel = async (date: Date, timeLabel: string) => {
    const dateStr = date.toISOString().split('T')[0];
    if (!dateStr) return null;

    const data = await getAvailableSlots({
      bookingLinkSlug: slug || '',
      dateRange: { start: dateStr, end: dateStr },
      timezone,
    });

    const slots = Array.isArray((data as any)?.slots) ? (data as any).slots : [];
    const match = slots.find((s: any) => {
      if (!s || typeof s !== 'object') return false;
      if (typeof s.start !== 'string') return false;
      const label = formatInTimeZone(s.start, timezone, 'h:mm a');
      return label === timeLabel;
    });

    if (!match) return null;
    return { start: match.start as string, end: match.end as string } as SelectedSlot;
  };

  const handleDateTimeSelect = (date: Date, slot: SelectedSlot) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
    setStep("details");
  };

  const handleBookingComplete = (id: string) => {
    setBookingId(id);
    setStep("confirmation");

    // Trigger success confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4ade80', '#22c55e', '#16a34a']
    });
  };

  const handleBack = () => {
    if (step === "details") {
      setStep("datetime");
      setSelectedSlot(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (!bookingLink) {
    return null;
  }

  const pageContent = (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <MinimalHeader showBackButton={false} showHelpLink={true} />
      <div className="container mx-auto py-8 px-4 max-w-5xl flex-1">
          {/* Header */}
          <div className="mb-8 text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback>{profile?.full_name?.[0] || "Q"}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold mb-2">{profile?.full_name || "The Quantum Club"}</h1>
          </div>

          <Card className="mx-auto" style={{ borderTopColor: bookingLink.color, borderTopWidth: 4 }}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{bookingLink.title}</CardTitle>
                  {bookingLink.description && (
                    <CardDescription className="mt-2 text-base">
                      {bookingLink.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {bookingLink.duration_minutes} minutes
                    </span>
                    {selectedDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {selectedDate.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {selectedSlot && (
                      <span className="font-medium text-foreground">
                        {selectedSlot
                          ? formatInTimeZone(selectedSlot.start, timezone, 'h:mm a')
                          : null}
                      </span>
                    )}
                  </div>
                </div>
                {step === "details" && (
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                {step === "datetime" && (
                  <motion.div
                    key="datetime"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <TimezoneSelector value={timezone} onChange={setTimezone} />
                      <Button
                        variant="outline"
                        onClick={() => setShowAIAssistant(!showAIAssistant)}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        {showAIAssistant ? "Show Calendar" : "AI Assistant"}
                      </Button>
                    </div>

                    {showAIAssistant ? (
                      <AIBookingAssistant
                        bookingLink={bookingLink}
                        onBookingScheduled={async (date, timeLabel) => {
                          try {
                            const slot = await resolveSlotFromLabel(date, timeLabel);
                            if (!slot) {
                              toast.error('That time is no longer available. Please choose again.');
                              return;
                            }
                            setSelectedDate(date);
                            setSelectedSlot(slot);
                            setStep('details');
                            setShowAIAssistant(false);
                          } catch {
                            toast.error('Unable to confirm that time. Please pick from the calendar.');
                          }
                        }}
                      />
                    ) : (
                      <UnifiedDateTimeSelector
                        bookingLink={bookingLink}
                        onDateTimeSelected={handleDateTimeSelect}
                        hostTimezone={hostTimezone || undefined}
                      />
                    )}
                  </motion.div>
                )}

                {step === "details" && selectedDate && selectedSlot && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <BookingForm
                      bookingLink={{
                        ...bookingLink,
                        host_timezone: hostTimezone || undefined,
                      }}
                      selectedDate={selectedDate}
                      selectedSlot={selectedSlot}
                      onComplete={handleBookingComplete}
                      hasGoogleCalendar={hasGoogleCalendar}
                    />
                  </motion.div>
                )}

                {step === "confirmation" && bookingId && (
                  <motion.div
                    key="confirmation"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <BookingConfirmation
                      bookingId={bookingId}
                      bookingLink={bookingLink}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Powered by The Quantum Club</p>
          </div>
      </div>
    </div>
  );

  // In preview builds, VITE_RECAPTCHA_SITE_KEY may be missing at runtime.
  // Avoid mounting the provider with an empty key (it can throw).
  return RECAPTCHA_SITE_KEY ? (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      {pageContent}
    </GoogleReCaptchaProvider>
  ) : (
    pageContent
  );
}
