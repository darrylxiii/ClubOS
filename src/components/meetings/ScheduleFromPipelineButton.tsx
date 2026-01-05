import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Video } from 'lucide-react';
import { CreateMeetingDialog } from './CreateMeetingDialog';

interface ScheduleFromPipelineButtonProps {
  candidateId: string;
  jobId?: string;
  applicationId?: string;
  companyId?: string;
  interviewStage?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onScheduled?: (meetingId: string) => void;
}

export const ScheduleFromPipelineButton = ({
  candidateId,
  jobId,
  applicationId,
  companyId,
  interviewStage,
  variant = 'outline',
  size = 'sm',
  className,
  onScheduled
}: ScheduleFromPipelineButtonProps) => {
  return (
    <CreateMeetingDialog
      trigger={
        <Button
          variant={variant}
          size={size}
          className={className}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Interview
        </Button>
      }
      onMeetingCreated={(meeting) => {
        onScheduled?.(meeting?.id);
      }}
    />
  );
};

// Quick action for video call
export const QuickVideoCallButton = ({
  candidateId,
  candidateName,
  onStarted
}: {
  candidateId: string;
  candidateName: string;
  onStarted?: () => void;
}) => {
  const [loading, setLoading] = useState(false);

  const handleQuickCall = async () => {
    setLoading(true);
    // Implementation would create an instant meeting
    // For now, just open the dialog
    onStarted?.();
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleQuickCall}
      disabled={loading}
      title={`Start call with ${candidateName}`}
    >
      <Video className="w-4 h-4" />
    </Button>
  );
};
