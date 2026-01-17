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

interface BookingLink {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number | null;
  buffer_after_minutes: number | null;
  advance_booking_days: number | null;
  min_notice_hours: number | null;
  color: string;
  custom_questions: any;
  is_active: boolean | null;
  allow_guest_platform_choice?: boolean | null;
  available_platforms?: string[] | null;
  video_platform?: string | null;
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  work_timezone: string | null;
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
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
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
      const { data: linkData, error: linkError } = await supabase
        .from("booking_links")
        .select("*")
        .eq("slug", slug ?? '')
        .eq("is_active", true)
        .single();

      if (linkError) throw linkError;

      if (!linkData) {
        toast.error("Booking link not found");
        navigate("/");
        return;
      }

      setBookingLink(linkData as unknown as BookingLink);

      // Load profile with timezone
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, work_timezone")
        .eq("id", linkData.user_id)
        .single();

      if (!profileError && profileData) {
        setProfile(profileData);
        setHostTimezone(profileData.work_timezone);
      }

      // Check if host has Google Calendar connected
      const { data: calendarData } = await supabase
        .from("calendar_connections")
        .select("id")
        .eq("user_id", linkData.user_id)
        .eq("provider", "google")
        .eq("is_active", true)
        .limit(1);

      setHasGoogleCalendar(!!calendarData && calendarData.length > 0);
    } catch (error: any) {
      console.error("Error loading booking link:", error);
      toast.error("Failed to load booking page");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
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
      setSelectedTime(null);
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

  return (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <MinimalHeader showBackButton={false} showHelpLink={true} />
        <div className="container mx-auto py-8 px-4 max-w-5xl flex-1">
          {/* Header */}
          <div className="mb-8 text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback>{profile?.full_name?.[0] || "Q"}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold mb-2">{profile?.full_name || "Quantum Club Member"}</h1>
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
                    {selectedTime && (
                      <span className="font-medium text-foreground">
                        {selectedTime}
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
                        onBookingScheduled={(date, time) => {
                          setSelectedDate(date);
                          setSelectedTime(time);
                          setStep("details");
                          setShowAIAssistant(false);
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

                {step === "details" && selectedDate && selectedTime && (
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
                        allow_guest_platform_choice: bookingLink.allow_guest_platform_choice ?? undefined,
                      } as any}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
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
    </GoogleReCaptchaProvider>
  );
}
