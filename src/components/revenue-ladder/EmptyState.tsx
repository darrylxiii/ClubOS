import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, RefreshCw, Settings, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  onSyncRevenue: () => void;
  isSyncing: boolean;
}

export function EmptyState({ onSyncRevenue, isSyncing }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-[60vh]"
    >
      <Card variant="elevated" className="max-w-lg p-8 text-center space-y-6">
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
          className="mx-auto relative"
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
            <TrendingUp className="h-12 w-12 text-primary" />
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute -top-1 -right-1 p-2 rounded-full bg-premium/20"
          >
            <Sparkles className="h-5 w-5 text-premium" />
          </motion.div>
        </motion.div>

        {/* Content */}
        <div className="space-y-2">
          <h2 className="text-heading-lg font-bold">Welcome to Revenue Ladder</h2>
          <p className="text-body-md text-muted-foreground">
            Track milestones, propose rewards, and celebrate your team's wins together.
            Sync your revenue data to get started.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="p-3 rounded-lg bg-muted/50 space-y-1"
          >
            <p className="text-label-sm font-medium flex items-center gap-1">
              <span className="text-success">✓</span> Dual Tracks
            </p>
            <p className="text-label-sm text-muted-foreground">
              Annual & Lifetime milestones
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="p-3 rounded-lg bg-muted/50 space-y-1"
          >
            <p className="text-label-sm font-medium flex items-center gap-1">
              <span className="text-success">✓</span> Team Voting
            </p>
            <p className="text-label-sm text-muted-foreground">
              Democratic reward proposals
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="p-3 rounded-lg bg-muted/50 space-y-1"
          >
            <p className="text-label-sm font-medium flex items-center gap-1">
              <span className="text-success">✓</span> CFO Safety
            </p>
            <p className="text-label-sm text-muted-foreground">
              Automatic financial checks
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="p-3 rounded-lg bg-muted/50 space-y-1"
          >
            <p className="text-label-sm font-medium flex items-center gap-1">
              <span className="text-success">✓</span> Celebrations
            </p>
            <p className="text-label-sm text-muted-foreground">
              Unlock celebrations & confetti
            </p>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            size="lg"
            onClick={onSyncRevenue}
            disabled={isSyncing}
            className="gap-2"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Revenue Data
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Help Text */}
        <p className="text-label-sm text-muted-foreground">
          Revenue data is calculated from your closed deals and bookings.
        </p>
      </Card>
    </motion.div>
  );
}
