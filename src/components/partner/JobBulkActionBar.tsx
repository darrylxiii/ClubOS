import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  X,
  Flag,
  XCircle,
  Archive,
  Download,
  Users,
  ChevronDown,
  CheckSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onPublishAll: () => void;
  onCloseAll: () => void;
  onArchiveAll: () => void;
  onExportSelected: () => void;
  onAssignStrategist?: () => void;
  isProcessing?: boolean;
  className?: string;
}

export const JobBulkActionBar = memo(({
  selectedCount,
  onClearSelection,
  onPublishAll,
  onCloseAll,
  onArchiveAll,
  onExportSelected,
  onAssignStrategist,
  isProcessing = false,
  className,
}: JobBulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-3 px-4 py-3',
          'bg-card/95 backdrop-blur-xl border border-border/40 rounded-xl shadow-2xl',
          className
        )}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-border/40">
          <CheckSquare className="w-4 h-4 text-primary" />
          <Badge variant="secondary" className="font-bold">
            {selectedCount} selected
          </Badge>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onPublishAll}
            disabled={isProcessing}
          >
            <Flag className="w-4 h-4 text-success" />
            <span className="hidden sm:inline">Publish</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onCloseAll}
            disabled={isProcessing}
          >
            <XCircle className="w-4 h-4 text-warning" />
            <span className="hidden sm:inline">Close</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onArchiveAll}
            disabled={isProcessing}
          >
            <Archive className="w-4 h-4" />
            <span className="hidden sm:inline">Archive</span>
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                More
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl">
              <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExportSelected} className="gap-2">
                <Download className="w-4 h-4" />
                Export Selected
              </DropdownMenuItem>
              {onAssignStrategist && (
                <DropdownMenuItem onClick={onAssignStrategist} className="gap-2">
                  <Users className="w-4 h-4" />
                  Assign Strategist
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-2"
          onClick={onClearSelection}
        >
          <X className="w-4 h-4" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
});

JobBulkActionBar.displayName = 'JobBulkActionBar';
