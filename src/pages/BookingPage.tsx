import { useState, useEffect, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Calendar, Clock, ArrowLeft, Sparkles, RefreshCw, WifiOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logoLight from "@/assets/quantum-club-logo.png";
import logoDark from "@/assets/quantum-logo-dark.png";
import { BookingForm } from "@/components/booking/BookingForm";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";
import { PaymentStep } from "@/components/booking/PaymentStep";
import { UnifiedDateTimeSelector } from "@/components/booking/UnifiedDateTimeSelector";
import { AIBookingAssistant } from "@/components/booking/AIBookingAssistant";
import { TimezoneSelector } from "@/components/booking/TimezoneSelector";
import { MinimalHeader } from "@/components/MinimalHeader";
import { BookingProgressStepper, type BookingStep } from "@/components/booking/BookingProgressStepper";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { RECAPTCHA_SITE_KEY } from "@/config/recaptcha";
import { useBookingAnalytics } from "@/hooks/useBookingAnalytics";
import { fireConfetti } from '@/utils/fireConfetti';
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
  custom_logo_url?: string | null;
  payment_required?: boolean;
  payment_amount?: number | null;
  payment_currency?: string;
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

// BookingStep type imported from BookingProgressStepper

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

function getErrorMessage(errorType: ErrorType, t: (key: string, fallback: string) => string): { title: string; description: string } {
  switch (errorType) {
    case 'network':
      return {
        title: t('text.bookingpage.connectionError', 'Connection error'),
        description: t('text.bookingpage.unableToReachTheSchedulingService', 'Unable to reach the scheduling service. Please check your internet connection and try again.'),
      };
    case 'not_found':
      return {
        title: t('text.bookingpage.bookingLinkNotFound', 'Booking link not found'),
        description: t('text.bookingpage.thisBookingLinkDoesntExist', "This booking link doesn't exist or has been deactivated."),
      };
    case 'inactive':
      return {
        title: t('text.bookingpage.bookingLinkInactive', 'Booking link inactive'),
        description: t('text.bookingpage.thisBookingLinkIsCurrentlyNot', 'This booking link is currently not accepting new bookings.'),
      };
    default:
      return {
        title: t('text.bookingpage.bookingPageUnavailable', 'Booking page unavailable'),
        description: t('text.bookingpage.somethingWentWrongLoadingThisBooking', 'Something went wrong loading this booking page. Please try again.'),
      };
  }
}

export default function BookingPage() {
  const { t } = useTranslation('common');
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
    // If payment is required and not yet paid, show payment step
    if (bookingLink?.payment_required && bookingLink?.payment_amount) {
      setBookingId(id);
      setStep("payment");
      return;
    }

    setBookingId(id);
    setStep("confirmation");

    fireConfetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4ade80', '#22c55e', '#16a34a']
    });
  };

  const handlePaymentComplete = () => {
    setStep("confirmation");
    fireConfetti({
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
          <div className="animate-pulse mx-auto mb-6">
            <img src={logoLight} alt={t('bookingPage.text1')} className="h-16 w-auto mx-auto dark:hidden" />
            <img src={logoDark} alt={t('bookingPage.text2')} className="h-16 w-auto mx-auto hidden dark:block" />
          </div>
          <p className="text-muted-foreground text-sm">
            {retryCount > 0 ? `Reconnecting... (attempt ${retryCount + 1})` : 'Loading booking page...'}
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !bookingLink) {
    const errorInfo = getErrorMessage(loadError || 'unknown', t);
    const isNetworkError = loadError === 'network';
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-6">
              <img src={logoLight} alt={t('bookingPage.text3')} className="h-12 w-auto mx-auto dark:hidden" />
              <img src={logoDark} alt={t('bookingPage.text4')} className="h-12 w-auto mx-auto hidden dark:block" />
            </div>
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          {/* Header */}
          <div className="mb-8 text-center">
            {/* Custom logo alongside TQC branding */}
            {bookingLink.custom_logo_url && (
              <img
                src={bookingLink.custom_logo_url}
                alt={t('bookingPage.text5')}
                className="h-10 w-auto mx-auto mb-3 object-contain"
              />
            )}
            <div className="mx-auto mb-4">
              <img src={logoLight} alt={t('bookingPage.text6')} className="h-16 w-auto mx-auto dark:hidden" />
              <img src={logoDark} alt={t('bookingPage.text7')} className="h-16 w-auto mx-auto hidden dark:block" />
            </div>
            {profile?.full_name && (
              <h1 className="text-2xl font-bold mb-1">{profile.full_name}</h1>
            )}
            <p className="text-xs text-muted-foreground">{t('bookingPage.text8')}</p>
          </div>

          {/* Progress Stepper */}
          <BookingProgressStepper currentStep={step} showPayment={!!bookingLink.payment_required} />

          <Card className="max-w-4xl mx-auto" style={{ borderTopColor: bookingLink.color, borderTopWidth: 4 }}>
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
                        {showAIAssistant ? t('text.bookingpage.showCalendar', 'Show Calendar') : t('text.bookingpage.aiAssistant', 'AI Assistant')}
                      </Button>
                    </div>

                    {showAIAssistant ? (
                      <AIBookingAssistant
                        bookingLink={bookingLink}
                        onBookingScheduled={async (date, timeLabel) => {
                          try {
                            const slot = await resolveSlotFromLabel(date, timeLabel);
                            if (!slot) {
                              toast.error(t('text.bookingpage.thatTimeIsNoLongerAvailable', 'That time is no longer available. Please choose again.'));
                              return;
                            }
                            setSelectedDate(date);
                            setSelectedSlot(slot);
                            setStep('details');
                            setShowAIAssistant(false);
                          } catch {
                            toast.error(t('text.bookingpage.unableToConfirmThatTimePlease', 'Unable to confirm that time. Please pick from the calendar.'));
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

                {step === "payment" && bookingLink.payment_required && bookingLink.payment_amount && selectedSlot && (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PaymentStep
                      bookingLinkSlug={bookingLink.slug}
                      paymentAmount={bookingLink.payment_amount}
                      paymentCurrency={bookingLink.payment_currency || "eur"}
                      guestEmail=""
                      guestName=""
                      scheduledStart={selectedSlot.start}
                      scheduledEnd={selectedSlot.end}
                      timezone={timezone}
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
          <div className="mt-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <img src={logoLight} alt="" className="h-4 w-auto dark:hidden opacity-50" />
            <img src={logoDark} alt="" className="h-4 w-auto hidden dark:block opacity-50" />
            <p>{t('bookingPage.text9')}</p>
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
