import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Calendar, Flag, Target, Users } from "lucide-react";
import { CreateObjectiveDialog } from "./CreateObjectiveDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface Objective {
  id: string;
  title: string;
  status: string;
  priority?: string;
  owners?: string[];
  due_date?: string;
  completion_percentage?: number;
  tags?: any;
  tasks?: any[];
}

export const ObjectivesList = () => {
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
      
      const { data: objectivesData, error } = await supabase
        .from("club_objectives")
        .select(`
          *,
          tasks:unified_tasks(id, title, status)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setObjectives(objectivesData || []);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'in_progress': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'delayed': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'high': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      case 'medium': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'low': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      default: return 'bg-muted text-muted-foreground';
    }
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
          <h2 className="text-2xl font-bold text-foreground">Objectives List</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete overview of all objectives
          </p>
        </div>
        <CreateObjectiveDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={loadObjectives}>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            New Objective
          </Button>
        </CreateObjectiveDialog>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Owners</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Tasks</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {objectives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No objectives found. Create your first objective to get started.
                </TableCell>
              </TableRow>
            ) : (
              objectives.map(objective => {
                const owners = objective.owners
                  ?.map(id => ownerProfiles.get(id))
                  .filter(Boolean);

                return (
                  <TableRow key={objective.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell>
                      <Link to={`/objectives/${objective.id}`} className="hover:text-primary transition-colors">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{objective.title}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {owners && owners.length > 0 ? (
                        <div className="flex -space-x-2">
                          {owners.slice(0, 3).map((owner: any) => (
                            <Avatar key={owner.id} className="h-6 w-6 border-2 border-background">
                              <AvatarImage src={owner.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {owner.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {owners.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                              +{owners.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(objective.status)}>
                        {objective.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {objective.priority ? (
                        <Badge variant="outline" className={getPriorityColor(objective.priority)}>
                          <Flag className="h-3 w-3 mr-1" />
                          {objective.priority}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={objective.completion_percentage || 0} className="h-2 flex-1" />
                        <span className="text-sm font-medium min-w-[40px]">
                          {objective.completion_percentage || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{objective.tasks?.length || 0}</span>
                    </TableCell>
                    <TableCell>
                      {objective.due_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(objective.due_date), 'MMM dd')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {objective.tags && objective.tags.length > 0 ? (
                        <div className="flex gap-1">
                          {objective.tags.slice(0, 2).map((tag: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {objective.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{objective.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
