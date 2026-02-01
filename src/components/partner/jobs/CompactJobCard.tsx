import { memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  Users,
  Clock,
  TrendingUp,
  Calendar,
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
  const width = 48;
  const height = 20;
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

// Metric item component for the grid
const MetricItem = memo(({ 
  icon: Icon, 
  value, 
  label, 
  valueClassName,
  children,
}: { 
  icon: React.ElementType; 
  value: string | number; 
  label: string; 
  valueClassName?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className="w-3.5 h-3.5" />
      <span className="text-xs">{label}</span>
    </div>
    <div className="flex items-center justify-between">
      <span className={cn("text-lg font-bold", valueClassName || "text-foreground")}>
        {value}
      </span>
      {children}
    </div>
  </div>
));

MetricItem.displayName = 'MetricItem';

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

  const getDaysColor = (days: number) => {
    if (days > 45) return 'text-destructive';
    if (days > 30) return 'text-amber-500';
    return undefined;
  };

  const getConversionColor = (rate: number | null) => {
    if (rate === null) return undefined;
    if (rate >= 15) return 'text-success';
    if (rate < 5) return 'text-muted-foreground';
    return undefined;
  };

  return (
    <Card
      className={cn(
        'relative group cursor-pointer transition-all duration-200',
        'border border-border/30 bg-card/40 backdrop-blur-sm',
        'hover:border-border/50 hover:bg-card/50 hover:shadow-lg',
        isSelected && 'ring-2 ring-primary border-primary/50',
        isFocused && 'ring-2 ring-primary/60 border-primary/40'
      )}
      onClick={onNavigate}
    >
      <CardHeader className="pb-3">
        {/* Row 1: Checkbox, Logo, Title, Status, Menu */}
        <div className="flex items-start gap-3">
          {/* Checkbox - visible on hover or when selected */}
          <div 
            className={cn(
              'shrink-0 mt-1 transition-opacity',
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
          <Avatar className="h-10 w-10 border border-border/30 shrink-0">
            <AvatarImage src={job.company_logo || undefined} alt={job.company_name} />
            <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
              {job.company_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Title + Company + Location */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-base text-foreground truncate">
                {job.title}
              </h3>
              {job.is_stealth && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Confidential</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{job.company_name}</p>
            {job.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{job.location}</span>
              </div>
            )}
          </div>

          {/* Status Badge + Club Sync */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <JobStatusBadge status={job.status as JobStatus} size="sm" />
            <ClubSyncBadge status={job.club_sync_status as any} size="sm" />
          </div>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mt-1">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-border/40">
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
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* AI Next Action (if available) */}
        {nextAction && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
            nextAction.urgent 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
              : 'bg-primary/10 text-primary'
          )}>
            {nextAction.urgent ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <Lightbulb className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{nextAction.text}</span>
          </div>
        )}

        {/* Metrics Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-4">
          {/* Candidates */}
          <MetricItem icon={Users} value={job.candidate_count} label="Candidates">
            <MiniSparkline data={trendData} />
          </MetricItem>

          {/* Days Open */}
          <MetricItem 
            icon={Clock} 
            value={`${job.days_since_opened}d`} 
            label="Days Open"
            valueClassName={getDaysColor(job.days_since_opened)}
          />

          {/* Active */}
          <MetricItem 
            icon={Calendar} 
            value={job.active_stage_count} 
            label="Active Pipeline"
          />

          {/* Conversion */}
          <MetricItem 
            icon={TrendingUp} 
            value={job.conversion_rate !== null ? `${job.conversion_rate}%` : '—'} 
            label="Conversion"
            valueClassName={getConversionColor(job.conversion_rate)}
          />
        </div>
      </CardContent>
    </Card>
  );
});

CompactJobCard.displayName = 'CompactJobCard';
