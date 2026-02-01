import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MoreVertical,
  Users,
  Clock,
  TrendingUp,
  MapPin,
  Lock,
  Zap,
  Target,
  LayoutDashboard,
  Eye,
  EyeOff,
  Archive,
  RotateCcw,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDaysOpenColor, getConversionColor } from '@/lib/jobUtils';
import { JobStatusBadge, JobStatus } from '@/components/jobs/JobStatusBadge';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { format, formatDistanceToNow } from 'date-fns';

interface JobWithMetrics {
  id: string;
  title: string;
  status: string;
  location: string;
  created_at: string;
  club_sync_status: 'accepted' | 'pending' | 'not_offered' | null;
  candidate_count: number;
  active_stage_count: number;
  last_activity: string | null;
  last_activity_user: { name: string; avatar: string | null } | null;
  days_since_opened: number;
  conversion_rate: number | null;
  company_name: string;
  company_logo: string | null;
  is_stealth: boolean;
  is_continuous: boolean;
  hired_count: number;
  target_hire_count: number | null;
}

interface JobListViewProps {
  jobs: JobWithMetrics[];
  selectedIds: Set<string>;
  focusedIndex: number;
  onToggleSelect: (jobId: string) => void;
  onNavigate: (jobId: string) => void;
  onPublish: (jobId: string, title: string) => void;
  onUnpublish: (jobId: string, title: string) => void;
  onClose: (jobId: string, title: string) => void;
  onReopen: (jobId: string, title: string) => void;
  onArchive: (jobId: string, title: string) => void;
  onRestore: (jobId: string, title: string) => void;
  isSelected: (jobId: string) => boolean;
}

const JobListItem = memo(({
  job,
  isSelected,
  isFocused,
  onToggleSelect,
  onNavigate,
  onPublish,
  onUnpublish,
  onClose,
  onReopen,
  onArchive,
  onRestore,
}: {
  job: JobWithMetrics;
  isSelected: boolean;
  isFocused: boolean;
  onToggleSelect: () => void;
  onNavigate: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onClose: () => void;
  onReopen: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) => {
  return (
    <Card 
      className={cn(
        'border border-border/20 bg-card/20 backdrop-blur-sm cursor-pointer transition-all hover:border-border/40 hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary/40',
        isFocused && 'ring-1 ring-primary/50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />

          {/* Company Logo */}
          <Avatar className="h-10 w-10 border border-border/20 shrink-0">
            <AvatarImage src={job.company_logo || undefined} alt={job.company_name} />
            <AvatarFallback className="text-sm bg-card/40">
              {job.company_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center" onClick={onNavigate}>
            {/* Title + Company */}
            <div className="md:col-span-4 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{job.title}</span>
                {job.is_stealth && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>Confidential</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{job.company_name}</span>
                <span>•</span>
                <span className="flex items-center gap-1 shrink-0">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              </div>
            </div>

            {/* Status + Badges */}
            <div className="md:col-span-2 flex items-center gap-1 flex-wrap">
              <JobStatusBadge status={job.status as JobStatus} size="sm" />
              {job.club_sync_status === 'accepted' && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-primary/10 text-primary border-primary/30">
                  <Zap className="h-2.5 w-2.5" />
                </Badge>
              )}
            </div>

            {/* Metrics */}
            <div className="md:col-span-4 flex items-center gap-4 text-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">{job.candidate_count}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{job.active_stage_count} active</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className={cn('flex items-center gap-1.5', getDaysOpenColor(job.days_since_opened))}>
                <Clock className="h-4 w-4" />
                <span className="font-medium">{job.days_since_opened}d</span>
              </div>

              {job.conversion_rate !== null ? (
                <div className={cn('flex items-center gap-1.5', getConversionColor(job.conversion_rate))}>
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">{job.conversion_rate}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>—</span>
                </div>
              )}

              {job.is_continuous && job.target_hire_count && (
                <div className="flex items-center gap-1.5 text-blue-500">
                  <Target className="h-4 w-4" />
                  <span className="font-medium">{job.hired_count}/{job.target_hire_count}</span>
                </div>
              )}
            </div>

            {/* Last Activity */}
            <div className="md:col-span-2 text-xs text-muted-foreground">
              {job.last_activity ? (
                <span>
                  {formatDistanceToNow(new Date(job.last_activity), { addSuffix: true })}
                </span>
              ) : (
                <span>No activity</span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate();
              }}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden lg:inline">Dashboard</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onNavigate}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  View Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {job.status === 'draft' && (
                  <DropdownMenuItem onClick={onPublish}>
                    <Eye className="h-4 w-4 mr-2" />
                    Publish
                  </DropdownMenuItem>
                )}
                {job.status === 'published' && (
                  <>
                    <DropdownMenuItem onClick={onUnpublish}>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Unpublish
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onClose}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Close
                    </DropdownMenuItem>
                  </>
                )}
                {job.status === 'closed' && (
                  <DropdownMenuItem onClick={onReopen}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reopen
                  </DropdownMenuItem>
                )}
                {job.status !== 'archived' && (
                  <DropdownMenuItem onClick={onArchive} className="text-destructive">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                )}
                {job.status === 'archived' && (
                  <DropdownMenuItem onClick={onRestore}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

JobListItem.displayName = 'JobListItem';

export const JobListView = memo(({
  jobs,
  selectedIds,
  focusedIndex,
  onToggleSelect,
  onNavigate,
  onPublish,
  onUnpublish,
  onClose,
  onReopen,
  onArchive,
  onRestore,
  isSelected,
}: JobListViewProps) => {
  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No jobs found
      </div>
    );
  }

  // Use virtualized list for large datasets
  if (jobs.length > 50) {
    return (
      <VirtualizedList
        items={jobs}
        renderItem={(job, index) => (
          <JobListItem
            key={job.id}
            job={job}
            isSelected={isSelected(job.id)}
            isFocused={focusedIndex === index}
            onToggleSelect={() => onToggleSelect(job.id)}
            onNavigate={() => onNavigate(job.id)}
            onPublish={() => onPublish(job.id, job.title)}
            onUnpublish={() => onUnpublish(job.id, job.title)}
            onClose={() => onClose(job.id, job.title)}
            onReopen={() => onReopen(job.id, job.title)}
            onArchive={() => onArchive(job.id, job.title)}
            onRestore={() => onRestore(job.id, job.title)}
          />
        )}
        estimateSize={88}
        gap={8}
        className="max-h-[calc(100vh-400px)]"
        emptyMessage="No jobs found"
      />
    );
  }

  return (
    <div className="space-y-2">
      {jobs.map((job, index) => (
        <JobListItem
          key={job.id}
          job={job}
          isSelected={isSelected(job.id)}
          isFocused={focusedIndex === index}
          onToggleSelect={() => onToggleSelect(job.id)}
          onNavigate={() => onNavigate(job.id)}
          onPublish={() => onPublish(job.id, job.title)}
          onUnpublish={() => onUnpublish(job.id, job.title)}
          onClose={() => onClose(job.id, job.title)}
          onReopen={() => onReopen(job.id, job.title)}
          onArchive={() => onArchive(job.id, job.title)}
          onRestore={() => onRestore(job.id, job.title)}
        />
      ))}
    </div>
  );
});

JobListView.displayName = 'JobListView';
