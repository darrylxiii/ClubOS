import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Calendar, DollarSign, Edit, Eye, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ContinuousPipelineBadge } from "@/components/jobs/ContinuousPipelineBadge";
import { ClubSyncBadge } from "@/components/jobs/ClubSyncBadge";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  status: string;
  location: string;
  employment_type: string;
  created_at: string;
  applications_count?: number;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  is_continuous?: boolean;
  hired_count?: number;
  target_hire_count?: number | null;
  club_sync_enabled?: boolean;
}

interface MobileJobCardProps {
  job: Job;
}

export function MobileJobCard({ job }: MobileJobCardProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "draft":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "closed":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{job.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={getStatusColor(job.status)} variant="secondary">
                {job.status}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {job.employment_type}
              </Badge>
              <ContinuousPipelineBadge
                isContinuous={job.is_continuous}
                hiredCount={job.hired_count || 0}
                targetHireCount={job.target_hire_count}
                size="sm"
              />
              <ClubSyncBadge 
                status={job.club_sync_enabled ? "accepted" : null} 
                size="sm" 
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Key Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 shrink-0" />
            <span>{job.applications_count || 0} applicants</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">{format(new Date(job.created_at), "MMM d, yyyy")}</span>
          </div>
          {job.salary_min && job.salary_max && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {job.currency || "$"}
                {job.salary_min / 1000}k-{job.salary_max / 1000}k
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="min-h-[44px] flex-col gap-1 h-auto py-2"
          >
            <Eye className="h-4 w-4" />
            <span className="text-xs">View</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/jobs/${job.id}/dashboard`)}
            className="min-h-[44px] flex-col gap-1 h-auto py-2"
          >
            <Edit className="h-4 w-4" />
            <span className="text-xs">Manage</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/jobs/${job.id}`
              );
              toast.success("Link copied to clipboard");
            }}
            className="min-h-[44px] flex-col gap-1 h-auto py-2"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
