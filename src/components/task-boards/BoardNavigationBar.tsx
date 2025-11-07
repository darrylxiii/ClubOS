import { useState } from 'react';
import { useTaskBoard } from '@/contexts/TaskBoardContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, User, Users, Building2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateBoardDialog } from './CreateBoardDialog';
import type { BoardVisibility } from '@/types/taskBoard';

export function BoardNavigationBar() {
  const { boards, currentBoard, switchBoard, loading } = useTaskBoard();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<BoardVisibility | 'all'>('all');

  // Group boards by visibility type
  const personalBoards = boards.filter(b => b.visibility === 'personal');
  const companyBoards = boards.filter(b => b.visibility === 'company');
  const sharedBoards = boards.filter(b => b.visibility === 'shared');

  // Filter boards based on selected type
  const getFilteredBoards = () => {
    if (selectedType === 'all') return boards;
    return boards.filter(b => b.visibility === selectedType);
  };

  const filteredBoards = getFilteredBoards();

  // Get board type config
  const getBoardTypeConfig = (type: BoardVisibility) => {
    switch (type) {
      case 'personal':
        return {
          icon: User,
          label: 'Personal',
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          count: personalBoards.length,
        };
      case 'company':
        return {
          icon: Building2,
          label: 'Company',
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          borderColor: 'border-accent/30',
          count: companyBoards.length,
        };
      case 'shared':
        return {
          icon: Users,
          label: 'Shared',
          color: 'text-purple-500',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/30',
          count: sharedBoards.length,
        };
    }
  };

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-20 bg-muted/20 rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <div className="glass-card space-y-4">
        {/* Segmented Control for Board Types */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('all')}
            className="gap-2"
          >
            All Boards
            <Badge variant="secondary" className="ml-1">
              {boards.length}
            </Badge>
          </Button>

          {(['personal', 'company', 'shared'] as BoardVisibility[]).map((type) => {
            const config = getBoardTypeConfig(type);
            const Icon = config.icon;
            return (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                className={cn(
                  'gap-2',
                  selectedType === type && config.color
                )}
              >
                <Icon className="h-4 w-4" />
                {config.label}
                <Badge variant="secondary" className="ml-1">
                  {config.count}
                </Badge>
              </Button>
            );
          })}

          <div className="flex-1" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Board</span>
          </Button>
        </div>

        {/* Board List */}
        {filteredBoards.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filteredBoards.map((board) => {
              const isActive = currentBoard?.id === board.id;
              const typeConfig = getBoardTypeConfig(board.visibility);
              const Icon = typeConfig.icon;

              return (
                <button
                  key={board.id}
                  onClick={() => switchBoard(board.id)}
                  className={cn(
                    'group relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                    'border backdrop-blur-sm',
                    isActive
                      ? cn(
                          'bg-card border-border shadow-md',
                          typeConfig.borderColor
                        )
                      : 'bg-card/40 border-border/30 hover:bg-card/60 hover:border-border/50'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className={cn(
                      'absolute left-0 top-0 bottom-0 w-1 rounded-r-full',
                      typeConfig.bgColor
                    )} />
                  )}

                  {/* Board icon */}
                  <span className="text-lg">{board.icon}</span>

                  {/* Board name */}
                  <span className={cn(
                    'font-medium truncate max-w-[150px]',
                    isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )}>
                    {board.name}
                  </span>

                  {/* Task count badge */}
                  {board.task_count !== undefined && board.task_count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {board.task_count}
                    </Badge>
                  )}

                  {/* Member count for shared/company boards */}
                  {(board.visibility === 'shared' || board.visibility === 'company') && 
                   board.member_count !== undefined && board.member_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      <span>{board.member_count}</span>
                    </div>
                  )}

                  {/* Active badge */}
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-primary ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">
              No {selectedType !== 'all' ? getBoardTypeConfig(selectedType as BoardVisibility).label.toLowerCase() : ''} boards yet
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="mt-2"
            >
              Create your first board
            </Button>
          </div>
        )}
      </div>

      <CreateBoardDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
