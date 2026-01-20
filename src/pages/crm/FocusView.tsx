import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  PartyPopper,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useCRMActivities } from '@/hooks/useCRMActivities';
import { useCRMKeyboardShortcuts } from '@/hooks/useCRMKeyboardShortcuts';
import { ActivityItem } from '@/components/crm/ActivityItem';
import { ActivityQuickAdd } from '@/components/crm/ActivityQuickAdd';
import { KeyboardShortcutsHelp } from '@/components/crm/KeyboardShortcutsHelp';

export default function FocusView() {
  const [addActivityOpen, setAddActivityOpen] = useState(false);

  // Fetch different activity categories
  const { activities: overdueActivities, loading: loadingOverdue, refetch: refetchOverdue } = useCRMActivities({ 
    overdue: true,
    limit: 10,
  });
  const { activities: dueTodayActivities, loading: loadingToday, refetch: refetchToday } = useCRMActivities({ 
    dueToday: true,
    limit: 20,
  });
  const { activities: upcomingActivities, loading: loadingUpcoming, refetch: refetchUpcoming } = useCRMActivities({ 
    upcoming: true,
    limit: 5,
  });

  const refetchAll = () => {
    refetchOverdue();
    refetchToday();
    refetchUpcoming();
  };

  const { shortcuts, showHelp, setShowHelp } = useCRMKeyboardShortcuts({
    onAddActivity: () => setAddActivityOpen(true),
    onRefresh: refetchAll,
    onHelp: () => setShowHelp(true),
  });

  const loading = loadingOverdue || loadingToday || loadingUpcoming;
  const totalDue = overdueActivities.length + dueTodayActivities.length;
  const completedToday = dueTodayActivities.filter(a => a.is_done).length;
  const progressPercent = totalDue > 0 ? (completedToday / totalDue) * 100 : 100;

  const allCaughtUp = overdueActivities.length === 0 && dueTodayActivities.length === 0;

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold">Focus View</h1>
                <p className="text-muted-foreground">Your activities for today</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={refetchAll}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <ActivityQuickAdd
                  onSuccess={refetchAll}
                  trigger={
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Activity
                    </Button>
                  }
                />
              </div>
            </div>

            {/* Progress Bar */}
            {!allCaughtUp && (
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Today's Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {completedToday} of {totalDue} completed
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </CardContent>
              </Card>
            )}
          </motion.div>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2].map(j => (
                      <Skeleton key={j} className="h-20 w-full rounded-xl" />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allCaughtUp ? (
            /* All Caught Up State */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center"
              >
                <PartyPopper className="w-12 h-12 text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">All Caught Up!</h2>
              <p className="text-muted-foreground mb-6">
                You have no pending activities for today. Great job!
              </p>
              <Button onClick={() => setAddActivityOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule New Activity
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Overdue Section */}
              {overdueActivities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-red-500/30 bg-red-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        Overdue ({overdueActivities.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {overdueActivities.map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <ActivityItem activity={activity} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Due Today Section */}
              {dueTodayActivities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Due Today ({dueTodayActivities.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {dueTodayActivities.map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <ActivityItem activity={activity} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Upcoming Section */}
              {upcomingActivities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="opacity-80">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-5 h-5" />
                        Coming Up ({upcomingActivities.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {upcomingActivities.slice(0, 3).map((activity, index) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <ActivityItem activity={activity} compact />
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}

          {/* Keyboard Shortcuts Help */}
          <KeyboardShortcutsHelp
            open={showHelp}
            onClose={() => setShowHelp(false)}
            shortcuts={shortcuts}
          />
        </div>
      </RoleGate>
    </AppLayout>
  );
}
