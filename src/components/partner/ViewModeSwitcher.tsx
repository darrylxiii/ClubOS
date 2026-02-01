import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LayoutGrid, List, Columns, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list' | 'kanban' | 'table';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

const VIEW_MODES: { mode: ViewMode; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { mode: 'grid', icon: LayoutGrid, label: 'Grid View' },
  { mode: 'list', icon: List, label: 'List View' },
  { mode: 'kanban', icon: Columns, label: 'Kanban Board' },
  { mode: 'table', icon: Table, label: 'Table View' },
];

export const ViewModeSwitcher = memo(({
  currentMode,
  onModeChange,
  className,
}: ViewModeSwitcherProps) => {
  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center gap-1 p-1 rounded-lg bg-card/30 backdrop-blur-sm border border-border/20',
        className
      )}>
        {VIEW_MODES.map(({ mode, icon: Icon, label }) => (
          <Tooltip key={mode}>
            <TooltipTrigger asChild>
              <Button
                variant={currentMode === mode ? 'secondary' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 w-8 transition-all',
                  currentMode === mode && 'bg-primary/20 text-primary'
                )}
                onClick={() => onModeChange(mode)}
              >
                <Icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
});

ViewModeSwitcher.displayName = 'ViewModeSwitcher';

// Hook for persisting view mode
export function usePersistedViewMode(defaultMode: ViewMode = 'grid'): [ViewMode, (mode: ViewMode) => void] {
  const storageKey = 'jobs-view-mode';
  
  const getInitialMode = (): ViewMode => {
    if (typeof window === 'undefined') return defaultMode;
    const stored = localStorage.getItem(storageKey);
    if (stored && ['grid', 'list', 'kanban', 'table'].includes(stored)) {
      return stored as ViewMode;
    }
    return defaultMode;
  };

  const [mode, setModeState] = useState<ViewMode>(getInitialMode);

  const setMode = (newMode: ViewMode) => {
    setModeState(newMode);
    localStorage.setItem(storageKey, newMode);
  };

  return [mode, setMode];
}
