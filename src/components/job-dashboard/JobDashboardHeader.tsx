import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Share2, MoreHorizontal, Trophy, Archive, Trash2, Brain } from "lucide-react";
import { ContinuousPipelineBadge } from "@/components/jobs/ContinuousPipelineBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from 'react-i18next';

interface JobDashboardHeaderProps {
  job: any;
  role: string | null;
  activeShareCount: number;
  onEdit: () => void;
  onShare: () => void;
  onJobContext: () => void;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export const JobDashboardHeader = memo(({
  job,
  role,
  activeShareCount,
  onEdit,
  onShare,
  onJobContext,
  onClose,
  onArchive,
  onDelete,
}: JobDashboardHeaderProps) => {
  const { t } = useTranslation('jobs');
  const navigate = useNavigate();

  const statusColor = job.status === 'published'
    ? 'bg-success/15 text-success border-success/30'
    : job.status === 'closed'
      ? 'bg-muted/30 text-muted-foreground border-border/30'
      : 'bg-warning/15 text-warning border-warning/30';

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      {/* Left: Back + Logo + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/jobs')}
          className="shrink-0 h-9 w-9"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        {job.companies?.logo_url && (
          <img
            src={job.companies.logo_url}
            alt={job.companies.name}
            className="w-8 h-8 rounded-lg object-cover border border-border/30 shrink-0"
          />
        )}

        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate leading-tight">
            {job.title}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            {job.companies?.name}
          </p>
        </div>

        <Badge
          variant="outline"
          className={`shrink-0 text-xs font-semibold capitalize border ${statusColor}`}
        >
          {job.status}
        </Badge>

        <ContinuousPipelineBadge
          isContinuous={job.is_continuous}
          hiredCount={job.hired_count || 0}
          targetHireCount={job.target_hire_count}
          size="sm"
          showProgress={false}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 gap-1.5 text-xs"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </Button>

        {(role === 'admin' || role === 'strategist') && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="h-8 gap-1.5 text-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            {activeShareCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
                {activeShareCount > 9 ? '9+' : activeShareCount}
              </span>
            )}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onJobContext}>
              <Brain className="w-4 h-4 mr-2" />
              Job Context
            </DropdownMenuItem>
            {job.status !== 'closed' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClose}>
                  <Trophy className="w-4 h-4 mr-2 text-success" />
                  Close Job
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="w-4 h-4 mr-2" />
              Archive Job
            </DropdownMenuItem>
            {(job.status === 'draft' || role === 'admin') && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Job
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

JobDashboardHeader.displayName = 'JobDashboardHeader';
