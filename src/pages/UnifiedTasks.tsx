import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  List,
  Calendar,
  Users,
  Plus,
  BarChart3,
  GanttChart,
  Wand2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TaskBoardProvider } from "@/contexts/TaskBoardContext";
import { UnifiedTasksProvider } from "@/contexts/UnifiedTasksContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UnifiedTaskBoard } from "@/components/unified-tasks/UnifiedTaskBoard";
import { UnifiedTasksList } from "@/components/unified-tasks/UnifiedTasksList";
import { UnifiedTaskCalendar } from "@/components/unified-tasks/UnifiedTaskCalendar";
import { CreateUnifiedTaskDialog } from "@/components/unified-tasks/CreateUnifiedTaskDialog";
import { AISchedulingSettings } from "@/components/unified-tasks/AISchedulingSettings";
import { UnifiedTasksByMember } from "@/components/unified-tasks/UnifiedTasksByMember";
import { useRole } from "@/contexts/RoleContext";
import { AIPageCopilot } from "@/components/ai/AIPageCopilot";
import { TaskSchedulingPreferences } from "@/components/TaskSchedulingPreferences";
import { TaskToolbar } from "@/components/unified-tasks/TaskToolbar";
import { QuickAddTask } from "@/components/unified-tasks/QuickAddTask";
import { TaskAnalyticsDashboard } from "@/components/unified-tasks/TaskAnalyticsDashboard";
import { TaskTimelineView } from "@/components/unified-tasks/TaskTimelineView";
import { DueDateReminder } from "@/components/unified-tasks/DueDateReminder";
import { TasksCommandBar } from "@/components/unified-tasks/TasksCommandBar";
import { CollapsedObjectivesSummary } from "@/components/unified-tasks/CollapsedObjectivesSummary";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "board");

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      await Promise.all([loadPreferences(), loadObjectives()]);
      setLoading(false);
    };
    init();
  }, [user, refreshKey]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "create") {
      setCreateDialogOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "board") next.delete("tab");
      else next.set("tab", tab);
      return next;
    });
  };

  const loadPreferences = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("task_system_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setPreferences(data);
      } else {
        const { data: newPrefs, error: insertError } = await supabase
          .from("task_system_preferences")
          .insert({ user_id: user.id, active_system: "unified", show_migration_banner: true, ai_scheduling_enabled: true })
          .select()
          .single();
        if (insertError) throw insertError;
        setPreferences(newPrefs);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  const loadObjectives = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("club_objectives").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setObjectives(data || []);
      if (data && data.length > 0 && !selectedObjective) setSelectedObjective(data[0].id);
    } catch (error) {
      console.error("Error loading objectives:", error);
    }
  };

  const handleRefresh = () => setRefreshKey((p) => p + 1);

  const handleAutoSchedule = async () => {
    if (!user) return;
    setScheduling(true);
    try {
      const { error } = await supabase.functions.invoke("schedule-tasks", {
        body: { user_id: user.id, objective_id: selectedObjective },
      });
      if (error) throw error;
      toast.success("Tasks scheduled successfully");
      handleRefresh();
    } catch {
      toast.error("Failed to schedule tasks");
    } finally {
      setScheduling(false);
    }
  };

  if (loading || !preferences) {
    return (
      <TaskBoardProvider>
        <AppLayout>
          <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="animate-pulse rounded bg-muted/60 h-8 w-48" />
              <div className="animate-pulse rounded bg-muted/60 h-8 w-28" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border border-border/30 rounded-lg h-[300px] animate-pulse bg-muted/10" />
              ))}
            </div>
          </div>
        </AppLayout>
      </TaskBoardProvider>
    );
  }

  const currentObjective = objectives.find((obj) => obj.id === selectedObjective);

  return (
    <TaskBoardProvider>
      <UnifiedTasksProvider objectiveId={selectedObjective}>
        <AppLayout>
          <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-3 animate-fade-in">
            {/* Command Bar: board selector + actions */}
            <TasksCommandBar
              onAutoSchedule={handleAutoSchedule}
              scheduling={scheduling}
              aiSchedulingEnabled={preferences.ai_scheduling_enabled}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            {/* Objectives summary strip */}
            <CollapsedObjectivesSummary
              objectives={objectives}
              selectedObjective={selectedObjective}
              onSelectObjective={setSelectedObjective}
            />

            {/* Toolbar: search, filters, view mode, new task */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <TaskToolbar onRefresh={handleRefresh} />
              </div>
              <CreateUnifiedTaskDialog
                objectiveId={selectedObjective}
                defaultStatus="pending"
                onTaskCreated={handleRefresh}
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
              >
                <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New Task</span>
                </Button>
              </CreateUnifiedTaskDialog>
            </div>

            {/* Task Views */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="h-8 p-0.5 bg-muted/30">
                <TabsTrigger value="board" className="h-7 px-2.5 text-xs gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Board</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="h-7 px-2.5 text-xs gap-1.5">
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">List</span>
                </TabsTrigger>
                {(role === "admin" || role === "partner") && (
                  <TabsTrigger value="members" className="h-7 px-2.5 text-xs gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Team</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="calendar" className="h-7 px-2.5 text-xs gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Calendar</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="h-7 px-2.5 text-xs gap-1.5">
                  <GanttChart className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="h-7 px-2.5 text-xs gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="ai-scheduling" className="h-7 px-2.5 text-xs gap-1.5">
                  <Wand2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">AI</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="board" className="mt-3">
                <UnifiedTaskBoard
                  objectiveId={selectedObjective}
                  objectiveName={currentObjective?.title}
                  onRefresh={handleRefresh}
                  aiSchedulingEnabled={preferences.ai_scheduling_enabled}
                />
              </TabsContent>

              <TabsContent value="list" className="mt-3">
                <UnifiedTasksList
                  objectiveId={selectedObjective}
                  onRefresh={handleRefresh}
                  aiSchedulingEnabled={preferences.ai_scheduling_enabled}
                />
              </TabsContent>

              {(role === "admin" || role === "partner") && (
                <TabsContent value="members" className="mt-3">
                  <UnifiedTasksByMember objectiveId={selectedObjective} onRefresh={handleRefresh} />
                </TabsContent>
              )}

              <TabsContent value="calendar" className="mt-3">
                <UnifiedTaskCalendar objectiveId={selectedObjective} onRefresh={handleRefresh} />
              </TabsContent>

              <TabsContent value="timeline" className="mt-3">
                <TaskTimelineView objectiveId={selectedObjective} onRefresh={handleRefresh} />
              </TabsContent>

              <TabsContent value="analytics" className="mt-3">
                <TaskAnalyticsDashboard objectiveId={selectedObjective} />
              </TabsContent>

              <TabsContent value="ai-scheduling" className="mt-3">
                <TaskSchedulingPreferences />
              </TabsContent>
            </Tabs>

            <DueDateReminder />

            <QuickAddTask objectiveId={selectedObjective} onTaskCreated={handleRefresh} />

            <AISchedulingSettings open={settingsOpen} onOpenChange={setSettingsOpen} onSettingsUpdated={handleRefresh} />

            {/* Keyboard shortcuts — compact */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur border border-border/40 shadow-lg text-[10px] text-muted-foreground z-40">
              <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono">↑↓</kbd> Nav</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono">Enter</kbd> Open</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono">x</kbd> Select</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono">s</kbd> Status</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted font-mono">⌘K</kbd> Add</span>
            </div>

            <AIPageCopilot currentPage="/tasks" contextData={{ objectivesCount: objectives.length }} />
          </div>
        </AppLayout>
      </UnifiedTasksProvider>
    </TaskBoardProvider>
  );
};

export default UnifiedTasks;
