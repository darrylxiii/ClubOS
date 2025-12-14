import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export function MaintenanceModeBanner() {
  const { config, isMaintenanceMode } = useMaintenanceMode();

  if (!isMaintenanceMode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[99] bg-orange-600/95 backdrop-blur-sm text-white px-4 py-3"
      >
        <div className="container mx-auto flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Maintenance Mode Active</span>
          </div>

          {config.message && (
            <span className="text-sm opacity-90">{config.message}</span>
          )}

          {config.eta && (
            <div className="flex items-center gap-1 text-sm bg-white/20 rounded-full px-3 py-1">
              <Clock className="h-3.5 w-3.5" />
              <span>ETA: {format(new Date(config.eta), 'MMM d, h:mm a')}</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
