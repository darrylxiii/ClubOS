import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  ArrowLeft, Calendar, CheckCircle, Clock, Edit, Flag, 
  MessageSquare, Target, TrendingUp, Users, Activity,
  Send, MoreVertical, Trash2, Lock, Unlock
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { UnifiedTaskBoard } from "@/components/unified-tasks/UnifiedTaskBoard";
import { UnifiedTasksList } from "@/components/unified-tasks/UnifiedTasksList";

const ObjectiveWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [objective, setObjective] = useState<any>(null);
  const [ownerProfiles, setOwnerProfiles] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [blockingTasks, setBlockingTasks] = useState<any[]>([]);
  const [blockedByTasks, setBlockedByTasks] = useState<any[]>([]);

  useEffect(() => {
    if (id && user) {
      loadObjective();
      loadComments();
      loadActivities();
      loadDependencies();
    }
  }, [id, user]);

  const loadObjective = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("club_objectives")
        .select(`
          *,
          tasks:unified_tasks(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setObjective(data);

      // Load owner profiles
      if (data.owners && data.owners.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", data.owners);

        setOwnerProfiles(profilesData || []);
      }
    } catch (error) {
      console.error("Error loading objective:", error);
      toast.error("Failed to load objective");
      navigate("/unified-tasks");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("objective_comments")
        .select(`
          *,
          user:profiles(id, full_name, avatar_url)
        `)
        .eq("objective_id", id)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const loadActivities = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("objective_activities")
        .select(`
          *,
          user:profiles(id, full_name, avatar_url)
        `)
        .eq("objective_id", id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  };

  const loadDependencies = async () => {
    if (!id) return;

    try {
      // Get all tasks for this objective
      const { data: objTasks } = await supabase
        .from("unified_tasks")
        .select("id")
        .eq("objective_id", id);

      if (!objTasks || objTasks.length === 0) return;

      const taskIds = objTasks.map(t => t.id);

      // Load blocking tasks (tasks these objective tasks block)
      const { data: blocking } = await supabase
        .from("task_dependencies")
        .select(`
          id,
          task_id,
          depends_on:unified_tasks!task_dependencies_task_id_fkey(
            id, 
            title, 
            task_number, 
            status,
            priority
          )
        `)
        .in("depends_on_task_id", taskIds);

      setBlockingTasks(blocking?.map(b => b.depends_on).filter(Boolean) || []);

      // Load blocked-by tasks (tasks that block these objective tasks)
      const { data: blockedBy } = await supabase
        .from("task_dependencies")
        .select(`
          id,
          depends_on_task_id,
          blocker:unified_tasks!task_dependencies_depends_on_task_id_fkey(
            id, 
            title, 
            task_number, 
            status,
            priority
          )
        `)
        .in("task_id", taskIds);

      setBlockedByTasks(blockedBy?.map(b => b.blocker).filter(Boolean) || []);
    } catch (error) {
      console.error("Error loading dependencies:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user || !id) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from("objective_comments")
        .insert({
          objective_id: id,
          user_id: user.id,
          comment: newComment.trim(),
        });

      if (error) throw error;

      toast.success("Comment added");
      setNewComment("");
      loadComments();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'delayed': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'low': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading || !objective) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading objective...</div>
        </div>
      </AppLayout>
    );
  }

  const dueDate = objective.due_date || objective.hard_deadline;
  const isOverdue = dueDate && isPast(new Date(dueDate));
  const daysRemaining = dueDate ? differenceInDays(new Date(dueDate), new Date()) : null;

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4 flex-1">
            <Button variant="ghost" onClick={() => navigate("/unified-tasks")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Tasks
            </Button>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Target className="h-8 w-8 text-primary mt-1" />
                <div className="flex-1 space-y-2">
                  <h1 className="text-4xl font-bold text-foreground">{objective.title}</h1>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={getStatusColor(objective.status)}>
                      {objective.status.replace('_', ' ')}
                    </Badge>
                    {objective.priority && (
                      <Badge variant="outline" className={getPriorityColor(objective.priority)}>
                        <Flag className="h-3 w-3 mr-1" />
                        {objective.priority}
                      </Badge>
                    )}
                    {objective.milestone_type && (
                      <Badge variant="outline">
                        <Target className="h-3 w-3 mr-1" />
                        {objective.milestone_type}
                      </Badge>
                    )}
                    {isOverdue && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button variant="outline" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Progress
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{objective.completion_percentage || 0}%</div>
                  <Progress value={objective.completion_percentage || 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  Tasks
                </div>
                <div className="text-2xl font-bold">
                  {objective.tasks?.filter((t: any) => t.status === 'completed').length || 0} / {objective.tasks?.length || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {isOverdue ? 'Overdue' : 'Days Left'}
                </div>
                <div className="text-2xl font-bold">
                  {daysRemaining !== null ? (isOverdue ? `${Math.abs(daysRemaining)}` : daysRemaining) : '-'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Team
                </div>
                <div className="flex -space-x-2">
                  {ownerProfiles.slice(0, 4).map((owner) => (
                    <Avatar key={owner.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={owner.avatar_url} />
                      <AvatarFallback>
                        {owner.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {ownerProfiles.length > 4 && (
                    <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                      +{ownerProfiles.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {objective.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{objective.description}</p>
                    </CardContent>
                  </Card>
                )}

                {objective.goals && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Goals & Success Criteria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{objective.goals}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {objective.start_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Start Date</span>
                        <span>{format(new Date(objective.start_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    {objective.due_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Due Date</span>
                        <span>{format(new Date(objective.due_date), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    {objective.hard_deadline && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hard Deadline</span>
                        <span className="font-semibold">{format(new Date(objective.hard_deadline), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {objective.tags && objective.tags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {objective.tags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Owners Card */}
                {ownerProfiles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Objective Owners
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {ownerProfiles.map((owner) => (
                          <div key={owner.id} className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={owner.avatar_url} />
                              <AvatarFallback>
                                {owner.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{owner.full_name}</p>
                              {owner.email && (
                                <p className="text-xs text-muted-foreground">{owner.email}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Dependencies Card */}
                {(blockingTasks.length > 0 || blockedByTasks.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Task Dependencies</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {blockingTasks.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Lock className="h-4 w-4 text-orange-500" />
                            <span>Blocking {blockingTasks.length}</span>
                          </div>
                          <div className="space-y-1 pl-6">
                            {blockingTasks.slice(0, 5).map((task: any) => (
                              <div key={task.id} className="text-xs flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1">{task.task_number}</Badge>
                                <span className="truncate">{task.title}</span>
                              </div>
                            ))}
                            {blockingTasks.length > 5 && (
                              <p className="text-xs text-muted-foreground pl-0">+{blockingTasks.length - 5} more</p>
                            )}
                          </div>
                        </div>
                      )}

                      {blockedByTasks.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Unlock className="h-4 w-4 text-blue-500" />
                            <span>Blocked By {blockedByTasks.length}</span>
                          </div>
                          <div className="space-y-1 pl-6">
                            {blockedByTasks.slice(0, 5).map((task: any) => (
                              <div key={task.id} className="text-xs flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1">{task.task_number}</Badge>
                                <span className="truncate">{task.title}</span>
                              </div>
                            ))}
                            {blockedByTasks.length > 5 && (
                              <p className="text-xs text-muted-foreground pl-0">+{blockedByTasks.length - 5} more</p>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <UnifiedTasksList objectiveId={id} onRefresh={loadObjective} aiSchedulingEnabled={false} />
          </TabsContent>

          <TabsContent value="comments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Discussion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                  />
                  <Button onClick={handleSubmitComment} disabled={submittingComment || !newComment.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Post Comment
                  </Button>
                </div>

                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-4 rounded-lg border">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.user?.avatar_url} />
                          <AvatarFallback>
                            {comment.user?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{comment.user?.full_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{comment.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No activity yet</p>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 pb-4 border-b last:border-0">
                        <Activity className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{activity.user?.full_name || 'System'}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.activity_type}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default ObjectiveWorkspace;
