import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';

export function UpdateAvailableBanner() {
  const { isUpdateAvailable, isUpdating, updateNow, dismissUpdate } = usePWAUpdate();

  if (!isUpdateAvailable) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -100, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-gradient-to-br from-primary/15 to-primary/5 backdrop-blur-xl border border-primary/30 rounded-xl shadow-2xl shadow-primary/10 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/20 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">
                New Version Available
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Refresh to get the latest features and improvements
              </p>
            </div>
            <button
              onClick={dismissUpdate}
              className="p-1 hover:bg-muted rounded-md transition-colors shrink-0"
              aria-label="Dismiss"
              disabled={isUpdating}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={updateNow}
              size="sm"
              className="flex-1 gap-2"
              disabled={isUpdating}
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : 'Update Now'}
            </Button>
            <Button
              onClick={dismissUpdate}
              variant="ghost"
              size="sm"
              disabled={isUpdating}
            >
              Later
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
