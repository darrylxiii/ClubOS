import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Settings,
  Wand2,
  ChevronDown,
  Users,
  Building2,
  User,
} from "lucide-react";
import { useTaskBoard } from "@/contexts/TaskBoardContext";
import { CreateBoardDialog } from "@/components/task-boards/CreateBoardDialog";
import { BoardSettingsDialog } from "@/components/task-boards/BoardSettingsDialog";
import { BoardMembersView } from "@/components/task-boards/BoardMembersView";
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
}

export function TasksCommandBar({
  onAutoSchedule,
  scheduling,
  aiSchedulingEnabled,
  onOpenSettings,
}: TasksCommandBarProps) {
  const { boards, currentBoard, switchBoard } = useTaskBoard();
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const canManageBoard =
    currentBoard?.my_role === "owner" || currentBoard?.my_role === "admin";

  const getVisibilityIcon = (vis: string) => {
    switch (vis) {
      case "personal":
        return User;
      case "company":
        return Building2;
      case "shared":
        return Users;
      default:
        return User;
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 h-12">
        {/* Board Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 h-9 px-3 text-sm font-semibold"
            >
              {currentBoard && (
                <span className="text-base leading-none">
                  {currentBoard.icon}
                </span>
              )}
              <span className="max-w-[160px] truncate">
                {currentBoard?.name || "Select Board"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {boards.map((board) => {
              const VisIcon = getVisibilityIcon(board.visibility);
              return (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => switchBoard(board.id)}
                  className={cn(
                    "gap-2",
                    currentBoard?.id === board.id && "bg-accent"
                  )}
                >
                  <span className="text-base">{board.icon}</span>
                  <span className="flex-1 truncate">{board.name}</span>
                  <VisIcon className="h-3 w-3 text-muted-foreground" />
                  {board.task_count !== undefined && board.task_count > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {board.task_count}
                    </Badge>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setShowCreateBoard(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Board
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Board meta badges */}
        {currentBoard && (
          <div className="hidden md:flex items-center gap-1.5">
            {currentBoard.task_count !== undefined && (
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground"
              >
                {currentBoard.task_count} tasks
              </Badge>
            )}
            {(currentBoard.visibility === "shared" ||
              currentBoard.visibility === "company") &&
              currentBoard.member_count !== undefined &&
              currentBoard.member_count > 0 && (
                <button
                  onClick={() => setShowMembers(true)}
                  className="inline-flex"
                >
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground gap-1 hover:text-foreground cursor-pointer"
                  >
                    <Users className="h-3 w-3" />
                    {currentBoard.member_count}
                  </Badge>
                </button>
              )}
          </div>
        )}

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          {aiSchedulingEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAutoSchedule}
              disabled={scheduling}
              className="h-8 gap-1.5 text-xs"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {scheduling ? "Scheduling…" : "Auto Schedule"}
              </span>
            </Button>
          )}

          {canManageBoard && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowBoardSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenSettings}
          >
            <Wand2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CreateBoardDialog
        open={showCreateBoard}
        onOpenChange={setShowCreateBoard}
      />

      {showBoardSettings && canManageBoard && (
        <BoardSettingsDialog
          open={showBoardSettings}
          onOpenChange={setShowBoardSettings}
        />
      )}

      {showMembers && currentBoard && (
        <Dialog open={showMembers} onOpenChange={setShowMembers}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Board Members</DialogTitle>
            </DialogHeader>
            <BoardMembersView
              boardId={currentBoard.id}
              canManage={canManageBoard}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
