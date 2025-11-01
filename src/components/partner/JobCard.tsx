import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Edit, LayoutDashboard, Target } from "lucide-react";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    status: string;
    location: string;
    employment_type: string;
    created_at: string;
    pipeline_stages: any;
  };
  onViewDashboard: (jobId: string) => void;
  onEditPipeline: (jobId: string) => void;
}

export const JobCard = ({ job, onViewDashboard, onEditPipeline }: JobCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div className="flex-1 w-full">
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <CardDescription className="mt-2">
              <span className="block sm:inline">{job.location}</span>
              <span className="hidden sm:inline"> • </span>
              <span className="block sm:inline">{job.employment_type}</span>
            </CardDescription>
          </div>
          <Badge
            variant={
              job.status === 'published'
                ? 'default'
                : job.status === 'draft'
                ? 'secondary'
                : 'outline'
            }
            className="shrink-0"
          >
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Created {new Date(job.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 shrink-0" />
            <span>{(Array.isArray(job.pipeline_stages) ? job.pipeline_stages.length : 0)} stages</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="default"
            onClick={() => onViewDashboard(job.id)}
            className="w-full sm:w-auto"
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            View Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => onEditPipeline(job.id)}
            className="w-full sm:w-auto"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Pipeline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
