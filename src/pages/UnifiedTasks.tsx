import { useState, useEffect, useMemo } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { UnifiedTasksProvider } from "@/contexts/UnifiedTasksContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";
import { UnifiedTaskBoard } from "@/components/unified-tasks/UnifiedTaskBoard";
import { UnifiedTasksList } from "@/components/unified-tasks/UnifiedTasksList";
import { UnifiedTaskCalendar } from "@/components/unified-tasks/UnifiedTaskCalendar";
import { CreateUnifiedTaskDialog } from "@/components/unified-tasks/CreateUnifiedTaskDialog";
import { AISchedulingSettings } from "@/components/unified-tasks/AISchedulingSettings";
import { UnifiedTasksByMember } from "@/components/unified-tasks/UnifiedTasksByMember";
import { AIPageCopilot } from "@/components/ai/AIPageCopilot";
import { TaskSchedulingPreferences } from "@/components/TaskSchedulingPreferences";
import { TaskAnalyticsDashboard } from "@/components/unified-tasks/TaskAnalyticsDashboard";
import { TaskTimelineView } from "@/components/unified-tasks/TaskTimelineView";
import { DueDateReminder } from "@/components/unified-tasks/DueDateReminder";
import { QuickAddTask } from "@/components/unified-tasks/QuickAddTask";
import { TasksCommandBar } from "@/components/unified-tasks/TasksCommandBar";
import { CollapsedObjectivesSummary } from "@/components/unified-tasks/CollapsedObjectivesSummary";
import { TaskStatsBar } from "@/components/unified-tasks/TaskStatsBar";
import { KeyboardShortcutsModal } from "@/components/unified-tasks/KeyboardShortcutsModal";
import { isPast, isToday } from "date-fns";

interface SystemPreferences {
  active_system: string;
  show_migration_banner: boolean;
  ai_scheduling_enabled: boolean;
}

const UnifiedTasks = () => {
  const { user } = useAuth();
  const { currentRole: role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [preferences, setPreferences] = useState<SystemPreferences | null>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState(() => searchParams.get("tab") || "board");
  const [statsFilter, setStatsFilter] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  // Keyboard shortcut for ?
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.key === "?") { e.preventDefault(); setShortcutsOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      setFetchError(null);
      try {
        await Promise.all([loadPreferences(), loadObjectives(), loadAllTasks()]);
      } catch {
        setFetchError("Failed to load tasks. Please try again.");
      }
      setLoading(false);
    };
    init();
  }, [user, refreshKey]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "create") { setCreateDialogOpen(true); setSearchParams({}); }
  }, [searchParams, setSearchParams]);

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (view === "board") next.delete("tab"); else next.set("tab", view);
      return next;
    });
  };

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("task_system_preferences").select("*").eq("user_id", user.id).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      if (data) { setPreferences(data); }
      else {
        const { data: newPrefs, error: insertError } = await supabase.from("task_system_preferences").insert({ user_id: user.id, active_system: "unified", show_migration_banner: true, ai_scheduling_enabled: true }).select().single();
        if (insertError) throw insertError;
        setPreferences(newPrefs);
      }
    } catch (error) { console.error("Error loading preferences:", error); toast.error("Failed to load task preferences"); }
  };

  const loadObjectives = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("club_objectives").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setObjectives(data || []);
      if (data && data.length > 0 && !selectedObjective) setSelectedObjective(data[0].id);
    } catch (error) { console.error("Error loading objectives:", error); toast.error("Failed to load objectives"); }
  };

  const loadAllTasks = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("unified_tasks")
        .select("id, status, due_date, blockingCount:task_dependencies!task_dependencies_task_id_fkey(count)")
        .limit(1000);
      setAllTasks(data || []);
    } catch { /* silent */ }
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let overdue = 0, blocked = 0, inProgress = 0, completedToday = 0;
    for (const t of allTasks) {
      if (t.due_date && isPast(new Date(t.due_date)) && t.status !== "completed" && t.status !== "cancelled") overdue++;
      if (t.status === "in_progress") inProgress++;
      if (t.status === "completed" && t.due_date && isToday(new Date(t.due_date))) completedToday++;
    }
    return { total: allTasks.length, overdue, blocked, inProgress, completedToday };
  }, [allTasks]);

  const handleRefresh = () => setRefreshKey((p) => p + 1);

  const handleAutoSchedule = async () => {
    if (!user) return;
    setScheduling(true);
    try {
      const { error } = await supabase.functions.invoke("schedule-tasks", { body: { user_id: user.id, objective_id: selectedObjective } });
      if (error) throw error;
      toast.success("Tasks scheduled successfully");
      handleRefresh();
    } catch { toast.error("Failed to schedule tasks"); }
    finally { setScheduling(false); }
  };

  if (loading || !preferences) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-3">
        <div className="flex items-center justify-between">
            <div className="animate-pulse rounded bg-muted/60 h-8 w-48" />
            <div className="animate-pulse rounded bg-muted/60 h-8 w-28" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border border-border/20 rounded-lg h-[200px] animate-pulse bg-muted/5" />
            ))}
        </div>
      </div>
    );
  }

  const currentObjective = objectives.find((obj) => obj.id === selectedObjective);

  return (
    <UnifiedTasksProvider objectiveId={selectedObjective}>
      <div className="px-4 sm:px-6 lg:px-8 py-3 space-y-2 animate-fade-in">
        <div className="px-4 sm:px-6 lg:px-8 py-3 space-y-2 animate-fade-in">
          {/* Row 1: Unified Command Bar */}
          <TasksCommandBar
            onAutoSchedule={handleAutoSchedule}
            scheduling={scheduling}
            aiSchedulingEnabled={preferences.ai_scheduling_enabled}
            onOpenSettings={() => setSettingsOpen(true)}
            onRefresh={handleRefresh}
            activeView={activeView}
            onViewChange={handleViewChange}
          />

          {/* Row 2: Context strip — objectives + stats + new task */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-hidden">
              <CollapsedObjectivesSummary
                objectives={objectives}
                selectedObjective={selectedObjective}
                onSelectObjective={setSelectedObjective}
              />
            </div>
            <TaskStatsBar stats={stats} activeFilter={statsFilter} onFilterClick={setStatsFilter} />
            <CreateUnifiedTaskDialog
              objectiveId={selectedObjective}
              defaultStatus="pending"
              onTaskCreated={handleRefresh}
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
            >
              <Button size="sm" className="h-7 gap-1 text-[11px] px-2.5 shrink-0">
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">New Task</span>
              </Button>
            </CreateUnifiedTaskDialog>
          </div>

          {/* Views */}
          <div className="mt-1">
            {activeView === "board" && (
              <UnifiedTaskBoard
                objectiveId={selectedObjective}
                objectiveName={currentObjective?.title}
                onRefresh={handleRefresh}
                aiSchedulingEnabled={preferences.ai_scheduling_enabled}
              />
            )}
            {activeView === "list" && (
              <UnifiedTasksList
                objectiveId={selectedObjective}
                onRefresh={handleRefresh}
                aiSchedulingEnabled={preferences.ai_scheduling_enabled}
              />
            )}
            {activeView === "calendar" && (
              <UnifiedTaskCalendar objectiveId={selectedObjective} onRefresh={handleRefresh} />
            )}
            {activeView === "timeline" && (
              <TaskTimelineView objectiveId={selectedObjective} onRefresh={handleRefresh} />
            )}
            {activeView === "analytics" && (
              <TaskAnalyticsDashboard objectiveId={selectedObjective} />
            )}
            {(activeView === "members" && (role === "admin" || role === "partner")) && (
              <UnifiedTasksByMember objectiveId={selectedObjective} onRefresh={handleRefresh} />
            )}
            {activeView === "ai-scheduling" && <TaskSchedulingPreferences />}
          </div>

          <DueDateReminder />
          <QuickAddTask objectiveId={selectedObjective} onTaskCreated={handleRefresh} />
          <AISchedulingSettings open={settingsOpen} onOpenChange={setSettingsOpen} onSettingsUpdated={handleRefresh} />
          <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
          <AIPageCopilot currentPage="/tasks" contextData={{ objectivesCount: objectives.length }} />
        </div>
      </div>
    </UnifiedTasksProvider>
  );
};

export default UnifiedTasks;
