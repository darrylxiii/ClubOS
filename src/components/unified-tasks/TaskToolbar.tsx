import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  LayoutDashboard, 
  List, 
  Calendar, 
  BarChart3,
  RefreshCw,
  CheckSquare,
  Keyboard
} from "lucide-react";
import { TaskSearchBar } from "./TaskSearchBar";
import { BulkTaskActions } from "./BulkTaskActions";
import { useUnifiedTasks } from "@/contexts/UnifiedTasksContext";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskToolbarProps {
  onRefresh: () => void;
}

export function TaskToolbar({ onRefresh }: TaskToolbarProps) {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    clearFilters,
    viewMode,
    setViewMode,
    selectedTaskIds,
    clearSelection,
    selectAllTasks,
    filteredTasks,
    loading,
  } = useUnifiedTasks();

  const viewModes = [
    { key: 'board' as const, icon: LayoutDashboard, label: 'Board' },
    { key: 'list' as const, icon: List, label: 'List' },
    { key: 'calendar' as const, icon: Calendar, label: 'Calendar' },
    { key: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
  ];

  return (
    <div className="space-y-3">
      {/* Main toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        {/* Search & Filters */}
        <div className="flex-1 w-full lg:max-w-xl">
          <TaskSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            onClear={clearFilters}
            resultCount={searchQuery || Object.keys(filters).length > 0 ? filteredTasks.length : undefined}
            loading={loading}
          />
        </div>

        {/* View mode & actions */}
        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="flex items-center bg-muted/50 rounded-lg p-1">
            {viewModes.map(({ key, icon: Icon, label }) => (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 px-3 gap-1.5 transition-all",
                        viewMode === key && "bg-background shadow-sm"
                      )}
                      onClick={() => setViewMode(key)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline text-xs">{label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{label} View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Quick actions */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={selectAllTasks}
                >
                  <CheckSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Select All</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-muted/50 text-xs text-muted-foreground">
                  <Keyboard className="h-3 w-3" />
                  <span>⌘K</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Quick Add Task</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedTaskIds.size > 0 && (
        <BulkTaskActions
          selectedIds={Array.from(selectedTaskIds)}
          onClearSelection={clearSelection}
          onRefresh={onRefresh}
        />
      )}

      {/* Active filters display */}
      {(filters.status?.length || filters.priority?.length || filters.dateRange) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {filters.status?.map(s => (
            <Badge key={s} variant="secondary" className="text-xs capitalize">
              {s.replace('_', ' ')}
            </Badge>
          ))}
          {filters.priority?.map(p => (
            <Badge key={p} variant="secondary" className="text-xs capitalize">
              {p}
            </Badge>
          ))}
          {filters.dateRange && (
            <Badge variant="secondary" className="text-xs">
              Date range set
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
