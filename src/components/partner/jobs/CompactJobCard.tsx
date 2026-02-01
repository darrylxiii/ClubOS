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
  Heart,
  Briefcase,
  Target,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobStatusBadge, JobStatus } from '@/components/jobs/JobStatusBadge';
import { ClubSyncBadge } from '@/components/jobs/ClubSyncBadge';
import { JobLocationDisplay, type JobLocationItem } from '@/components/jobs/JobLocationDisplay';

interface CompactJobCardProps {
  job: {
    id: string;
    title: string;
    status: string;
    location: string;
    location_country_code?: string | null;
    is_remote?: boolean;
    job_locations?: JobLocationItem[];
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
    hired_count?: number;
    target_hire_count?: number | null;
  };
  isSelected: boolean;
  isFocused: boolean;
  isFavorite?: boolean;
  onToggleSelect: () => void;
  onNavigate: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onClose: () => void;
  onReopen: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onToggleFavorite?: () => void;
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

// Metric item component for the 3x3 grid
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
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="text-xs truncate">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className={cn("text-base font-semibold", valueClassName || "text-foreground")}>
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
  isFavorite = false,
  onToggleSelect,
  onNavigate,
  onPublish,
  onUnpublish,
  onClose,
  onReopen,
  onArchive,
  onRestore,
  onToggleFavorite,
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
    if (rate >= 15) return 'text-emerald-500';
    if (rate < 5) return 'text-muted-foreground';
    return undefined;
  };

  // Calculate interview count (mock based on active_stage_count)
  const interviewCount = Math.max(0, job.active_stage_count);
  
  // Calculate last activity text
  const getLastActivityText = () => {
    if (!job.last_activity) return 'No activity';
    const days = Math.floor((Date.now() - new Date(job.last_activity).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
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
      <CardHeader className="pb-3 space-y-3">
        {/* Row 1: Checkbox + Logo + Title/Company/Location + Favorite + Menu */}
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
          <Avatar className="h-12 w-12 border border-border/30 shrink-0">
            <AvatarImage src={job.company_logo || undefined} alt={job.company_name} />
            <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
              {job.company_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Title + Company + Location - Full text, no truncation */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-base text-foreground">
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
            <p className="text-sm text-muted-foreground">{job.company_name}</p>
            <div className="mt-1">
              <JobLocationDisplay
                locations={job.job_locations}
                location={job.location}
                countryCode={job.location_country_code}
                isRemote={job.is_remote}
                size="sm"
                showCities={true}
              />
            </div>
          </div>

          {/* Favorite + Menu (far right) */}
          <div className="flex items-center gap-1 shrink-0">
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 transition-colors',
                  isFavorite && 'text-rose-500 hover:text-rose-600'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
              >
                <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-border/40">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {job.status === 'draft' && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPublish(); }}>
                      <Flag className="h-4 w-4 mr-2 text-emerald-500" />
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
                      <XCircle className="h-4 w-4 mr-2 text-amber-500" />
                      Close
                    </DropdownMenuItem>
                  </>
                )}
                
                {job.status === 'closed' && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReopen(); }}>
                      <RefreshCw className="h-4 w-4 mr-2 text-emerald-500" />
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
                    <RotateCcw className="h-4 w-4 mr-2 text-emerald-500" />
                    Restore
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2: Badges (horizontal 2x2 layout) */}
        <div className="flex items-center gap-2 flex-wrap">
          <JobStatusBadge status={job.status as JobStatus} size="sm" />
          <ClubSyncBadge status={job.club_sync_status as any} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* AI Next Action - Full Width Alert */}
        {nextAction && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm w-full',
            nextAction.urgent 
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
              : 'bg-primary/10 text-primary border border-primary/20'
          )}>
            {nextAction.urgent ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <Lightbulb className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{nextAction.text}</span>
          </div>
        )}

        {/* Metrics Grid - 3x3 */}
        <div className="grid grid-cols-3 gap-4">
          {/* Row 1 */}
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

          {/* Active Pipeline */}
          <MetricItem 
            icon={Briefcase} 
            value={job.active_stage_count} 
            label="Active"
          />

          {/* Row 2 */}
          {/* Interviews */}
          <MetricItem 
            icon={Calendar} 
            value={interviewCount} 
            label="Interviews"
          />

          {/* Conversion */}
          <MetricItem 
            icon={TrendingUp} 
            value={job.conversion_rate !== null ? `${job.conversion_rate}%` : '—'} 
            label="Conversion"
            valueClassName={getConversionColor(job.conversion_rate)}
          />

          {/* Hired */}
          <MetricItem 
            icon={Target} 
            value={job.hired_count || 0} 
            label="Hired"
            valueClassName={job.hired_count && job.hired_count > 0 ? 'text-emerald-500' : undefined}
          />

          {/* Row 3 */}
          {/* Target */}
          <MetricItem 
            icon={Target} 
            value={job.target_hire_count || '—'} 
            label="Target"
          />

          {/* Last Activity */}
          <MetricItem 
            icon={Activity} 
            value={getLastActivityText()} 
            label="Last Activity"
          />

          {/* Open Rate (Placeholder) */}
          <MetricItem 
            icon={TrendingUp} 
            value={job.candidate_count > 0 ? `${Math.min(100, Math.round((job.active_stage_count / job.candidate_count) * 100))}%` : '—'} 
            label="Pipeline %"
          />
        </div>
      </CardContent>
    </Card>
  );
});

CompactJobCard.displayName = 'CompactJobCard';
