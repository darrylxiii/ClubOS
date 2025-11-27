import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { StageDetailCard } from "./StageDetailCard";
import { StageCandidatesList } from "./StageCandidatesList";
import { PipelineMeetingCard } from "./PipelineMeetingCard";
import type { DisplaySettings } from "./PipelineDisplaySettings";
import { RescheduleDialog } from "@/components/booking/RescheduleDialog";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

interface Stage {
  name: string;
  order: number;
  owner?: 'company' | 'quantum_club';
  format?: 'online' | 'in_person' | 'hybrid' | 'assessment';
  location?: string;
  meeting_link?: string;
  meeting_type?: string;
  assessment_type?: string;
  platform?: string;
  duration_minutes?: number;
  interviewers?: string[];
  materials_required?: string[];
  evaluation_criteria?: string;
  resources?: string[];
  description?: string;
}

interface Application {
  id: string;
  current_stage_index: number;
  full_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  current_title?: string;
  current_company?: string;
  linkedin_url?: string;
  user_id: string;
  candidate_id?: string;
  applied_at: string;
  updated_at?: string;
  status?: string;
  stages: any[];
  is_linked_user?: boolean;
}

interface Booking {
  id: string;
  title?: string;
  scheduled_start: string;
  scheduled_end: string;
  meeting_link?: string;
  status: string;
  interview_type?: string;
  interviewer_ids?: string[];
  interview_prep_sent_at?: string;
  feedback_submitted_at?: string;
  application_id?: string;
  guest_name?: string;
  guest_email?: string;
}

interface ExpandablePipelineStageProps {
  stage: Stage;
  stageIndex: number;
  candidateCount: number;
  avgDays: number;
  conversionRate?: number;
  applications: Application[];
  jobId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (stage: Stage) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAdvanceCandidate: (app: Application) => void;
  onRejectCandidate: (app: Application) => void;
  onViewProfile: (app: Application) => void;
  displaySettings: DisplaySettings;
  totalStages: number;
}

export function ExpandablePipelineStage({
  stage,
  stageIndex,
  candidateCount,
  avgDays,
  conversionRate,
  applications,
  jobId,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDuplicate,
  onDelete,
  onAdvanceCandidate,
  onRejectCandidate,
  onViewProfile,
  displaySettings,
  totalStages,
}: ExpandablePipelineStageProps) {
  const [stageBookings, setStageBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedBookingLink, setSelectedBookingLink] = useState<any>(null);

  useEffect(() => {
    if (isExpanded && applications.length > 0) {
      fetchStageBookings();
    }
  }, [isExpanded, applications]);

  const fetchStageBookings = async () => {
    setLoadingBookings(true);
    try {
      const applicationIds = applications.map(app => app.id);

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .in('application_id', applicationIds)
        .eq('is_interview_booking', true)
        .eq('interview_stage_index', stageIndex)
        .order('scheduled_start', { ascending: true });

      if (error) throw error;
      setStageBookings(data || []);
    } catch (error) {
      console.error('Error fetching stage bookings:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleJoinMeeting = (bookingId: string) => {
    const booking = stageBookings.find(b => b.id === bookingId);
    if (booking?.meeting_link) {
      window.open(booking.meeting_link, '_blank');
    }
  };

  const handleRescheduleMeeting = async (bookingId: string) => {
    const booking = stageBookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      // Fetch booking with booking link
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          booking_links (
            id,
            slug,
            title,
            duration_minutes,
            color,
            user_id,
            advance_booking_days,
            min_notice_hours
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      setSelectedBooking({
        id: data.id,
        guest_name: data.guest_name || booking.guest_name || 'Guest',
        scheduled_start: data.scheduled_start,
        scheduled_end: data.scheduled_end,
        status: data.status || 'scheduled',
      });
      setSelectedBookingLink(data.booking_links);
      setRescheduleDialogOpen(true);
    } catch (error) {
      console.error('Error loading booking for reschedule:', error);
    }
  };

  const handleRescheduled = () => {
    fetchStageBookings(); // Refresh bookings
  };

  return (
    <Card className="overflow-hidden">
      {/* Stage Header - Always visible, clickable to expand */}
      <div onClick={onToggleExpand} className="cursor-pointer">
        <StageDetailCard
          stage={stage}
          candidateCount={candidateCount}
          avgDays={avgDays}
          conversionRate={conversionRate}
          displaySettings={displaySettings}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onViewAnalytics={() => { }}
          isExpandable={true}
          isExpanded={isExpanded}
        />
      </div>

      {/* Candidate List & Meeting Cards - Only when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <CardContent className="border-t pt-6 bg-muted/20 space-y-6">
              {/* Scheduled Interviews Section */}
              {stageBookings.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Scheduled Interviews ({stageBookings.length})</span>
                  </div>
                  <div className="space-y-3">
                    {stageBookings.map((booking) => {
                      const application = applications.find(app => app.id === booking.application_id);
                      if (!application) return null;

                      return (
                        <PipelineMeetingCard
                          key={booking.id}
                          booking={{
                            id: booking.id,
                            title: booking.title || booking.guest_name || 'Interview',
                            scheduled_start: booking.scheduled_start,
                            scheduled_end: booking.scheduled_end,
                            meeting_link: booking.meeting_link,
                            status: booking.status,
                            interview_type: booking.interview_type,
                            interviewer_ids: booking.interviewer_ids,
                            interview_prep_sent_at: booking.interview_prep_sent_at,
                            feedback_submitted_at: booking.feedback_submitted_at,
                          }}
                          application={{
                            id: application.id,
                            candidate_full_name: application.full_name,
                            candidate_email: application.email,
                          }}
                          stage={stage}
                          onJoin={handleJoinMeeting}
                          onReschedule={handleRescheduleMeeting}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Candidates List */}
              <div className={stageBookings.length > 0 ? "pt-3 border-t" : ""}>
                <StageCandidatesList
                  candidates={applications}
                  stageIndex={stageIndex}
                  stageName={stage.name}
                  totalStages={totalStages}
                  jobId={jobId}
                  onAdvance={onAdvanceCandidate}
                  onReject={onRejectCandidate}
                  onViewDetails={onViewProfile}
                />
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reschedule Dialog */}
      {selectedBooking && selectedBookingLink && (
        <RescheduleDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          booking={{
            ...selectedBooking,
            guest_name: selectedBooking.guest_name || 'Guest',
          }}
          bookingLink={selectedBookingLink}
          onRescheduled={handleRescheduled}
        />
      )}
    </Card>
  );
}
