import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Settings,
  Wand2,
  ChevronDown,
  Users,
  Building2,
  User,
  Search,
  LayoutDashboard,
  List,
  Calendar,
  BarChart3,
  GanttChart,
  UserCircle,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";
import { useTaskBoard } from "@/contexts/TaskBoardContext";
import { useUnifiedTasks } from "@/contexts/UnifiedTasksContext";
import { useAuth } from "@/contexts/AuthContext";
import { CreateBoardDialog } from "@/components/task-boards/CreateBoardDialog";
import { BoardSettingsDialog } from "@/components/task-boards/BoardSettingsDialog";
import { BoardMembersView } from "@/components/task-boards/BoardMembersView";
import { BulkTaskActions } from "./BulkTaskActions";
import { SavedFilterPresets } from "./SavedFilterPresets";
import { TaskCSVExport } from "./TaskCSVExport";
import { TaskTemplates } from "./TaskTemplates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface TasksCommandBarProps {
  onAutoSchedule: () => void;
  scheduling: boolean;
  aiSchedulingEnabled: boolean;
  onOpenSettings: () => void;
  onRefresh: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

const VIEW_MODES = [
  { key: "board", icon: LayoutDashboard, label: "Board" },
  { key: "list", icon: List, label: "List" },
  { key: "calendar", icon: Calendar, label: "Calendar" },
  { key: "timeline", icon: GanttChart, label: "Timeline" },
  { key: "analytics", icon: BarChart3, label: "Analytics" },
] as const;

export function TasksCommandBar({
  onAutoSchedule,
  scheduling,
  aiSchedulingEnabled,
  onOpenSettings,
  onRefresh,
  activeView,
  onViewChange,
}: TasksCommandBarProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { boards, currentBoard, switchBoard } = useTaskBoard();
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    clearFilters,
    selectedTaskIds,
    clearSelection,
    loading,
  } = useUnifiedTasks();

  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const canManageBoard =
    currentBoard?.my_role === "owner" || currentBoard?.my_role === "admin";

  const isMyTasksActive = filters.assignee?.includes(user?.id || "");
  const hasActiveFilters = !!(filters.status?.length || filters.priority?.length || filters.dateRange);

  const toggleMyTasks = () => {
    if (!user) return;
    if (isMyTasksActive) {
      setFilters({ ...filters, assignee: undefined });
    } else {
      setFilters({ ...filters, assignee: [user.id] });
    }
  };

  const getVisibilityIcon = (vis: string) => {
    switch (vis) {
      case "personal": return User;
      case "company": return Building2;
      case "shared": return Users;
      default: return User;
    }
  };

  // Bulk actions mode
  if (selectedTaskIds.size > 0) {
    return (
      <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-primary/5 border border-primary/20">
        <BulkTaskActions
          selectedIds={Array.from(selectedTaskIds)}
          onClearSelection={clearSelection}
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 h-11">
        {/* Board Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1.5 h-8 px-2.5 text-sm font-semibold shrink-0">
              {currentBoard && <span className="text-sm leading-none">{currentBoard.icon}</span>}
              <span className="max-w-[120px] truncate">{currentBoard?.name || "Board"}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {boards.map((board) => {
              const VisIcon = getVisibilityIcon(board.visibility);
              return (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => switchBoard(board.id)}
                  className={cn("gap-2", currentBoard?.id === board.id && "bg-accent")}
                >
                  <span className="text-sm">{board.icon}</span>
                  <span className="flex-1 truncate">{board.name}</span>
                  <VisIcon className="h-3 w-3 text-muted-foreground" />
                  {board.task_count !== undefined && board.task_count > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{board.task_count}</Badge>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCreateBoard(true)} className="gap-2">
              <Plus className="h-3.5 w-3.5" /> New Board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Task count */}
        {currentBoard?.task_count !== undefined && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground hidden md:inline-flex shrink-0">
            {currentBoard.task_count} tasks
          </Badge>
        )}

        {/* Search */}
        <div className={cn(
          "relative transition-all duration-200 shrink min-w-0",
          searchFocused ? "flex-[2]" : "flex-1 max-w-[280px]"
        )}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t("search_tasks", "Search tasks…")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="h-8 pl-8 pr-8 text-xs bg-muted/30 border-border/30 focus:bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="hidden md:flex items-center bg-muted/40 rounded-md p-0.5 shrink-0">
          {VIEW_MODES.map(({ key, icon: Icon, label }) => (
            <TooltipProvider key={key} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "h-7 w-7 flex items-center justify-center rounded-sm transition-all",
                      activeView === key
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => onViewChange(key)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* My Tasks */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMyTasksActive ? "default" : "ghost"}
                size="sm"
                className={cn("h-8 w-8 p-0 shrink-0", isMyTasksActive && "h-8 w-8")}
                onClick={toggleMyTasks}
              >
                <UserCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{t("my_tasks", "My Tasks")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Filter */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={hasActiveFilters ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0 shrink-0 relative"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{t("filters", "Filters")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Presets / Export / Templates collapsed into overflow */}
        <div className="hidden lg:flex items-center gap-0.5 shrink-0">
          <SavedFilterPresets
            currentFilters={filters}
            currentSearchQuery={searchQuery}
            onApplyPreset={(f, q) => { setFilters(f); setSearchQuery(q); }}
          />
          <TaskCSVExport />
          <TaskTemplates onApply={() => {}} />
        </div>

        {/* Refresh */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{t("refresh", "Refresh")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* AI Schedule */}
        {aiSchedulingEnabled && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onAutoSchedule} disabled={scheduling}>
                  <Wand2 className={cn("h-3.5 w-3.5", scheduling && "animate-pulse")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{scheduling ? "Scheduling…" : "Auto Schedule"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Settings */}
        {canManageBoard && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setShowBoardSettings(true)}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Active filters strip */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap -mt-1">
          {filters.status?.map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px] h-5 capitalize gap-1">
              {s.replace("_", " ")}
              <button onClick={() => setFilters({ ...filters, status: filters.status?.filter((x) => x !== s) })} className="ml-0.5 hover:text-foreground">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          {filters.priority?.map((p) => (
            <Badge key={p} variant="secondary" className="text-[10px] h-5 capitalize gap-1">
              {p}
              <button onClick={() => setFilters({ ...filters, priority: filters.priority?.filter((x) => x !== p) })} className="ml-0.5 hover:text-foreground">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
          {filters.dateRange && (
            <Badge variant="secondary" className="text-[10px] h-5 gap-1">
              Date range
              <button onClick={() => setFilters({ ...filters, dateRange: undefined })} className="ml-0.5 hover:text-foreground">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          <button onClick={clearFilters} className="text-[10px] text-muted-foreground hover:text-foreground ml-1">
            Clear all
          </button>
        </div>
      )}

      <CreateBoardDialog open={showCreateBoard} onOpenChange={setShowCreateBoard} />
      {showBoardSettings && canManageBoard && (
        <BoardSettingsDialog open={showBoardSettings} onOpenChange={setShowBoardSettings} />
      )}
      {showMembers && currentBoard && (
        <Dialog open={showMembers} onOpenChange={setShowMembers}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader><DialogTitle>{t("board_members", "Board Members")}</DialogTitle></DialogHeader>
            <BoardMembersView boardId={currentBoard.id} canManage={canManageBoard} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
