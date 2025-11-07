import { useState } from 'react';
import { useTaskBoard } from '@/contexts/TaskBoardContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Settings, Activity, User, Building2, Users as UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardMembersView } from './BoardMembersView';
import { BoardSettingsDialog } from './BoardSettingsDialog';
import { formatDistanceToNow } from 'date-fns';

export function BoardContextHeader() {
  const { currentBoard } = useTaskBoard();
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!currentBoard) {
    return null;
  }

  // Get board type config
  const getBoardTypeConfig = () => {
    switch (currentBoard.visibility) {
      case 'personal':
        return {
          icon: User,
          label: 'Personal Board',
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
        };
      case 'company':
        return {
          icon: Building2,
          label: 'Company Board',
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          borderColor: 'border-accent/30',
        };
      case 'shared':
        return {
          icon: UsersIcon,
          label: 'Shared Board',
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/30',
        };
    }
  };

  const typeConfig = getBoardTypeConfig();
  const TypeIcon = typeConfig.icon;
  const canManageBoard = currentBoard.my_role === 'owner' || currentBoard.my_role === 'admin';

  return (
    <>
      <div className={cn(
        'glass-card border-l-4',
        typeConfig.borderColor
      )}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Board Info */}
          <div className="flex items-start gap-4 flex-1">
            {/* Board Icon */}
            <div className={cn(
              'flex items-center justify-center w-14 h-14 rounded-xl text-3xl',
              typeConfig.bgColor,
              'border',
              typeConfig.borderColor
            )}>
              {currentBoard.icon}
            </div>

            {/* Board Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-foreground truncate">
                  {currentBoard.name}
                </h2>
                <Badge 
                  variant="outline" 
                  className={cn('gap-1', typeConfig.color)}
                >
                  <TypeIcon className="h-3 w-3" />
                  {typeConfig.label}
                </Badge>
                {currentBoard.my_role && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {currentBoard.my_role}
                  </Badge>
                )}
              </div>

              {currentBoard.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {currentBoard.description}
                </p>
              )}

              {/* Board Stats */}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                {(currentBoard.visibility === 'shared' || currentBoard.visibility === 'company') && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{currentBoard.member_count || 0} member{currentBoard.member_count !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {currentBoard.task_count !== undefined && (
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    <span>{currentBoard.task_count} task{currentBoard.task_count !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span>Updated {formatDistanceToNow(new Date(currentBoard.updated_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {(currentBoard.visibility === 'shared' || currentBoard.visibility === 'company') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMembers(true)}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Members</span>
                {currentBoard.member_count && currentBoard.member_count > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {currentBoard.member_count}
                  </Badge>
                )}
              </Button>
            )}

            {canManageBoard && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {showMembers && (
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

      {showSettings && canManageBoard && (
        <BoardSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      )}
    </>
  );
}
