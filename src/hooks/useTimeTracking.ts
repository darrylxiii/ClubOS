import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

// Match actual database schema
export interface TimeEntryData {
  id: string;
  user_id: string;
  date: string;
  hours_worked: number;
  billable_hours: number | null;
  notes: string | null;
  project_id: string | null;
  activity_level: string | null;
  idle_time_minutes: number | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface TimeStats {
  totalHours: number;
  thisWeekHours: number;
  thisMonthHours: number;
  billableHours: number;
}

export function useTimeTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's own time entries
  const { data: myEntries = [], isLoading: loadingMyEntries } = useQuery({
    queryKey: ['time-entries', 'my', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as TimeEntryData[];
    },
    enabled: !!user?.id,
  });

  // Fetch team time entries (for partners/admins) - simplified query to avoid type recursion
  const { data: teamEntries = [], isLoading: loadingTeamEntries } = useQuery({
    queryKey: ['time-entries', 'team'],
    queryFn: async () => {
      // First get time entries
      const { data: entries, error } = await supabase
        .from('time_entries')
        .select('*')
        .order('date', { ascending: false })
        .limit(200);

      if (error) throw error;
      if (!entries || entries.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(entries.map(e => e.user_id).filter(Boolean))];
      
      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return entries.map(entry => ({
        ...entry,
        user: entry.user_id ? profileMap.get(entry.user_id) : undefined
      })) as TimeEntryData[];
    },
    enabled: !!user?.id,
  });

  // Pending approvals - for this simplified version, we'll just return empty
  // since the status column doesn't exist in the actual schema
  const pendingApprovals: TimeEntryData[] = [];
  const loadingPending = false;

  // Calculate stats
  const calculateStats = (entries: TimeEntryData[]): TimeStats => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisWeekEntries = entries.filter(e => {
      const date = new Date(e.date);
      return date >= weekStart && date <= weekEnd;
    });

    const thisMonthEntries = entries.filter(e => {
      const date = new Date(e.date);
      return date >= monthStart && date <= monthEnd;
    });

    return {
      totalHours: entries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0),
      thisWeekHours: thisWeekEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0),
      thisMonthHours: thisMonthEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0),
      billableHours: entries.reduce((sum, e) => sum + Number(e.billable_hours || 0), 0),
    };
  };

  // Add time entry mutation
  const addEntry = useMutation({
    mutationFn: async (entry: {
      date: string;
      hours_worked: number;
      notes?: string;
      billable_hours?: number;
      project_id?: string;
      activity_level?: string;
      source?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          date: entry.date,
          hours_worked: entry.hours_worked,
          billable_hours: entry.billable_hours ?? entry.hours_worked,
          notes: entry.notes,
          project_id: entry.project_id,
          activity_level: entry.activity_level ?? 'high',
          source: entry.source ?? 'manual',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Time entry added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add time entry');
    },
  });

  // Update time entry
  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TimeEntryData> & { id: string }) => {
      const { error } = await supabase
        .from('time_entries')
        .update({
          hours_worked: updates.hours_worked,
          billable_hours: updates.billable_hours,
          notes: updates.notes,
          project_id: updates.project_id,
          activity_level: updates.activity_level,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Time entry updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update time entry');
    },
  });

  // Delete time entry
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Time entry deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete time entry');
    },
  });

  // Placeholder approve/reject (no-op since status column doesn't exist)
  const approveEntry = useMutation({
    mutationFn: async (id: string) => {
      toast.info('Approval feature requires database migration');
    },
  });

  const rejectEntry = useMutation({
    mutationFn: async (id: string) => {
      toast.info('Rejection feature requires database migration');
    },
  });

  return {
    myEntries,
    teamEntries,
    pendingApprovals,
    myStats: calculateStats(myEntries),
    teamStats: calculateStats(teamEntries),
    isLoading: loadingMyEntries || loadingTeamEntries || loadingPending,
    addEntry,
    updateEntry,
    deleteEntry,
    approveEntry,
    rejectEntry,
  };
}
