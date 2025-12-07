import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTimeTracking, useIdleDetection } from "@/hooks/useTimeTracking";
import { useActivityMonitoring } from "@/hooks/useActivityMonitoring";
import { useRole } from "@/contexts/RoleContext";
import { MyTimeEntries } from "./MyTimeEntries";
import { TeamTimeOverview } from "./TeamTimeOverview";
import { QuickTimeStats } from "./QuickTimeStats";
import { TimerButton } from "./TimerButton";
import { ManualTimeEntryDialog } from "./ManualTimeEntryDialog";
import { IdleDetectionModal } from "./IdleDetectionModal";
import { RunningTimerHeader } from "./RunningTimerHeader";
import { TimerSettingsDialog } from "./TimerSettingsDialog";
import { ActivityMonitoringIndicator } from "./ActivityMonitoringIndicator";
import { Clock, Users, Plus, Settings, Keyboard, Activity } from "lucide-react";
import { toast } from "sonner";

export function TimeTrackingDashboard() {
  const { currentRole } = useRole();
  const { 
    runningEntry, 
    timerSettings, 
    discardIdleTime, 
    myStats,
    isLoading 
  } = useTimeTracking();
  
  const [activeTab, setActiveTab] = useState("my-time");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIdleModal, setShowIdleModal] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);

  const isManager = ['admin', 'strategist', 'partner'].includes(currentRole || '');

  // Activity monitoring - tracks mouse/keyboard activity in real-time
  const {
    isTracking: isActivityTracking,
    activityPercentage,
    privacySettings,
    hasConsent,
  } = useActivityMonitoring(runningEntry?.id || null, !!runningEntry);

  // Idle detection callback
  const handleIdle = useCallback((seconds: number) => {
    setIdleSeconds(seconds);
    setShowIdleModal(true);
  }, []);

  // Use idle detection hook
  const { isIdle, resetActivity } = useIdleDetection(
    !!runningEntry,
    timerSettings?.idle_threshold_minutes || 5,
    handleIdle
  );

  // Handle keeping idle time
  const handleKeepTime = () => {
    setShowIdleModal(false);
    resetActivity();
    toast.success('Idle time kept');
  };

  // Handle discarding idle time
  const handleDiscardTime = () => {
    if (runningEntry) {
      discardIdleTime.mutate({
        entryId: runningEntry.id,
        idleSeconds: idleSeconds,
      });
    }
    setShowIdleModal(false);
    resetActivity();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + T: Open manual entry
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        setShowManualEntry(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Running timer header - shows when timer is active */}
      {runningEntry && <RunningTimerHeader />}
      
      {/* Add padding when timer header is shown */}
      <div className={runningEntry ? "pt-16" : ""}>
        <div className="space-y-6">
          {/* Header with Timer Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Time Tracking</h2>
              <p className="text-sm text-muted-foreground">
                Track your work hours and manage time entries
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <TimerButton size="lg" />
              
              <Button
                variant="outline"
                onClick={() => setShowManualEntry(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Manual Entry
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(true)}
                title="Timer Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Keyboard className="h-3 w-3" />
            <span>
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl+T</kbd> for manual entry
            </span>
          </div>

          {/* Activity Monitoring Indicator - shows when timer is running */}
          {runningEntry && (
            <div className="flex items-center gap-4">
              <ActivityMonitoringIndicator
                activityPercentage={activityPercentage}
                isTracking={isActivityTracking}
              />
              {isActivityTracking && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Activity tracking active
                </span>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <QuickTimeStats stats={myStats} />

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="my-time" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                My Time
              </TabsTrigger>
              {isManager && (
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Overview
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my-time" className="mt-6">
              <MyTimeEntries />
            </TabsContent>

            {isManager && (
              <TabsContent value="team" className="mt-6">
                <TeamTimeOverview />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <ManualTimeEntryDialog 
        open={showManualEntry} 
        onOpenChange={setShowManualEntry} 
      />
      
      <TimerSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
      />
      
      <IdleDetectionModal
        open={showIdleModal}
        idleSeconds={idleSeconds}
        onKeepTime={handleKeepTime}
        onDiscardTime={handleDiscardTime}
      />
    </>
  );
}
