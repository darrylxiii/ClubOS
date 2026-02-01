import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Plus,
  MoreVertical,
  Search,
  LayoutDashboard,
  Settings,
  Shield,
  Building2,
  Brain,
  BarChart3,
  Zap,
  RefreshCw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobsCompactHeaderProps {
  isAdmin: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateJob: () => void;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export const JobsCompactHeader = memo(({
  isAdmin,
  searchQuery,
  onSearchChange,
  onCreateJob,
  onNavigate,
  onRefresh,
  searchInputRef,
}: JobsCompactHeaderProps) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      {/* Left: Title */}
      <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search - Expandable on mobile */}
        <div className={cn(
          'relative transition-all duration-200',
          searchOpen ? 'w-64' : 'w-8'
        )}>
          {searchOpen ? (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search jobs..."
                className="pl-9 pr-8 h-9 bg-card/50 border-border/30"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-8"
                onClick={() => {
                  setSearchOpen(false);
                  onSearchChange('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search (/ key)</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* New Job Button */}
        <Button
          onClick={onCreateJob}
          size="sm"
          className="gap-1.5 h-9"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Job</span>
        </Button>

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border/30">
            <DropdownMenuLabel>Navigation</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => onNavigate('/company-applications')} className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Applications Hub
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onNavigate('/company-jobs')} className="gap-2">
              <Settings className="h-4 w-4" />
              Company Settings
            </DropdownMenuItem>

            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Admin Tools</DropdownMenuLabel>
                
                <DropdownMenuItem onClick={() => onNavigate('/admin/companies')} className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Management
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => onNavigate('/admin/ai-config')} className="gap-2">
                  <Brain className="h-4 w-4" />
                  AI Configuration
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => onNavigate('/admin/club-sync-requests')} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Club Sync Requests
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => onNavigate('/admin/analytics')} className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Global Analytics
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={onRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

JobsCompactHeader.displayName = 'JobsCompactHeader';
