import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  LayoutDashboard, 
  Users, 
  Calendar,
  List,
  Settings,
  Info,
  Sparkles,
  Plus,
  Wand2,
  Target,
  Grid3x3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TaskSystemToggle } from "@/components/unified-tasks/TaskSystemToggle";
import { MigrationBanner } from "@/components/unified-tasks/MigrationBanner";
import { UnifiedTaskBoard } from "@/components/unified-tasks/UnifiedTaskBoard";
import { UnifiedTasksList } from "@/components/unified-tasks/UnifiedTasksList";
import { UnifiedTaskCalendar } from "@/components/unified-tasks/UnifiedTaskCalendar";
import { CreateUnifiedTaskDialog } from "@/components/unified-tasks/CreateUnifiedTaskDialog";
import { AISchedulingSettings } from "@/components/unified-tasks/AISchedulingSettings";
import { UnifiedTasksByMember } from "@/components/unified-tasks/UnifiedTasksByMember";
import { useUserRole } from "@/hooks/useUserRole";
import { ObjectivesBoard } from "@/components/objectives/ObjectivesBoard";
import { ObjectivesList } from "@/components/objectives/ObjectivesList";

interface SystemPreferences {
  active_system: string;
  show_migration_banner: boolean;
  ai_scheduling_enabled: boolean;
}

const UnifiedTasks = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [preferences, setPreferences] = useState<SystemPreferences | null>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoading(true);
      await Promise.all([loadPreferences(), loadObjectives()]);
      setLoading(false);
    };
    init();
  }, [user, refreshKey]);

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
        {/* Migration Banner */}
        {preferences.show_migration_banner && (
          <MigrationBanner 
            onDismiss={() => handlePreferenceUpdate({ show_migration_banner: false })}
          />
        )}

        {/* Header with System Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-4xl font-bold text-foreground">
                  UNIFIED TASKS
                </h1>
                <Badge variant="secondary" className="text-xs">
                  BETA
                </Badge>
              </div>
              <p className="text-muted-foreground mt-2">
                Intelligent task management with AI scheduling
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setSettingsOpen(true)}
              className="gap-2"
            >
              <Settings className="h-5 w-5" />
              AI Settings
            </Button>
            {preferences.ai_scheduling_enabled && (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleAutoSchedule}
                disabled={scheduling}
                className="gap-2"
              >
                <Wand2 className="h-5 w-5" />
                {scheduling ? "Scheduling..." : "Auto Schedule"}
              </Button>
            )}
            <TaskSystemToggle
              activeSystem={preferences.active_system}
              onSystemChange={(system) => handlePreferenceUpdate({ active_system: system })}
            />
            <CreateUnifiedTaskDialog 
              objectiveId={selectedObjective}
              onTaskCreated={handleRefresh}
            >
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                New Task
              </Button>
            </CreateUnifiedTaskDialog>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Unified Tasks</strong> combines Club Tasks and Task Pilot features. 
            All your existing tasks are preserved and accessible. 
            Use the system toggle to switch between views.
          </AlertDescription>
        </Alert>

        {/* Objective Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 overflow-x-auto">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                🎯 Objective:
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

        {/* Main Task Views */}
        <Tabs defaultValue="board" className="space-y-6">
          <TabsList className={`grid w-full ${role === 'admin' || role === 'partner' ? 'grid-cols-6' : 'grid-cols-4'} lg:w-auto`}>
            <TabsTrigger value="objectives-board" className="gap-2">
              <Target className="h-4 w-4" />
              Objectives
            </TabsTrigger>
            <TabsTrigger value="objectives-list" className="gap-2">
              <Grid3x3 className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Task List
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
          </TabsList>

          <TabsContent value="objectives-board" className="space-y-4">
            <ObjectivesBoard />
          </TabsContent>

          <TabsContent value="objectives-list" className="space-y-4">
            <ObjectivesList />
          </TabsContent>

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
        </Tabs>

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
