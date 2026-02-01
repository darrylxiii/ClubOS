import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar } from '@/components/ui/calendar';
import {
  Filter,
  Clock,
  Activity,
  TrendingUp,
  ChevronDown,
  LayoutGrid,
  List,
  Columns,
  Table,
  Keyboard,
  Calendar as CalendarIcon,
  X,
  Bookmark,
  Check,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ViewMode } from '../ViewModeSwitcher';
import { JobFilterState } from '@/types/jobFilters';

export type JobStatusFilter = 'all' | 'draft' | 'published' | 'closed' | 'archived' | 'favorites';
export type QuickFilterType = 'all' | 'expiring-soon' | 'recent-activity' | 'high-engagement';

interface JobsUnifiedFilterBarProps {
  // Status filter
  statusFilter: JobStatusFilter;
  onStatusChange: (status: JobStatusFilter) => void;
  statusCounts: Record<JobStatusFilter, number>;
  
  // Quick filters
  quickFilter: QuickFilterType;
  onQuickFilterChange: (filter: QuickFilterType) => void;
  quickFilterCounts: {
    expiringSoon: number;
    recentActivity: number;
    highEngagement: number;
  };
  
  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  
  // Advanced filters
  filters: JobFilterState;
  onFilterChange: (updates: Partial<JobFilterState>) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  availableCompanies: Array<{ id: string; name: string }>;
  
  // Saved presets
  savedPresets: Array<{ id: string; name: string; filters: JobFilterState }>;
  onApplyPreset: (filters: JobFilterState) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  
  // Keyboard shortcuts
  onShowKeyboardShortcuts: () => void;
  
  className?: string;
}

const STATUS_CONFIG: Record<JobStatusFilter, { label: string; shortLabel: string; icon?: React.ElementType }> = {
  all: { label: 'All Jobs', shortLabel: 'All' },
  published: { label: 'Active', shortLabel: 'Active' },
  draft: { label: 'Draft', shortLabel: 'Draft' },
  closed: { label: 'Closed', shortLabel: 'Closed' },
  archived: { label: 'Archived', shortLabel: 'Archived' },
  favorites: { label: 'Favorites', shortLabel: 'Favorites', icon: Heart },
};

const VIEW_MODES: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
  { mode: 'grid', icon: LayoutGrid, label: 'Grid' },
  { mode: 'list', icon: List, label: 'List' },
  { mode: 'kanban', icon: Columns, label: 'Kanban' },
  { mode: 'table', icon: Table, label: 'Table' },
];

export const JobsUnifiedFilterBar = memo(({
  statusFilter,
  onStatusChange,
  statusCounts,
  quickFilter,
  onQuickFilterChange,
  quickFilterCounts,
  viewMode,
  onViewModeChange,
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  availableCompanies,
  savedPresets,
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  onShowKeyboardShortcuts,
  className,
}: JobsUnifiedFilterBarProps) => {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const statuses: JobStatusFilter[] = ['all', 'published', 'draft', 'closed', 'archived', 'favorites'];
  const CurrentViewIcon = VIEW_MODES.find(v => v.mode === viewMode)?.icon || LayoutGrid;

  const activeFilterCount = 
    filters.status.length + 
    filters.companies.length + 
    (filters.dateRange.from || filters.dateRange.to ? 1 : 0);

  return (
    <div className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      className
    )}>
      {/* Left: Status tabs + Quick filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        {/* Status Pills */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-card/30 border border-border/20">
          {statuses.map((status) => {
            const config = STATUS_CONFIG[status];
            const count = statusCounts[status] || 0;
            const isActive = statusFilter === status;
            const Icon = config.icon;
            
            return (
              <Button
                key={status}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-7 px-2.5 text-xs gap-1.5 transition-all',
                  isActive && 'bg-primary/20 text-primary',
                  status === 'favorites' && isActive && 'bg-rose-500/20 text-rose-500'
                )}
                onClick={() => onStatusChange(status)}
              >
                {Icon && <Icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{config.label}</span>
                <span className="sm:hidden">{config.shortLabel}</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'h-4 px-1 text-[10px] font-medium',
                    isActive ? 'bg-primary/10 border-primary/30' : 'bg-card/40',
                    status === 'favorites' && isActive && 'bg-rose-500/10 border-rose-500/30',
                    count === 0 && 'opacity-50'
                  )}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Quick Filter Icons */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={quickFilter === 'expiring-soon' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 w-8 relative',
                  quickFilter === 'expiring-soon' && 'bg-amber-500/20 text-amber-500'
                )}
                onClick={() => onQuickFilterChange(quickFilter === 'expiring-soon' ? 'all' : 'expiring-soon')}
              >
                <Clock className="h-4 w-4" />
                {quickFilterCounts.expiringSoon > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] bg-amber-500 text-white rounded-full flex items-center justify-center">
                    {quickFilterCounts.expiringSoon}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expiring Soon (45+ days)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={quickFilter === 'recent-activity' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 w-8 relative',
                  quickFilter === 'recent-activity' && 'bg-emerald-500/20 text-emerald-500'
                )}
                onClick={() => onQuickFilterChange(quickFilter === 'recent-activity' ? 'all' : 'recent-activity')}
              >
                <Activity className="h-4 w-4" />
                {quickFilterCounts.recentActivity > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] bg-emerald-500 text-white rounded-full flex items-center justify-center">
                    {quickFilterCounts.recentActivity}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Recent Activity (7 days)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={quickFilter === 'high-engagement' ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 w-8 relative',
                  quickFilter === 'high-engagement' && 'bg-primary/20 text-primary'
                )}
                onClick={() => onQuickFilterChange(quickFilter === 'high-engagement' ? 'all' : 'high-engagement')}
              >
                <TrendingUp className="h-4 w-4" />
                {quickFilterCounts.highEngagement > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] bg-primary text-white rounded-full flex items-center justify-center">
                    {quickFilterCounts.highEngagement}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>High Engagement (15%+ conv)</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Right: Filters dropdown, Views dropdown, Keyboard */}
      <div className="flex items-center gap-2">
        {/* Advanced Filters Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-card/95 backdrop-blur-xl">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Advanced Filters</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onResetFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Company Filter */}
            {availableCompanies.length > 1 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">Company</DropdownMenuLabel>
                {availableCompanies.slice(0, 5).map((company) => (
                  <DropdownMenuCheckboxItem
                    key={company.id}
                    checked={filters.companies.includes(company.id)}
                    onCheckedChange={(checked) => {
                      const newCompanies = checked
                        ? [...filters.companies, company.id]
                        : filters.companies.filter(c => c !== company.id);
                      onFilterChange({ companies: newCompanies });
                    }}
                  >
                    {company.name}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            
            {/* Date Range */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">Created Date</DropdownMenuLabel>
            <div className="px-2 py-1.5">
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        `${format(filters.dateRange.from, 'MMM d')} - ${format(filters.dateRange.to, 'MMM d')}`
                      ) : (
                        format(filters.dateRange.from, 'MMM d, yyyy')
                      )
                    ) : (
                      'Select date range'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: filters.dateRange.from || undefined,
                      to: filters.dateRange.to || undefined,
                    }}
                    onSelect={(range) => {
                      onFilterChange({
                        dateRange: {
                          from: range?.from || null,
                          to: range?.to || null,
                        },
                      });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Views Dropdown (View mode + Saved presets) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <CurrentViewIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Views</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl">
            <DropdownMenuLabel>Layout</DropdownMenuLabel>
            {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
              <DropdownMenuItem
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
                {viewMode === mode && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            ))}
            
            {savedPresets.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
                {savedPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => onApplyPreset(preset.filters)}
                    className="gap-2"
                  >
                    <Bookmark className="h-4 w-4" />
                    {preset.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Keyboard Shortcuts */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onShowKeyboardShortcuts}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

JobsUnifiedFilterBar.displayName = 'JobsUnifiedFilterBar';
