import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreVertical,
  MapPin,
  Lock,
  Flag,
  EyeOff,
  XCircle,
  Archive,
  RefreshCw,
  RotateCcw,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobStatusBadge, JobStatus } from '@/components/jobs/JobStatusBadge';
import { ClubSyncBadge } from '@/components/jobs/ClubSyncBadge';

interface CompactJobCardProps {
  job: {
    id: string;
    title: string;
    status: string;
    location: string;
    created_at: string;
    club_sync_status: string | null;
    candidate_count: number;
    active_stage_count: number;
    days_since_opened: number;
    conversion_rate: number | null;
    company_name: string;
    company_logo: string | null;
    is_stealth: boolean;
    last_activity: string | null;
  };
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
}

// Simple sparkline SVG
const MiniSparkline = memo(({ data }: { data: number[] }) => {
  if (data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const width = 40;
  const height = 16;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');

  const trend = data[data.length - 1] >= data[0] ? 'up' : 'down';
  const color = trend === 'up' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))';

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

MiniSparkline.displayName = 'MiniSparkline';

// Generate mock trend data based on candidate count
const generateTrendData = (candidateCount: number, daysOpen: number) => {
  const days = Math.min(7, daysOpen);
  const base = Math.floor(candidateCount / Math.max(days, 1));
  return Array.from({ length: 7 }, (_, i) => Math.max(0, base + Math.floor(Math.random() * 3) - 1));
};

// Get next action suggestion based on job metrics
const getNextAction = (job: CompactJobCardProps['job']) => {
  const lastActivityDays = job.last_activity 
    ? Math.floor((Date.now() - new Date(job.last_activity).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (job.active_stage_count > 0 && lastActivityDays > 3) {
    return { text: `${job.active_stage_count} awaiting feedback`, urgent: true };
  }
  if (job.days_since_opened > 45 && job.candidate_count < 5) {
    return { text: 'Needs promotion', urgent: true };
  }
  if (lastActivityDays > 7) {
    return { text: 'Pipeline stalled', urgent: true };
  }
  if (job.conversion_rate && job.conversion_rate >= 20) {
    return { text: 'High performing', urgent: false };
  }
  return null;
};

export const CompactJobCard = memo(({
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
}: CompactJobCardProps) => {
  const nextAction = getNextAction(job);
  const trendData = generateTrendData(job.candidate_count, job.days_since_opened);

  return (
    <Card
      className={cn(
        'relative group cursor-pointer transition-all duration-200',
        'border border-border/20 bg-card/20 backdrop-blur-sm',
        'hover:border-border/40 hover:bg-card/30',
        isSelected && 'ring-2 ring-primary border-primary/40',
        isFocused && 'ring-2 ring-primary/50 border-primary/30'
      )}
      onClick={onNavigate}
    >
      <div className="p-4 space-y-3">
        {/* Row 1: Checkbox, Logo, Title, Status, Menu */}
        <div className="flex items-center gap-3">
          {/* Checkbox - visible on hover or when selected */}
          <div 
            className={cn(
              'shrink-0 transition-opacity',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="h-4 w-4"
            />
          </div>

          {/* Company Logo */}
          <Avatar className="h-8 w-8 border border-border/20 shrink-0">
            <AvatarImage src={job.company_logo || undefined} alt={job.company_name} />
            <AvatarFallback className="bg-card/40 text-foreground text-xs font-medium">
              {job.company_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Title + Company */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm text-foreground truncate">
                {job.title}
              </h3>
              {job.is_stealth && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Confidential</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{job.company_name}</p>
          </div>

          {/* Status Badge */}
          <JobStatusBadge status={job.status as JobStatus} size="sm" />

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {job.status === 'draft' && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublish(); }}>
                    <Flag className="h-4 w-4 mr-2 text-success" />
                    Publish
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
              
              {job.status === 'published' && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnpublish(); }}>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Unpublish
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClose(); }}>
                    <XCircle className="h-4 w-4 mr-2 text-warning" />
                    Close
                  </DropdownMenuItem>
                </>
              )}
              
              {job.status === 'closed' && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReopen(); }}>
                    <RefreshCw className="h-4 w-4 mr-2 text-success" />
                    Reopen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
              
              {job.status === 'archived' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRestore(); }}>
                  <RotateCcw className="h-4 w-4 mr-2 text-success" />
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Row 2: Location, Days Open, Next Action */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pl-7">
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{job.location}</span>
            </div>
          )}
          <span>•</span>
          <span className={cn(
            job.days_since_opened > 45 ? 'text-amber-500' : 
            job.days_since_opened > 30 ? 'text-warning' : ''
          )}>
            {job.days_since_opened}d open
          </span>
          
          {nextAction && (
            <>
              <span>•</span>
              <div className={cn(
                'flex items-center gap-1',
                nextAction.urgent ? 'text-amber-500' : 'text-primary'
              )}>
                {nextAction.urgent ? (
                  <AlertCircle className="h-3 w-3" />
                ) : (
                  <Lightbulb className="h-3 w-3" />
                )}
                <span className="truncate max-w-[120px]">{nextAction.text}</span>
              </div>
            </>
          )}
          
          <ClubSyncBadge status={job.club_sync_status as any} size="sm" />
        </div>

        {/* Row 3: Metrics bar */}
        <div className="flex items-center gap-4 pl-7 pt-1 border-t border-border/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{job.candidate_count}</span>
            <span className="text-xs text-muted-foreground">candidates</span>
          </div>
          <span className="text-muted-foreground/50">│</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{job.active_stage_count}</span>
            <span className="text-xs text-muted-foreground">active</span>
          </div>
          <span className="text-muted-foreground/50">│</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-semibold',
              job.conversion_rate && job.conversion_rate >= 15 ? 'text-success' :
              job.conversion_rate && job.conversion_rate < 5 ? 'text-muted-foreground' : 'text-foreground'
            )}>
              {job.conversion_rate !== null ? `${job.conversion_rate}%` : '—'}
            </span>
            <span className="text-xs text-muted-foreground">conv</span>
          </div>
          
          {/* Sparkline */}
          <div className="ml-auto">
            <MiniSparkline data={trendData} />
          </div>
        </div>
      </div>
    </Card>
  );
});

CompactJobCard.displayName = 'CompactJobCard';
