import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { User, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { UnifiedTaskDetailDialog } from "./UnifiedTaskDetailDialog";

interface TasksByMember {
  member: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  tasks: Array<{
    id: string;
    task_number: string;
    title: string;
    status: string;
    priority: string;
    due_date: string | null;
    estimated_duration_minutes: number | null;
  }>;
  stats: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
}

interface UnifiedTasksByMemberProps {
  objectiveId: string | null;
  onRefresh: () => void;
}

export function UnifiedTasksByMember({ objectiveId, onRefresh }: UnifiedTasksByMemberProps) {
  const [tasksByMember, setTasksByMember] = useState<TasksByMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  useEffect(() => {
    loadTasksByMember();
  }, [objectiveId]);

  const loadTasksByMember = async () => {
    setLoading(true);
    try {
      // Get current user's role and company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = roles?.some(r => r.role === 'admin');
      const isPartner = roles?.some(r => r.role === 'partner');

      let memberIds: string[] = [];

      if (isAdmin) {
        // Admins see all users
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id');
        memberIds = allProfiles?.map(p => p.id) || [];
      } else if (isPartner) {
        // Partners see their company members
        const { data: companyData } = await supabase
          .from('company_members')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (companyData && companyData.length > 0) {
          const companyIds = companyData.map(c => c.company_id);
          const { data: members } = await supabase
            .from('company_members')
            .select('user_id')
            .in('company_id', companyIds)
            .eq('is_active', true);
          
          memberIds = members?.map(m => m.user_id) || [];
        }
      }

      if (memberIds.length === 0) {
        setTasksByMember([]);
        return;
      }

      // Get all tasks with assignees for these members
      let query = supabase
        .from('unified_tasks')
        .select(`
          id,
          task_number,
          title,
          status,
          priority,
          due_date,
          estimated_duration_minutes,
          unified_task_assignees!inner(
            user_id,
            profiles(
              id,
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .in('unified_task_assignees.user_id', memberIds)
        .order('created_at', { ascending: false });

      if (objectiveId) {
        query = query.eq('objective_id', objectiveId);
      }

      const { data: tasks, error } = await query;

      if (error) throw error;

      // Group tasks by member
      const memberMap = new Map<string, TasksByMember>();

      tasks?.forEach((task: any) => {
        task.unified_task_assignees?.forEach((assignee: any) => {
          const memberId = assignee.user_id;
          const profile = assignee.profiles;

          if (!profile) return;

          if (!memberMap.has(memberId)) {
            memberMap.set(memberId, {
              member: {
                id: profile.id,
                full_name: profile.full_name || 'Unknown',
                email: profile.email || '',
                avatar_url: profile.avatar_url
              },
              tasks: [],
              stats: {
                total: 0,
                pending: 0,
                in_progress: 0,
                completed: 0
              }
            });
          }

          const memberData = memberMap.get(memberId)!;
          memberData.tasks.push({
            id: task.id,
            task_number: task.task_number,
            title: task.title,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            estimated_duration_minutes: task.estimated_duration_minutes
          });

          memberData.stats.total++;
          if (task.status === 'pending') memberData.stats.pending++;
          if (task.status === 'in_progress') memberData.stats.in_progress++;
          if (task.status === 'completed') memberData.stats.completed++;
        });
      });

      setTasksByMember(Array.from(memberMap.values()));
    } catch (error) {
      console.error('Error loading tasks by member:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading members...</div>;
  }

  if (tasksByMember.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No members with assigned tasks found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasksByMember.map((memberData) => (
          <Card key={memberData.member.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={memberData.member.avatar_url || undefined} />
                  <AvatarFallback>
                    {memberData.member.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {memberData.member.full_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground truncate">
                    {memberData.member.email}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {memberData.stats.total} Total
                </Badge>
                {memberData.stats.pending > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {memberData.stats.pending} Pending
                  </Badge>
                )}
                {memberData.stats.in_progress > 0 && (
                  <Badge variant="default" className="text-xs">
                    {memberData.stats.in_progress} In Progress
                  </Badge>
                )}
                {memberData.stats.completed > 0 && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    {memberData.stats.completed} Done
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {memberData.tasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(task.status)}
                          <span className="text-sm font-medium truncate">{task.title}</span>
                        </div>
                        <Badge variant={getPriorityColor(task.priority)} className="text-xs shrink-0">
                          {task.priority}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{task.task_number}</span>
                        {task.estimated_duration_minutes && (
                          <span>• {task.estimated_duration_minutes}m</span>
                        )}
                        {task.due_date && (
                          <span>• Due {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTask && (
        <UnifiedTaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            onRefresh();
            loadTasksByMember();
          }}
          onStatusChange={() => {
            onRefresh();
            loadTasksByMember();
          }}
        />
      )}
    </>
  );
}
