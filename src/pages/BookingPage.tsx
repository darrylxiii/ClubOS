import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Calendar, Clock, ArrowLeft, Sparkles, RefreshCw, WifiOff, AlertCircle } from "lucide-react";
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
import { getAvailableSlots } from "@/services/availability";
import { getBookingPage } from "@/services/booking-page";
import { safeFormatTime } from "@/lib/safeTimeFormat";
import { useTimeFormatPreference } from "@/hooks/useTimeFormatPreference";

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
  guest_permissions?: {
    allow_guest_cancel?: boolean;
    allow_guest_reschedule?: boolean;
    allow_guest_propose_times?: boolean;
    allow_guest_add_attendees?: boolean;
    booker_can_delegate?: boolean;
  };
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

type ErrorType = 'network' | 'not_found' | 'inactive' | 'unknown';

function classifyError(error: any): ErrorType {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('network') || message.includes('fetch') || message.includes('cors') || message.includes('timeout')) {
    return 'network';
  }
  if (message.includes('not found') || message.includes('404') || message.includes('inactive')) {
    return 'not_found';
  }
  return 'unknown';
}

function getErrorMessage(errorType: ErrorType): { title: string; description: string } {
  switch (errorType) {
    case 'network':
      return {
        title: 'Connection error',
        description: 'Unable to reach the scheduling service. Please check your internet connection and try again.',
      };
    case 'not_found':
      return {
        title: 'Booking link not found',
        description: 'This booking link doesn\'t exist or has been deactivated.',
      };
    case 'inactive':
      return {
        title: 'Booking link inactive',
        description: 'This booking link is currently not accepting new bookings.',
      };
    default:
      return {
        title: 'Booking page unavailable',
        description: 'Something went wrong loading this booking page. Please try again.',
      };
  }
}

export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
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
  const [loadError, setLoadError] = useState<ErrorType | null>(null);

  // Phase 7: Analytics tracking
  const analytics = useBookingAnalytics(bookingLink?.id || "");

  const loadBookingLink = useCallback(async () => {
    try {
      setLoadError(null);
      setLoading(true);

      if (!slug) {
        setLoadError('not_found');
        return;
      }

      const data = await getBookingPage(slug);

      if (!data?.bookingLink) {
        setLoadError('not_found');
        return;
      }

      if (!data.bookingLink.is_active) {
        setLoadError('inactive');
        return;
      }

      setBookingLink(data.bookingLink as BookingLink);
      setProfile((data.host ?? null) as Profile | null);
      setHostTimezone((data.host?.work_timezone ?? null) as string | null);
      setHasGoogleCalendar(!!data.hasGoogleCalendar);
    } catch (error: unknown) {
      console.error("Error loading booking link:", error);
      setLoadError(classifyError(error));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadBookingLink();
  }, [loadBookingLink]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    loadBookingLink();
  };

  const resolveSlotFromLabel = async (date: Date, timeLabel: string) => {
    const dateStr = date.toISOString().split('T')[0];
    if (!dateStr) return null;

    const data = await getAvailableSlots({
      bookingLinkSlug: slug || '',
      dateRange: { start: dateStr, end: dateStr },
      timezone,
    });

    const dataObj = data as unknown as Record<string, unknown> | null;
    const slots = Array.isArray(dataObj?.slots) ? (dataObj.slots as Array<Record<string, unknown>>) : [];
    const match = slots.find((s) => {
      if (!s || typeof s !== 'object') return false;
      if (typeof s.start !== 'string') return false;
      const label = safeFormatTime(s.start, timezone, '12h');
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
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            {retryCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
              >
                <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">
                  Attempt {retryCount + 1}
                </span>
              </motion.div>
            )}
          </div>
          <p className="mt-6 text-muted-foreground">
            {retryCount > 0 ? 'Reconnecting...' : 'Loading booking page...'}
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !bookingLink) {
    const errorInfo = getErrorMessage(loadError || 'unknown');
    const isNetworkError = loadError === 'network';
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              {isNetworkError ? (
                <WifiOff className="h-6 w-6 text-muted-foreground" />
              ) : (
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <CardTitle>{errorInfo.title}</CardTitle>
            <CardDescription className="mt-2">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Go to homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
                        {safeFormatTime(selectedSlot.start, timezone, '12h')}
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
