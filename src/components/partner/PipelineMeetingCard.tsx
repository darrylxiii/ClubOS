import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, differenceInMinutes, isPast, isFuture, isWithinInterval } from "date-fns";
import { Calendar, Clock, Users, Video, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { InterviewFeedbackDialog } from "./InterviewFeedbackDialog";
import { useQueryClient } from '@tanstack/react-query';

interface PipelineMeetingCardProps {
  booking: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    meeting_link?: string;
    status: string;
    interview_type?: string;
    interviewer_ids?: string[];
    interview_prep_sent_at?: string;
    feedback_submitted_at?: string;
  };
  application: {
    id: string;
    candidate_full_name?: string;
    candidate_email?: string;
  };
  stage: {
    name: string;
    order: number;
  };
  onJoin?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
  className?: string;
}

export const PipelineMeetingCard = ({
  booking,
  application,
  stage,
  onJoin,
  onReschedule,
  className,
}: PipelineMeetingCardProps) => {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const startTime = new Date(booking.scheduled_start);
  const endTime = new Date(booking.scheduled_end);
  const now = new Date();
  
  const minutesUntilStart = differenceInMinutes(startTime, now);
  const minutesUntilEnd = differenceInMinutes(endTime, now);
  
  // Determine meeting status
  const isLive = isWithinInterval(now, { start: startTime, end: endTime });
  const isUpcoming = isFuture(startTime);
  const isCompleted = isPast(endTime);
  const isStartingSoon = isUpcoming && minutesUntilStart <= 15;
  
  const getStatusBadge = () => {
    if (isLive) {
      return (
        <Badge variant="default" className="bg-green-500 text-white">
          <span className="animate-pulse mr-1">●</span> Live
        </Badge>
      );
    }
    if (isStartingSoon) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          Starting in {minutesUntilStart}m
        </Badge>
      );
    }
    if (isCompleted && !booking.feedback_submitted_at) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Feedback Pending
        </Badge>
      );
    }
    if (isCompleted && booking.feedback_submitted_at) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Complete
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        Scheduled
      </Badge>
    );
  };
  
  const getInterviewTypeColor = () => {
    const typeColors: Record<string, string> = {
      screening: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      technical: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      behavioral: "bg-green-500/10 text-green-600 border-green-500/20",
      culture_fit: "bg-pink-500/10 text-pink-600 border-pink-500/20",
      panel: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      founder: "bg-red-500/10 text-red-600 border-red-500/20",
      final: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    };
    return typeColors[booking.interview_type || 'other'] || "bg-muted text-muted-foreground border-border";
  };

  return (
    <Card className={cn("p-4 border-l-4 transition-all hover:shadow-md", className, {
      "border-l-green-500 bg-green-500/5": isLive,
      "border-l-yellow-500 bg-yellow-500/5": isStartingSoon,
      "border-l-red-500 bg-red-500/5": isCompleted && !booking.feedback_submitted_at,
      "border-l-border": (!isLive && !isStartingSoon) || booking.feedback_submitted_at,
    })}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-foreground line-clamp-1">
                {booking.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {application.candidate_full_name || application.candidate_email}
              </p>
            </div>
            {getStatusBadge()}
          </div>
          
          {/* Meeting Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(startTime, "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}</span>
            </div>
          </div>
          
          {/* Interview Type & Stage */}
          <div className="flex items-center gap-2">
            {booking.interview_type && (
              <Badge variant="outline" className={getInterviewTypeColor()}>
                {booking.interview_type.replace('_', ' ')}
              </Badge>
            )}
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              {stage.name}
            </Badge>
          </div>
          
          {/* Interviewers */}
          {booking.interviewer_ids && booking.interviewer_ids.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {booking.interviewer_ids.slice(0, 3).map((id, idx) => (
                  <Avatar key={id} className="w-6 h-6 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {String.fromCharCode(65 + idx)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {booking.interviewer_ids.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                    +{booking.interviewer_ids.length - 3}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {booking.interviewer_ids.length} interviewer{booking.interviewer_ids.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          {/* Prep & Feedback Status */}
          <div className="flex items-center gap-3 text-xs">
            {booking.interview_prep_sent_at && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>Prep sent</span>
              </div>
            )}
            {!booking.interview_prep_sent_at && !isCompleted && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>Prep pending</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-2">
          {(isLive || isStartingSoon) && booking.meeting_link && (
            <Button
              size="sm"
              onClick={() => onJoin?.(booking.id)}
              className="gap-2"
            >
              <Video className="w-4 h-4" />
              Join
            </Button>
          )}
          {isUpcoming && !isStartingSoon && onReschedule && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReschedule(booking.id)}
            >
              Reschedule
            </Button>
          )}
          {isCompleted && !booking.feedback_submitted_at && (
            <Button
              size="sm"
              variant="default"
              className="gap-2"
              onClick={() => setFeedbackDialogOpen(true)}
            >
              <FileText className="w-4 h-4" />
              Submit Feedback
            </Button>
          )}
        </div>
      </div>

      {/* Interview Feedback Dialog */}
      <InterviewFeedbackDialog
        booking={booking}
        application={application}
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        onSubmitted={() => {
          // Trigger data refetch via React Query
          queryClient.invalidateQueries({ queryKey: ['meetings', 'pipeline'] });
        }}
      />
    </Card>
  );
};
