import { motion } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatusIndicatorProps {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChanges: number;
  isConnected: boolean;
  onManualSync?: () => void;
}

export function SyncStatusIndicator({
  isSyncing,
  lastSyncedAt,
  pendingChanges,
  isConnected,
  onManualSync
}: SyncStatusIndicatorProps) {
  const getStatusIcon = () => {
    if (!isConnected) {
      return <CloudOff className="w-4 h-4 text-destructive" />;
    }
    if (isSyncing) {
      return <RefreshCw className="w-4 h-4 text-primary animate-spin" />;
    }
    if (pendingChanges > 0) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    return <Check className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isConnected) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (pendingChanges > 0) return `${pendingChanges} pending`;
    if (lastSyncedAt) return `Saved ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}`;
    return 'All changes saved';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onManualSync}
            disabled={!isConnected || isSyncing}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{ 
                rotate: isSyncing ? 360 : 0 
              }}
              transition={{ 
                repeat: isSyncing ? Infinity : 0, 
                duration: 1, 
                ease: 'linear' 
              }}
            >
              {getStatusIcon()}
            </motion.div>
            <span className="hidden sm:inline">{getStatusText()}</span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-1">
            <p className="font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
            {lastSyncedAt && (
              <p className="text-muted-foreground">
                Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}
              </p>
            )}
            {pendingChanges > 0 && (
              <p className="text-yellow-500">
                {pendingChanges} changes waiting to sync
              </p>
            )}
            {onManualSync && isConnected && !isSyncing && (
              <p className="text-muted-foreground">Click to force sync</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
