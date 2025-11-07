import { useState } from 'react';
import { useTaskBoard } from '@/contexts/TaskBoardContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Plus, Users, Building2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CreateBoardDialog } from './CreateBoardDialog';

export function BoardSwitcher() {
  const { boards, currentBoard, switchBoard, loading } = useTaskBoard();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const personalBoards = boards.filter(b => b.visibility === 'personal');
  const sharedBoards = boards.filter(b => b.visibility === 'shared');
  const companyBoards = boards.filter(b => b.visibility === 'company');

  if (loading || !currentBoard) {
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        <span>Loading boards...</span>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentBoard.icon}</span>
              <span className="font-medium truncate">{currentBoard.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[280px]" align="start">
          {personalBoards.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                Personal
              </DropdownMenuLabel>
              {personalBoards.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => switchBoard(board.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>{board.icon}</span>
                    <span className="truncate">{board.name}</span>
                  </div>
                  {board.id === currentBoard.id && (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {sharedBoards.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                Shared
              </DropdownMenuLabel>
              {sharedBoards.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => switchBoard(board.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>{board.icon}</span>
                    <span className="truncate">{board.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {board.member_count || 0}
                    </Badge>
                  </div>
                  {board.id === currentBoard.id && (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          {companyBoards.length > 0 && (
            <>
              <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Company
              </DropdownMenuLabel>
              {companyBoards.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => switchBoard(board.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>{board.icon}</span>
                    <span className="truncate">{board.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {board.member_count || 0}
                    </Badge>
                  </div>
                  {board.id === currentBoard.id && (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateBoardDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  );
}
