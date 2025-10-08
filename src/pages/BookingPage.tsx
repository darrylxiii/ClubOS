import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { BookingTimeSlots } from "@/components/booking/BookingTimeSlots";
import { BookingForm } from "@/components/booking/BookingForm";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";
import { BookingWeekView } from "@/components/booking/BookingWeekView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
}

type BookingStep = "calendar" | "time" | "details" | "confirmation";
type ViewMode = "day" | "week";

export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<BookingStep>("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  useEffect(() => {
    loadBookingLink();
  }, [slug]);

  const loadBookingLink = async () => {
    try {
      const { data: linkData, error: linkError } = await supabase
        .from("booking_links")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (linkError) throw linkError;
      
      if (!linkData) {
        toast.error("Booking link not found");
        navigate("/");
        return;
      }

      setBookingLink(linkData);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", linkData.user_id)
        .single();

      if (!profileError && profileData) {
        setProfile(profileData);
      }
    } catch (error: any) {
      console.error("Error loading booking link:", error);
      toast.error("Failed to load booking page");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep("time");
  };

  const handleTimeSelect = (time: string, date?: Date) => {
    if (date) setSelectedDate(date);
    setSelectedTime(time);
    setStep("details");
  };

  const handleBookingComplete = (id: string) => {
    setBookingId(id);
    setStep("confirmation");
  };

  const handleBack = () => {
    if (step === "time") {
      setStep("calendar");
      setSelectedTime(null);
    } else if (step === "details") {
      setStep("time");
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
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
              {step !== "calendar" && step !== "confirmation" && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {step === "calendar" && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="day">Day View</TabsTrigger>
                  <TabsTrigger value="week">Week View</TabsTrigger>
                </TabsList>
                <TabsContent value="day">
                  <BookingCalendar
                    bookingLink={bookingLink}
                    onDateSelect={handleDateSelect}
                  />
                </TabsContent>
                <TabsContent value="week">
                  <BookingWeekView
                    bookingLink={bookingLink}
                    onTimeSelect={(date, time) => {
                      setSelectedDate(date);
                      setSelectedTime(time);
                      setStep("details");
                    }}
                  />
                </TabsContent>
              </Tabs>
            )}

            {step === "time" && selectedDate && (
              <BookingTimeSlots
                bookingLink={bookingLink}
                selectedDate={selectedDate}
                onTimeSelect={handleTimeSelect}
              />
            )}

            {step === "details" && selectedDate && selectedTime && (
              <BookingForm
                bookingLink={bookingLink}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onComplete={handleBookingComplete}
              />
            )}

            {step === "confirmation" && bookingId && (
              <BookingConfirmation
                bookingId={bookingId}
                bookingLink={bookingLink}
              />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Powered by The Quantum Club</p>
        </div>
      </div>
    </div>
  );
}
