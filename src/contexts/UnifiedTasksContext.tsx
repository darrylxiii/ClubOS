import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskBoard } from "@/contexts/TaskBoardContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export interface UnifiedTask {
  id: string;
  title: string;
  description?: string | null;
  task_number: string;
  status: string;
  priority: string;
  due_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  objective_id?: string | null;
  project_id?: string | null;
  job_id?: string | null;
  company_id?: string | null;
  board_id?: string | null;
  time_tracked_minutes?: number | null;
  timer_running?: boolean | null;
  timer_started_at?: string | null;
  is_overdue?: boolean | null;
  recurrence_rule?: unknown | null;
  auto_scheduled?: boolean;
  scheduling_mode?: string;
  migration_status?: string;
  assignees?: Array<{
    user_id: string;
    profiles: { full_name: string; avatar_url?: string | null };
  }>;
  labels?: Array<{ id: string; name: string; color: string }>;
  job?: { id: string; title: string } | null;
  company?: { id: string; name: string } | null;
  // Enrichment counts
  blockingCount?: number;
  blockedByCount?: number;
  subtaskCount?: number;
  subtaskCompleted?: number;
  commentCount?: number;
  project_tag?: string | null;
  marketplace_projects?: { title: string } | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

interface SearchFilters {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  dateRange?: { start: Date; end: Date } | null;
  labels?: string[];
}

interface UnifiedTasksContextType {
  tasks: UnifiedTask[];
  loading: boolean;
  selectedTaskIds: Set<string>;
  searchQuery: string;
  filters: SearchFilters;
  viewMode: 'board' | 'list' | 'calendar' | 'analytics';
  loadTasks: (objectiveId?: string | null, boardId?: string | null) => Promise<void>;
  refreshTasks: () => void;
  updateTask: (taskId: string, updates: Partial<UnifiedTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  bulkUpdateTasks: (taskIds: string[], updates: Partial<UnifiedTask>) => Promise<void>;
  bulkDeleteTasks: (taskIds: string[]) => Promise<void>;
  selectTask: (taskId: string) => void;
  deselectTask: (taskId: string) => void;
  toggleTaskSelection: (taskId: string) => void;
  selectAllTasks: () => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'board' | 'list' | 'calendar' | 'analytics') => void;
  filteredTasks: UnifiedTask[];
}

const UnifiedTasksContext = createContext<UnifiedTasksContextType | undefined>(undefined);

export function UnifiedTasksProvider({ 
  children,
  objectiveId 
}: { 
  children: ReactNode;
  objectiveId?: string | null;
}) {
  const { user } = useAuth();
  const { currentBoard } = useTaskBoard();
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar' | 'analytics'>('board');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTasks = useCallback(async (objId?: string | null, boardId?: string | null) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("unified_tasks")
        .select(`
          *,
          assignees:unified_task_assignees(
            user_id,
            profiles(full_name, avatar_url)
          ),
          job:jobs!unified_tasks_job_id_fkey(id, title),
          company:companies!unified_tasks_company_id_fkey(id, name),
          marketplace_projects(title)
        `)
        .order("created_at", { ascending: false });

      if (objId) {
        query = query.eq("objective_id", objId);
      }

      const effectiveBoardId = boardId !== undefined ? boardId : currentBoard?.id;
      if (effectiveBoardId) {
        query = query.eq("board_id", effectiveBoardId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const baseTasks = (data || []) as UnifiedTask[];

      // Enrich with counts if we have tasks
      if (baseTasks.length > 0) {
        const taskIds = baseTasks.map((t) => t.id);
        const [
          { data: blockingCounts },
          { data: blockedByCounts },
          { data: subtaskRows },
          { data: commentRows },
        ] = await Promise.all([
          supabase.from("task_dependencies").select("depends_on_task_id").in("depends_on_task_id", taskIds),
          supabase.from("task_dependencies").select("task_id").in("task_id", taskIds),
          (supabase.from("unified_tasks") as any).select("parent_task_id, status").in("parent_task_id", taskIds),
          supabase.from("task_comments").select("task_id").in("task_id", taskIds),
        ]);

        const bm = new Map<string, number>();
        blockingCounts?.forEach((r: any) => bm.set(r.depends_on_task_id, (bm.get(r.depends_on_task_id) || 0) + 1));
        const bbm = new Map<string, number>();
        blockedByCounts?.forEach((r: any) => bbm.set(r.task_id, (bbm.get(r.task_id) || 0) + 1));
        const scm = new Map<string, number>();
        const sdm = new Map<string, number>();
        subtaskRows?.forEach((r: any) => {
          scm.set(r.parent_task_id, (scm.get(r.parent_task_id) || 0) + 1);
          if (r.status === "completed") sdm.set(r.parent_task_id, (sdm.get(r.parent_task_id) || 0) + 1);
        });
        const ccm = new Map<string, number>();
        commentRows?.forEach((r: any) => ccm.set(r.task_id, (ccm.get(r.task_id) || 0) + 1));

        setTasks(baseTasks.map((t) => ({
          ...t,
          blockingCount: bm.get(t.id) || 0,
          blockedByCount: bbm.get(t.id) || 0,
          subtaskCount: scm.get(t.id) || 0,
          subtaskCompleted: sdm.get(t.id) || 0,
          commentCount: ccm.get(t.id) || 0,
          project_tag: t.marketplace_projects?.title || null,
        })));
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [user, currentBoard?.id]);

  useEffect(() => {
    loadTasks(objectiveId, currentBoard?.id);
  }, [objectiveId, refreshKey, loadTasks, currentBoard?.id]);

  // Realtime subscription for the main task board
  useEffect(() => {
    const boardId = currentBoard?.id;
    const channelName = boardId ? `board-tasks-${boardId}` : 'all-tasks';
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unified_tasks',
          ...(boardId ? { filter: `board_id=eq.${boardId}` } : {}),
        },
        () => {
          setRefreshKey((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBoard?.id]);

  const refreshTasks = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<UnifiedTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    try {
      const { assignees, labels, recurrence_rule, job, company, marketplace_projects, project_tag, blockingCount, blockedByCount, subtaskCount, subtaskCompleted, commentCount, ...dbUpdates } = updates as any;
      const { error } = await supabase
        .from("unified_tasks")
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString(),
          completed_at: updates.status === 'completed' ? new Date().toISOString() : 
                        updates.status && updates.status !== 'completed' ? null : undefined
        })
        .eq("id", taskId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
      loadTasks(objectiveId);
    }
  }, [loadTasks, objectiveId]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("unified_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  }, []);

  const bulkUpdateTasks = useCallback(async (taskIds: string[], updates: Partial<UnifiedTask>) => {
    setTasks(prev => prev.map(t => 
      taskIds.includes(t.id) ? { ...t, ...updates } : t
    ));

    try {
      const { assignees, labels, recurrence_rule, job, company, marketplace_projects, project_tag, blockingCount, blockedByCount, subtaskCount, subtaskCompleted, commentCount, ...dbUpdates } = updates as any;
      const { error } = await supabase
        .from("unified_tasks")
        .update({
          ...dbUpdates,
          updated_at: new Date().toISOString(),
          completed_at: updates.status === 'completed' ? new Date().toISOString() :
                        updates.status && updates.status !== 'completed' ? null : undefined
        })
        .in("id", taskIds);

      if (error) throw error;

      toast.success(`${taskIds.length} tasks updated`);
      clearSelection();
    } catch (error) {
      console.error("Error bulk updating tasks:", error);
      toast.error("Failed to update tasks");
      loadTasks(objectiveId);
    }
  }, [loadTasks, objectiveId]);

  const bulkDeleteTasks = useCallback(async (taskIds: string[]) => {
    try {
      const { error } = await supabase
        .from("unified_tasks")
        .delete()
        .in("id", taskIds);

      if (error) throw error;

      setTasks(prev => prev.filter(t => !taskIds.includes(t.id)));
      clearSelection();
      toast.success(`${taskIds.length} tasks deleted`);
    } catch (error) {
      console.error("Error bulk deleting tasks:", error);
      toast.error("Failed to delete tasks");
    }
  }, []);

  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => new Set(prev).add(taskId));
  }, []);

  const deselectTask = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const selectAllTasks = useCallback(() => {
    setSelectedTaskIds(new Set(tasks.map(t => t.id)));
  }, [tasks]);

  const clearSelection = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setFilters({});
  }, []);

  const filteredTasks = tasks.filter(task => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.task_number.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (filters.status?.length && !filters.status.includes(task.status)) return false;
    if (filters.priority?.length && !filters.priority.includes(task.priority)) return false;

    if (filters.dateRange && task.due_date) {
      const dueDate = new Date(task.due_date);
      if (dueDate < filters.dateRange.start || dueDate > filters.dateRange.end) return false;
    }

    return true;
  });

  const value: UnifiedTasksContextType = {
    tasks,
    loading,
    selectedTaskIds,
    searchQuery,
    filters,
    viewMode,
    loadTasks,
    refreshTasks,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
    selectTask,
    deselectTask,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    setSearchQuery,
    setFilters,
    clearFilters,
    setViewMode,
    filteredTasks,
  };

  return (
    <UnifiedTasksContext.Provider value={value}>
      {children}
    </UnifiedTasksContext.Provider>
  );
}

export function useUnifiedTasks() {
  const context = useContext(UnifiedTasksContext);
  if (context === undefined) {
    throw new Error("useUnifiedTasks must be used within a UnifiedTasksProvider");
  }
  return context;
}
