import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ObjectiveCard } from "./ObjectiveCard";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { CreateObjectiveDialog } from "./CreateObjectiveDialog";
import { toast } from "sonner";

interface Objective {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  owners?: string[];
  start_date?: string;
  due_date?: string;
  hard_deadline?: string;
  completion_percentage?: number;
  tags?: any;
  milestone_type?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLUMNS = [
  { 
    status: 'pending', 
    label: 'Pending', 
    icon: Target,
    description: 'Not started yet'
  },
  { 
    status: 'in_progress', 
    label: 'In Progress', 
    icon: TrendingUp,
    description: 'Currently active'
  },
  { 
    status: 'delayed', 
    label: 'Delayed', 
    icon: Clock,
    description: 'Behind schedule'
  },
  { 
    status: 'completed', 
    label: 'Completed', 
    icon: CheckCircle,
    description: 'Successfully finished'
  }
];

export const ObjectivesBoard = () => {
  const { user } = useAuth();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerProfiles, setOwnerProfiles] = useState<Map<string, any>>(new Map());
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadObjectives();
    }
  }, [user]);

  const loadObjectives = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load objectives with tasks and their dependencies
      const { data: objectivesData, error: objectivesError } = await supabase
        .from("club_objectives")
        .select(`
          *,
          tasks:unified_tasks(id, title, status, priority, due_date, task_number)
        `)
        .order("created_at", { ascending: false });

      if (objectivesError) throw objectivesError;

      // For each objective, fetch task dependencies
      if (objectivesData) {
        const objectivesWithDeps = await Promise.all(
          objectivesData.map(async (obj) => {
            if (!obj.tasks || obj.tasks.length === 0) return obj;

            const taskIds = obj.tasks.map((t: any) => t.id);
            
            // Get blocking dependencies (tasks these tasks block)
            const { data: blocking } = await supabase
              .from("task_dependencies")
              .select(`
                id,
                task_id,
                depends_on_task_id,
                depends_on:unified_tasks!task_dependencies_depends_on_task_id_fkey(id, title, task_number, status)
              `)
              .in("depends_on_task_id", taskIds);

            // Get blocked-by dependencies (tasks that block these tasks)
            const { data: blockedBy } = await supabase
              .from("task_dependencies")
              .select(`
                id,
                task_id,
                depends_on_task_id,
                blocker:unified_tasks!task_dependencies_depends_on_task_id_fkey(id, title, task_number, status)
              `)
              .in("task_id", taskIds);

            return {
              ...obj,
              blockingCount: blocking?.length || 0,
              blockedByCount: blockedBy?.length || 0,
              blockingTasks: blocking || [],
              blockedByTasks: blockedBy || []
            };
          })
        );
        setObjectives(objectivesWithDeps);
      } else {
        setObjectives([]);
      }

      // Load owner profiles
      const allOwners = new Set<string>();
      objectivesData?.forEach(obj => {
        obj.owners?.forEach((ownerId: string) => allOwners.add(ownerId));
      });

      if (allOwners.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", Array.from(allOwners));

        const profilesMap = new Map();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
        setOwnerProfiles(profilesMap);
      }
    } catch (error) {
      console.error("Error loading objectives:", error);
      toast.error("Failed to load objectives");
    } finally {
      setLoading(false);
    }
  };

  const getObjectivesByStatus = (status: string) => {
    return objectives.filter(obj => obj.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="text-sm text-muted-foreground">Loading objectives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Objectives Board</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage project objectives
          </p>
        </div>
        <CreateObjectiveDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={loadObjectives}>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Objective
          </Button>
        </CreateObjectiveDialog>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {STATUS_COLUMNS.map(column => {
          const columnObjectives = getObjectivesByStatus(column.status);
          const Icon = column.icon;

          return (
            <div key={column.status} className="space-y-4">
              {/* Column Header */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{column.label}</h3>
                  <span className="text-sm text-muted-foreground">
                    ({columnObjectives.length})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{column.description}</p>
              </div>

              {/* Objectives */}
              <div className="space-y-3">
                {columnObjectives.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                    No objectives
                  </div>
                ) : (
                  columnObjectives.map(objective => {
                    const owners = objective.owners
                      ?.map(id => ownerProfiles.get(id))
                      .filter(Boolean);

                    return (
                      <ObjectiveCard
                        key={objective.id}
                        objective={objective}
                        ownerProfiles={owners}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
