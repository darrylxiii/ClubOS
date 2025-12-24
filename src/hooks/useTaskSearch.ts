import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchFilters {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  dateRange?: { start: Date; end: Date } | null;
}

interface UnifiedTask {
  id: string;
  task_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  assignees?: Array<{
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  }>;
}

export function useTaskSearch(objectiveId: string | null) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const search = useCallback(async () => {
    if (!debouncedQuery && Object.keys(filters).length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

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
        .order("created_at", { ascending: false })
        .limit(50);

      // Text search
      if (debouncedQuery) {
        query = query.or(`title.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%,task_number.ilike.%${debouncedQuery}%`);
      }

      // Objective filter
      if (objectiveId) {
        query = query.eq("objective_id", objectiveId);
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        query = query.in("priority", filters.priority);
      }

      // Date range filter
      if (filters.dateRange) {
        query = query
          .gte("due_date", filters.dateRange.start.toISOString())
          .lte("due_date", filters.dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by assignee client-side (since it's a joined table)
      let filteredData = data || [];
      if (filters.assignee && filters.assignee.length > 0) {
        filteredData = filteredData.filter(task =>
          task.assignees?.some((a: any) => filters.assignee?.includes(a.user_id))
        );
      }

      setResults(filteredData as UnifiedTask[]);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, objectiveId]);

  // Trigger search when query or filters change
  useMemo(() => {
    search();
  }, [debouncedQuery, filters, objectiveId]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setFilters({});
    setResults([]);
    setHasSearched(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    results,
    loading,
    hasSearched,
    clearSearch,
  };
}
