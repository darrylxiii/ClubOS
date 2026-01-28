import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Calendar, Clock, CheckCircle2, Video, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useInterviewBookingLinks } from "@/hooks/useInterviewBookingLinks";
import { InterviewSlotPicker } from "./InterviewSlotPicker";
import { format } from "date-fns";

interface SelfBookingWidgetProps {
  applicationId: string;
  companyId?: string;
  jobId?: string;
  jobTitle?: string;
  companyName?: string;
  onBookingComplete?: (bookingId: string) => void;
}

type BookingStep = "select-link" | "select-slot" | "confirm" | "success";

interface SelectedSlot {
  date: Date;
  time: string;
  start: string;
  end: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function SelfBookingWidget({
  applicationId,
  companyId,
  jobId,
  jobTitle,
  companyName,
  onBookingComplete,
}: SelfBookingWidgetProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [step, setStep] = useState<BookingStep>("select-link");
  const [selectedLink, setSelectedLink] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Fetch user profile
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  const { data: bookingLinks, isLoading: linksLoading } = useInterviewBookingLinks({
    applicationId,
    companyId,
    jobId,
  });

  const handleLinkSelect = (link: any) => {
    setSelectedLink(link);
    setStep("select-slot");
  };

  const handleSlotSelect = (slot: SelectedSlot) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleConfirmBooking = async () => {
    if (!selectedLink || !selectedSlot || !user || !profile) {
      toast.error("Missing required information");
      return;
    }

    setIsBooking(true);

    try {
      // Create the booking with interview context
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          booking_link_id: selectedLink.id,
          user_id: selectedLink.user_id,
          guest_name: profile.full_name || user.email?.split("@")[0] || "Candidate",
          guest_email: user.email,
          scheduled_start: selectedSlot.start,
          scheduled_end: selectedSlot.end,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          status: "confirmed",
          is_interview_booking: true,
          application_id: applicationId,
          job_id: jobId || null,
          candidate_id: user.id,
          interview_type: "candidate_scheduled",
          metadata: {
            job_title: jobTitle,
            company_name: companyName,
            booked_by_candidate: true,
          },
        })
        .select("id")
        .single();

      if (error) throw error;

      // Update application status to 'interview' if it's not already
      await supabase
        .from("applications")
        .update({ 
          status: "interview",
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId)
        .eq("candidate_id", user.id);

      // Log activity
      await supabase.from("activity_feed").insert({
        user_id: user.id,
        event_type: "interview_scheduled",
        event_data: {
          booking_id: booking.id,
          application_id: applicationId,
          job_title: jobTitle,
          company_name: companyName,
          scheduled_start: selectedSlot.start,
          self_booked: true,
        },
        visibility: "private",
      });

      setBookingId(booking.id);
      setStep("success");
      onBookingComplete?.(booking.id);
      toast.success("Interview scheduled successfully!");
    } catch (error: unknown) {
      console.error("Booking error:", error);
      const message = error instanceof Error ? error.message : "Failed to book interview";
      toast.error(message);
    } finally {
      setIsBooking(false);
    }
  };

  const handleBack = () => {
    if (step === "select-slot") {
      setStep("select-link");
      setSelectedLink(null);
    } else if (step === "confirm") {
      setStep("select-slot");
      setSelectedSlot(null);
    }
  };

  const resetWidget = () => {
    setStep("select-link");
    setSelectedLink(null);
    setSelectedSlot(null);
    setBookingId(null);
  };

  if (linksLoading) {
    return (
      <Card className="border-2 border-foreground">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading available times...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bookingLinks || bookingLinks.length === 0) {
    return (
      <Card className="border-2 border-foreground">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold mb-2">No Interview Slots Available</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Your strategist will reach out soon to schedule your interview
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <div className="w-1 h-6 bg-foreground" />
              {step === "success" ? "Interview Scheduled" : "Schedule Your Interview"}
            </CardTitle>
            {jobTitle && companyName && step !== "success" && (
              <CardDescription className="mt-1">
                {jobTitle} at {companyName}
              </CardDescription>
            )}
          </div>
          {(step === "select-slot" || step === "confirm") && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Step 1: Select Booking Link */}
        {step === "select-link" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose an interview type to view available times:
            </p>
            <div className="space-y-3">
              {bookingLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleLinkSelect(link)}
                  className="w-full p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={link.host_avatar} />
                      <AvatarFallback>
                        {link.host_name?.charAt(0) || "H"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{link.title}</h4>
                        <Badge variant="outline" className="shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          {link.duration_minutes}m
                        </Badge>
                      </div>
                      {link.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {link.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        with {link.host_name}
                      </p>
                    </div>
                    <Video className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Slot */}
        {step === "select-slot" && selectedLink && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Video className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{selectedLink.title}</span>
              <Badge variant="secondary" className="ml-auto">
                {selectedLink.duration_minutes} min
              </Badge>
            </div>
            
            <InterviewSlotPicker
              bookingLink={selectedLink}
              onSlotSelect={handleSlotSelect}
              selectedSlot={selectedSlot}
            />
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && selectedLink && selectedSlot && (
          <div className="space-y-6">
            <div className="p-6 bg-muted/30 rounded-lg space-y-4">
              <h4 className="font-semibold text-center">Review Your Booking</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Interview Type</span>
                  <span className="font-medium">{selectedLink.title}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {format(selectedSlot.date, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{selectedSlot.time}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{selectedLink.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">With</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedLink.host_avatar} />
                      <AvatarFallback>{selectedLink.host_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{selectedLink.host_name}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBack}
                disabled={isBooking}
              >
                Change Time
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmBooking}
                disabled={isBooking}
              >
                {isBooking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "success" && selectedSlot && (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-bold">You're All Set!</h3>
              <p className="text-muted-foreground">
                Your interview has been scheduled for
              </p>
              <p className="text-lg font-semibold">
                {format(selectedSlot.date, "EEEE, MMMM d")} at {selectedSlot.time}
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              <p>A calendar invite will be sent to your email.</p>
              <p className="mt-1">You can also view this in your Applications.</p>
            </div>

            <Button variant="outline" onClick={resetWidget}>
              Schedule Another Interview
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
