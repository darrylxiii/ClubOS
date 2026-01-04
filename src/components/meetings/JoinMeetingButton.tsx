import { UnifiedCalendarEvent } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { getMeetingStatus } from "@/utils/meetingStatus";
import { useNavigate } from "react-router-dom";
import { notify } from "@/lib/notify";
import { Video, Clock } from "lucide-react";

interface JoinMeetingButtonProps {
  event: UnifiedCalendarEvent;
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function JoinMeetingButton({ event, size = "default", className }: JoinMeetingButtonProps) {
  const navigate = useNavigate();

  if (!event.is_quantum_club || !event.meeting_id) {
    return null;
  }

  const statusInfo = getMeetingStatus(event);

  const handleJoin = () => {
    if (!statusInfo.canJoin) {
      if (statusInfo.status === 'ended' && event.insights_available) {
        navigate(`/meetings/${event.meeting_id}/insights`);
      } else {
        notify.info("Cannot join meeting", { description: statusInfo.description });
      }
      return;
    }

    navigate(`/meetings/${event.meeting_id}/room`);
  };

  const buttonVariant = statusInfo.status === 'live' || statusInfo.status === 'ending-soon' || statusInfo.status === 'starting-soon' && statusInfo.canJoin
    ? 'default'
    : statusInfo.status === 'starting-soon'
    ? 'secondary'
    : 'outline';

  return (
    <Button
      size={size}
      variant={buttonVariant}
      onClick={handleJoin}
      className={className}
      disabled={!statusInfo.canJoin && statusInfo.status !== 'ended'}
    >
      {statusInfo.status === 'live' || statusInfo.status === 'ending-soon' ? (
        <>
          <Video className="h-4 w-4 mr-2" />
          {statusInfo.buttonText}
        </>
      ) : statusInfo.status === 'starting-soon' ? (
        <>
          <Clock className="h-4 w-4 mr-2" />
          {statusInfo.buttonText}
        </>
      ) : (
        statusInfo.buttonText
      )}
    </Button>
  );
}
