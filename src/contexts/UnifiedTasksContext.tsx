import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  time_tracked_minutes?: number | null;
  timer_running?: boolean | null;
  timer_started_at?: string | null;
  is_overdue?: boolean | null;
  recurrence_rule?: unknown | null;
  assignees?: Array<{
    user_id: string;
    profiles: { full_name: string; avatar_url?: string | null };
  }>;
  labels?: Array<{ id: string; name: string; color: string }>;
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
  // Data
  tasks: UnifiedTask[];
  loading: boolean;
  selectedTaskIds: Set<string>;
  searchQuery: string;
  filters: SearchFilters;
  viewMode: 'board' | 'list' | 'calendar' | 'analytics';
  
  // Actions
  loadTasks: (objectiveId?: string | null) => Promise<void>;
  refreshTasks: () => void;
  updateTask: (taskId: string, updates: Partial<UnifiedTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  bulkUpdateTasks: (taskIds: string[], updates: Partial<UnifiedTask>) => Promise<void>;
  bulkDeleteTasks: (taskIds: string[]) => Promise<void>;
  
  // Selection
  selectTask: (taskId: string) => void;
  deselectTask: (taskId: string) => void;
  toggleTaskSelection: (taskId: string) => void;
  selectAllTasks: () => void;
  clearSelection: () => void;
  
  // Search & Filter
  setSearchQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  
  // View
  setViewMode: (mode: 'board' | 'list' | 'calendar' | 'analytics') => void;
  
  // Filtered data
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
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'calendar' | 'analytics'>('board');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTasks = useCallback(async (objId?: string | null) => {
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
          )
        `)
        .order("created_at", { ascending: false });

      if (objId) {
        query = query.eq("objective_id", objId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTasks((data || []) as UnifiedTask[]);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks(objectiveId);
  }, [objectiveId, refreshKey, loadTasks]);

  const refreshTasks = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<UnifiedTask>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { assignees, labels, recurrence_rule, ...dbUpdates } = updates;
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
      loadTasks(objectiveId); // Revert on error
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
    // Optimistic update
    setTasks(prev => prev.map(t => 
      taskIds.includes(t.id) ? { ...t, ...updates } : t
    ));

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { assignees, labels, recurrence_rule, ...dbUpdates } = updates;
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

  // Selection handlers
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
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
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

  // Filtered tasks
  const filteredTasks = tasks.filter(task => {
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.task_number.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status?.length && !filters.status.includes(task.status)) {
      return false;
    }

    // Priority filter
    if (filters.priority?.length && !filters.priority.includes(task.priority)) {
      return false;
    }

    // Date range filter
    if (filters.dateRange && task.due_date) {
      const dueDate = new Date(task.due_date);
      if (dueDate < filters.dateRange.start || dueDate > filters.dateRange.end) {
        return false;
      }
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
