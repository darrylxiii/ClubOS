import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Users, BarChart3 } from "lucide-react";
import { ClubTaskBoard } from "@/components/clubtasks/ClubTaskBoard";
import { ClubTasksByMember } from "@/components/clubtasks/ClubTasksByMember";
import { ClubTasksOverview } from "@/components/clubtasks/ClubTasksOverview";
import { CreateObjectiveDialog } from "@/components/clubtasks/CreateObjectiveDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ClubObjective {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const ClubTasks = () => {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<ClubObjective[]>([]);
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadObjectives();
  }, [user, refreshKey]);

  const loadObjectives = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("club_objectives")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setObjectives(data || []);
      
      // Auto-select first objective if none selected
      if (data && data.length > 0 && !selectedObjective) {
        setSelectedObjective(data[0].id);
      }
    } catch (error) {
      console.error("Error loading objectives:", error);
      toast.error("Failed to load objectives");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const currentObjective = objectives.find(obj => obj.id === selectedObjective);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              CLUB TASK BOARD
            </h1>
            <p className="text-muted-foreground mt-2">
              Collaborative task management with blocking relationships
            </p>
          </div>
          <CreateObjectiveDialog onObjectiveCreated={handleRefresh}>
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Objective
            </Button>
          </CreateObjectiveDialog>
        </div>

        {/* Objective Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 overflow-x-auto">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                🎯 Objective:
              </span>
              <div className="flex gap-2">
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
                    No objectives yet. Create one to get started!
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different views */}
        <Tabs defaultValue="board" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="board" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              By Member
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-4">
            {selectedObjective ? (
              <ClubTaskBoard 
                objectiveId={selectedObjective} 
                objectiveName={currentObjective?.title || ""}
                onRefresh={handleRefresh}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Select an objective to view tasks
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            {selectedObjective ? (
              <ClubTasksByMember 
                objectiveId={selectedObjective}
                onRefresh={handleRefresh}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Select an objective to view tasks by member
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="overview" className="space-y-4">
            {selectedObjective ? (
              <ClubTasksOverview 
                objectiveId={selectedObjective}
                onRefresh={handleRefresh}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Select an objective to view overview
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ClubTasks;
