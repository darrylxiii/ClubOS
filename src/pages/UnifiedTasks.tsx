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
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UnifiedTaskBoard } from "@/components/unified-tasks/UnifiedTaskBoard";
import { UnifiedTasksList } from "@/components/unified-tasks/UnifiedTasksList";
import { UnifiedTaskCalendar } from "@/components/unified-tasks/UnifiedTaskCalendar";
import { CreateUnifiedTaskDialog } from "@/components/unified-tasks/CreateUnifiedTaskDialog";
import { AISchedulingSettings } from "@/components/unified-tasks/AISchedulingSettings";
import { UnifiedTasksByMember } from "@/components/unified-tasks/UnifiedTasksByMember";
import { useUserRole } from "@/hooks/useUserRole";
import { ObjectivesBoard } from "@/components/objectives/ObjectivesBoard";
import { ObjectivesList } from "@/components/objectives/ObjectivesList";
import { TaskSchedulingPreferences } from "@/components/TaskSchedulingPreferences";

interface SystemPreferences {
  active_system: string;
  show_migration_banner: boolean;
  ai_scheduling_enabled: boolean;
}

const UnifiedTasks = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [preferences, setPreferences] = useState<SystemPreferences | null>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      await Promise.all([loadPreferences(), loadObjectives()]);
      setLoading(false);
    };
    init();
  }, [user, refreshKey]);

  // Check for action parameter to auto-open dialogs
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create') {
      setCreateDialogOpen(true);
      // Clear the parameter after opening
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
        // Create default preferences
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
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const currentObjective = objectives.find(obj => obj.id === selectedObjective);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                    TASKS
                  </h1>
                </div>
                <p className="text-muted-foreground mt-2">
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
                  <span className="sm:hidden">{scheduling ? "..." : "Schedule"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Info Alert */}
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs sm:text-sm">
              Manage objectives and tasks with AI-powered scheduling. Use drag & drop to update statuses.
            </AlertDescription>
          </Alert>
        </div>

        {/* Objectives Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Objectives</h2>
          </div>
          
          <Tabs defaultValue="board" className="space-y-6">
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

            <TabsContent value="board" className="space-y-4">
              <ObjectivesBoard />
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <ObjectivesList />
            </TabsContent>
          </Tabs>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Tasks</h2>
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

          {/* Objective Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 overflow-x-auto">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  🎯 Filter by Objective:
                </span>
                <div className="flex gap-2">
                  <Button
                    variant={!selectedObjective ? "default" : "outline"}
                    onClick={() => setSelectedObjective(null)}
                    className="whitespace-nowrap"
                  >
                    All Tasks
                  </Button>
                  {objectives.map((objective) => (
                    <Button
                      key={objective.id}
                      variant={selectedObjective === objective.id ? "default" : "outline"}
                      onClick={() => setSelectedObjective(objective.id)}
                      className="whitespace-nowrap"
                    >
                      {objective.title}
                    </Button>
                  ))}
                  {objectives.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No objectives yet. Tasks can be created without objectives.
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="board" className="space-y-6">
            <TabsList className={`grid w-full ${role === 'admin' || role === 'partner' ? 'grid-cols-5' : 'grid-cols-4'} lg:w-auto`}>
              <TabsTrigger value="board" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Board
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              {(role === 'admin' || role === 'partner') && (
                <TabsTrigger value="members" className="gap-2">
                  <Users className="h-4 w-4" />
                  Members
                </TabsTrigger>
              )}
              <TabsTrigger value="calendar" className="gap-2">
                <Calendar className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="ai-scheduling" className="gap-2">
                <Wand2 className="h-4 w-4" />
                AI Scheduling
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

            <TabsContent value="ai-scheduling" className="space-y-4">
              <TaskSchedulingPreferences />
            </TabsContent>
          </Tabs>
        </div>

        {/* AI Scheduling Settings Dialog */}
        <AISchedulingSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSettingsUpdated={handleRefresh}
        />
      </div>
    </AppLayout>
  );
};

export default UnifiedTasks;
