import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LayoutDashboard, 
  Users, 
  Calendar,
  List,
  Settings,
  Info,
  Wand2,
  Target,
  Grid3x3,
  Plus,
  BarChart3
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
import { ObjectivesBoard } from "@/components/objectives/ObjectivesBoard";
import { ObjectivesList } from "@/components/objectives/ObjectivesList";
import { AIPageCopilot } from "@/components/ai/AIPageCopilot";
import { TaskSchedulingPreferences } from "@/components/TaskSchedulingPreferences";
import { BoardNavigationBar } from "@/components/task-boards/BoardNavigationBar";
import { BoardContextHeader } from "@/components/task-boards/BoardContextHeader";
import { TaskToolbar } from "@/components/unified-tasks/TaskToolbar";
import { QuickAddTask } from "@/components/unified-tasks/QuickAddTask";
import { TaskAnalyticsDashboard } from "@/components/unified-tasks/TaskAnalyticsDashboard";

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
  const [activeTab, setActiveTab] = useState("board");

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
    const action = searchParams.get('action');
    if (action === 'create') {
      setCreateDialogOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("task_system_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
      } else {
        const { data: newPrefs, error: insertError } = await supabase
          .from("task_system_preferences")
          .insert({
            user_id: user.id,
            active_system: 'unified',
            show_migration_banner: true,
            ai_scheduling_enabled: true
          })
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
      const { data, error } = await supabase
        .from("club_objectives")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setObjectives(data || []);
      
      if (data && data.length > 0 && !selectedObjective) {
        setSelectedObjective(data[0].id);
      }
    } catch (error) {
      console.error("Error loading objectives:", error);
    }
  };

  const handlePreferenceUpdate = async (updates: Partial<SystemPreferences>) => {
    if (!user || !preferences) return;

    try {
      const { error } = await supabase
        .from("task_system_preferences")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
      setPreferences({ ...preferences, ...updates });
      toast.success("Preferences updated");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update preferences");
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleAutoSchedule = async () => {
    if (!user) return;

    setScheduling(true);
    try {
      const { data, error } = await supabase.functions.invoke('schedule-tasks', {
        body: { 
          user_id: user.id,
          objective_id: selectedObjective 
        }
      });

      if (error) throw error;

      toast.success("Tasks scheduled successfully!");
      handleRefresh();
    } catch (error) {
      console.error("Error scheduling tasks:", error);
      toast.error("Failed to schedule tasks");
    } finally {
      setScheduling(false);
    }
  };

  if (loading || !preferences) {
    return (
      <TaskBoardProvider>
        <AppLayout>
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-muted-foreground">Loading tasks...</div>
            </div>
          </div>
        </AppLayout>
      </TaskBoardProvider>
    );
  }

  const currentObjective = objectives.find(obj => obj.id === selectedObjective);

  return (
    <TaskBoardProvider>
      <UnifiedTasksProvider objectiveId={selectedObjective}>
        <AppLayout>
          <div className="container mx-auto px-4 py-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                      TASKS
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Intelligent task management with AI scheduling
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setSettingsOpen(true)}
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">AI Settings</span>
                  </Button>
                  {preferences.ai_scheduling_enabled && (
                    <Button
                      variant="secondary"
                      size="default"
                      onClick={handleAutoSchedule}
                      disabled={scheduling}
                      className="gap-2"
                    >
                      <Wand2 className="h-4 w-4" />
                      <span className="hidden sm:inline">{scheduling ? "Scheduling..." : "Auto Schedule"}</span>
                    </Button>
                  )}
                  <CreateUnifiedTaskDialog
                    objectiveId={selectedObjective}
                    defaultStatus="pending"
                    onTaskCreated={handleRefresh}
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                  >
                    <Button size="default" className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Task
                    </Button>
                  </CreateUnifiedTaskDialog>
                </div>
              </div>
            </div>

            {/* Objectives Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Objectives</h2>
              </div>
              
              <Tabs defaultValue="board" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 lg:w-auto">
                  <TabsTrigger value="board" className="gap-2">
                    <Target className="h-4 w-4" />
                    Board
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <Grid3x3 className="h-4 w-4" />
                    List
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="board"><ObjectivesBoard /></TabsContent>
                <TabsContent value="list"><ObjectivesList /></TabsContent>
              </Tabs>
            </div>

            <div className="border-t border-border/50" />

            {/* Board Navigation */}
            <div className="space-y-4">
              <BoardNavigationBar />
              <BoardContextHeader />
            </div>

            {/* Tasks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Tasks</h2>
              </div>

              {/* Objective Filter */}
              <Card className="border-border/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 overflow-x-auto pb-1">
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                      🎯 Objective:
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant={!selectedObjective ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedObjective(null)}
                      >
                        All
                      </Button>
                      {objectives.map((objective) => (
                        <Button
                          key={objective.id}
                          variant={selectedObjective === objective.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedObjective(objective.id)}
                          className="whitespace-nowrap"
                        >
                          {objective.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Task Toolbar with Search, Filters, Bulk Actions */}
              <TaskToolbar onRefresh={handleRefresh} />

              {/* Task Views */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className={`grid w-full ${role === 'admin' || role === 'partner' ? 'grid-cols-6' : 'grid-cols-5'} lg:w-auto`}>
                  <TabsTrigger value="board" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Board</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">List</span>
                  </TabsTrigger>
                  {(role === 'admin' || role === 'partner') && (
                    <TabsTrigger value="members" className="gap-2">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Team</span>
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="calendar" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Calendar</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Analytics</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-scheduling" className="gap-2">
                    <Wand2 className="h-4 w-4" />
                    <span className="hidden sm:inline">AI</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="board" className="space-y-4">
                  <UnifiedTaskBoard 
                    objectiveId={selectedObjective}
                    objectiveName={currentObjective?.title}
                    onRefresh={handleRefresh}
                    aiSchedulingEnabled={preferences.ai_scheduling_enabled}
                  />
                </TabsContent>

                <TabsContent value="list" className="space-y-4">
                  <UnifiedTasksList
                    objectiveId={selectedObjective}
                    onRefresh={handleRefresh}
                    aiSchedulingEnabled={preferences.ai_scheduling_enabled}
                  />
                </TabsContent>

                {(role === 'admin' || role === 'partner') && (
                  <TabsContent value="members" className="space-y-4">
                    <UnifiedTasksByMember
                      objectiveId={selectedObjective}
                      onRefresh={handleRefresh}
                    />
                  </TabsContent>
                )}

                <TabsContent value="calendar" className="space-y-4">
                  <UnifiedTaskCalendar
                    objectiveId={selectedObjective}
                    onRefresh={handleRefresh}
                  />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                  <TaskAnalyticsDashboard />
                </TabsContent>

                <TabsContent value="ai-scheduling" className="space-y-4">
                  <TaskSchedulingPreferences />
                </TabsContent>
              </Tabs>
            </div>

            {/* Quick Add (Cmd+K) */}
            <QuickAddTask 
              objectiveId={selectedObjective} 
              onTaskCreated={handleRefresh} 
            />

            {/* AI Scheduling Settings Dialog */}
            <AISchedulingSettings
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              onSettingsUpdated={handleRefresh}
            />
            
            <AIPageCopilot 
              currentPage="/unified-tasks" 
              contextData={{ objectivesCount: objectives.length }}
            />
          </div>
        </AppLayout>
      </UnifiedTasksProvider>
    </TaskBoardProvider>
  );
};

export default UnifiedTasks;
