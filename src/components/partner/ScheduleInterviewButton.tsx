import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useState } from 'react';
import { CreateInterviewDialog } from './CreateInterviewDialog';
import { T } from '@/components/T';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ScheduleInterviewButtonProps {
  application: any;
  jobId: string;
  stageIndex: number;
  stageName: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const ScheduleInterviewButton = ({
  application,
  jobId,
  stageIndex,
  stageName,
  variant = 'outline',
  size = 'sm',
  className = '',
}: ScheduleInterviewButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setDialogOpen(true)}
      >
        <Calendar className="w-4 h-4 mr-2" />
        <T k="common:actions.scheduleInterview" fallback="Schedule Interview" />
      </Button>

      <CreateInterviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={application}
        jobId={jobId}
        stageIndex={stageIndex}
        stageName={stageName}
        onInterviewCreated={() => {
          setDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: ['interviews'] });
          toast.success("Interview scheduled successfully");
        }}
      />
    </>
  );
};
