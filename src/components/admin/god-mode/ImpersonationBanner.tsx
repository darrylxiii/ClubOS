import { useState, useEffect } from 'react';
import { Eye, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/hooks/useImpersonation';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInMinutes } from 'date-fns';

export function ImpersonationBanner() {
  const { isImpersonating, activeSession, endImpersonation, getTargetUserInfo, isLoading } = useImpersonation();
  const [targetUser, setTargetUser] = useState<{ full_name: string; email: string } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (isImpersonating && activeSession) {
      getTargetUserInfo().then(setTargetUser);

      // Update time remaining every minute
      const updateTime = () => {
        const remaining = differenceInMinutes(new Date(activeSession.expires_at), new Date());
        setTimeRemaining(Math.max(0, remaining));
      };

      updateTime();
      const interval = setInterval(updateTime, 60000);

      return () => clearInterval(interval);
    }
  }, [isImpersonating, activeSession, getTargetUserInfo]);

  if (!isImpersonating || !activeSession) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 backdrop-blur-sm text-black px-4 py-2"
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/20 rounded-full px-3 py-1">
              <Eye className="h-4 w-4" />
              <span className="font-medium text-sm">Impersonation Mode</span>
            </div>
            
            <span className="text-sm">
              Viewing as: <strong>{targetUser?.full_name || <span className="inline-flex items-center gap-1"><span className="h-4 w-20 bg-black/20 rounded animate-pulse" /><span className="sr-only">Loading user info</span></span>}</strong>
              {targetUser?.email && <span className="opacity-75 ml-1">({targetUser.email})</span>}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm opacity-75">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeRemaining} min remaining</span>
            </div>

            <div className="text-xs opacity-75">
              Read-only mode active
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => endImpersonation()}
              disabled={isLoading}
              className="bg-black/20 hover:bg-black/30 text-black border-0"
            >
              <X className="h-4 w-4 mr-1" />
              End Session
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
