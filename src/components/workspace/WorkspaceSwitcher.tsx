import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Lock, Building2, Users, Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useWorkspaces, Workspace } from '@/hooks/useWorkspaces';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';

interface WorkspaceSwitcherProps {
  currentWorkspaceId?: string | null;
  onWorkspaceChange: (workspace: Workspace) => void;
  className?: string;
}

export function WorkspaceSwitcher({
  currentWorkspaceId,
  onWorkspaceChange,
  className,
}: WorkspaceSwitcherProps) {
  const navigate = useNavigate();
  const { workspaces, personalWorkspace, companyWorkspaces, teamWorkspaces, isLoading } = useWorkspaces();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId) || personalWorkspace;

  const getWorkspaceIcon = (workspace: Workspace) => {
    if (workspace.type === 'personal') return <Lock className="h-3 w-3" />;
    if (workspace.type === 'company') return <Building2 className="h-3 w-3" />;
    return <Users className="h-3 w-3" />;
  };

  const getWorkspaceTypeLabel = (type: Workspace['type']) => {
    switch (type) {
      case 'personal': return 'Private';
      case 'company': return 'Company';
      case 'team': return 'Team';
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" className={cn("justify-start gap-2", className)} disabled>
        <div className="h-6 w-6 rounded bg-muted animate-pulse" />
        <span className="text-muted-foreground">Loading...</span>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-2 px-2 h-10",
              className
            )}
          >
            <Avatar className="h-6 w-6 text-xs">
              <AvatarFallback className="bg-primary/10 text-primary">
                {currentWorkspace?.icon_emoji || '📁'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start text-left min-w-0 flex-1">
              <span className="text-sm font-medium truncate w-full">
                {currentWorkspace?.name || 'Select Workspace'}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentWorkspace ? getWorkspaceTypeLabel(currentWorkspace.type) : ''}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-[240px]">
          {/* Personal Workspace */}
          {personalWorkspace && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Private
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onWorkspaceChange(personalWorkspace)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base">{personalWorkspace.icon_emoji || '🔒'}</span>
                  <span className="truncate">{personalWorkspace.name}</span>
                </div>
                {currentWorkspaceId === personalWorkspace.id && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            </>
          )}

          {/* Company Workspaces */}
          {companyWorkspaces.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Company
              </DropdownMenuLabel>
              {companyWorkspaces.map(workspace => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => onWorkspaceChange(workspace)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base">{workspace.icon_emoji || '🏢'}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{workspace.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {currentWorkspaceId === workspace.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Team Workspaces */}
          {teamWorkspaces.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Teams
              </DropdownMenuLabel>
              {teamWorkspaces.map(workspace => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => onWorkspaceChange(workspace)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base">{workspace.icon_emoji || '👥'}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{workspace.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {currentWorkspaceId === workspace.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Workspace
          </DropdownMenuItem>

          {currentWorkspace && currentWorkspace.type !== 'personal' && (
            <DropdownMenuItem
              onClick={() => navigate(`/pages/settings/${currentWorkspace.id}`)}
              className="cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Workspace Settings
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(workspace) => {
          onWorkspaceChange(workspace);
          setCreateDialogOpen(false);
        }}
      />
    </>
  );
}
