import { memo, useState, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  LayoutDashboard,
  Lock,
  Zap,
  Target,
  Eye,
  EyeOff,
  Archive,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDaysOpenColor, getConversionColor } from '@/lib/jobUtils';
import { JobStatusBadge, JobStatus } from '@/components/jobs/JobStatusBadge';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { useVirtualizedTable } from '@/hooks/useVirtualizedList';
import { format } from 'date-fns';

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

interface JobTableViewProps {
  jobs: JobWithMetrics[];
  selectedIds: Set<string>;
  focusedIndex: number;
  onToggleSelect: (jobId: string) => void;
  onToggleAll: () => void;
  isAllSelected: boolean;
  onNavigate: (jobId: string) => void;
  onPublish: (jobId: string, title: string) => void;
  onUnpublish: (jobId: string, title: string) => void;
  onClose: (jobId: string, title: string) => void;
  onReopen: (jobId: string, title: string) => void;
  onArchive: (jobId: string, title: string) => void;
  onRestore: (jobId: string, title: string) => void;
  isSelected: (jobId: string) => boolean;
}

type SortKey = 'title' | 'company_name' | 'status' | 'candidate_count' | 'days_since_opened' | 'conversion_rate' | 'created_at';
type SortDirection = 'asc' | 'desc';

const SortableHeader = memo(({
  label,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSortKey: SortKey | null;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) => {
  const isActive = currentSortKey === sortKey;
  
  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground gap-1"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </Button>
    </TableHead>
  );
});

SortableHeader.displayName = 'SortableHeader';

const JobTableRow = memo(({
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
    <TableRow 
      className={cn(
        'cursor-pointer transition-colors',
        isSelected && 'bg-primary/5',
        isFocused && 'ring-1 ring-primary'
      )}
    >
      {/* Checkbox */}
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>

      {/* Job Title + Company */}
      <TableCell className="max-w-[300px]" onClick={onNavigate}>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-border/20 shrink-0">
            <AvatarImage src={job.company_logo || undefined} alt={job.company_name} />
            <AvatarFallback className="text-xs bg-card/40">
              {job.company_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium truncate">{job.title}</span>
              {job.is_stealth && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Lock className="h-3 w-3 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>Confidential</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate block">
              {job.company_name}
            </span>
          </div>
        </div>
      </TableCell>

      {/* Location */}
      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
        {job.location}
      </TableCell>

      {/* Status */}
      <TableCell>
        <div className="flex items-center gap-1">
          <JobStatusBadge status={job.status as JobStatus} size="sm" />
          {job.club_sync_status === 'accepted' && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 bg-primary/10 text-primary border-primary/30">
              <Zap className="h-2.5 w-2.5" />
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Candidates */}
      <TableCell className="text-center">
        <div className="flex flex-col items-center">
          <span className="font-semibold">{job.candidate_count}</span>
          <span className="text-[10px] text-muted-foreground">{job.active_stage_count} active</span>
        </div>
      </TableCell>

      {/* Days Open */}
      <TableCell className="text-center">
        <span className={cn('font-medium', getDaysOpenColor(job.days_since_opened))}>
          {job.days_since_opened}d
        </span>
      </TableCell>

      {/* Conversion */}
      <TableCell className="text-center">
        {job.conversion_rate !== null ? (
          <span className={cn('font-medium', getConversionColor(job.conversion_rate))}>
            {job.conversion_rate}%
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Progress (for continuous) */}
      <TableCell className="text-center">
        {job.is_continuous && job.target_hire_count ? (
          <div className="flex items-center justify-center gap-1">
            <Target className="h-3 w-3 text-blue-500" />
            <span className="text-sm">
              {job.hired_count}/{job.target_hire_count}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Created */}
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {format(new Date(job.created_at), 'MMM d, yyyy')}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-12">
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
      </TableCell>
    </TableRow>
  );
});

JobTableRow.displayName = 'JobTableRow';

export const JobTableView = memo(({
  jobs,
  selectedIds,
  focusedIndex,
  onToggleSelect,
  onToggleAll,
  isAllSelected,
  onNavigate,
  onPublish,
  onUnpublish,
  onClose,
  onReopen,
  onArchive,
  onRestore,
  isSelected,
}: JobTableViewProps) => {
  const [sortKey, setSortKey] = useState<SortKey | null>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }, [sortKey]);

  const sortedJobs = useMemo(() => {
    if (!sortKey) return jobs;

    return [...jobs].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      // Handle nulls
      if (aVal === null) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Number/date comparison
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [jobs, sortKey, sortDirection]);

  // Virtualization for large datasets
  const { parentRef, virtualItems, totalSize, getItem } = useVirtualizedTable({
    items: sortedJobs,
    estimateSize: 56,
    overscan: 10,
  });

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No jobs found
      </div>
    );
  }

  return (
    <div className="border border-border/20 rounded-lg overflow-hidden bg-card/10 backdrop-blur-sm">
      <Table>
        <TableHeader className="bg-card/30">
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onToggleAll}
              />
            </TableHead>
            <SortableHeader
              label="Job"
              sortKey="title"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <TableHead>Location</TableHead>
            <SortableHeader
              label="Status"
              sortKey="status"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Candidates"
              sortKey="candidate_count"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="text-center"
            />
            <SortableHeader
              label="Days"
              sortKey="days_since_opened"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="text-center"
            />
            <SortableHeader
              label="Conv."
              sortKey="conversion_rate"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="text-center"
            />
            <TableHead className="text-center">Progress</TableHead>
            <SortableHeader
              label="Created"
              sortKey="created_at"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedJobs.map((job, index) => (
            <JobTableRow
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
        </TableBody>
      </Table>
    </div>
  );
});

JobTableView.displayName = 'JobTableView';
