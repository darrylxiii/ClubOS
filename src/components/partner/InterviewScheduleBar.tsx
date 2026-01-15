import { Button } from '@/components/ui/button';
import { Calendar, Users } from 'lucide-react';

interface InterviewScheduleBarProps {
  applications: any[];
  jobId: string;
  stageIndex: number;
  stageName: string;
}

export const InterviewScheduleBar = ({
  applications,
  jobId,
  stageIndex,
  stageName,
}: InterviewScheduleBarProps) => {
  if (applications.length === 0) return null;

  return (
    <div className="mb-4 p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{applications.length} candidate{applications.length !== 1 ? 's' : ''} in this stage</span>
      </div>
      <Button variant="outline" size="sm" className="gap-2">
        <Calendar className="w-4 h-4" />
        Bulk Schedule
      </Button>
    </div>
  );
};
