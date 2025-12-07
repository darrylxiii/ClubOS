import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export interface TimeEntryData {
  id: string;
  user_id: string;
  date: string;
  hours_worked: number;
  billable_hours: number | null;
  hourly_rate: number | null;
  total_amount: number | null;
  task_description: string | null;
  notes: string | null;
  is_billable: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'disputed' | 'invoiced' | 'paid';
  approved_by: string | null;
  approved_at: string | null;
  tags: string[];
  start_time: string | null;
  end_time: string | null;
  entry_type: string;
  project_id: string | null;
  contract_id: string | null;
  company_id: string | null;
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
  totalEarnings: number;
  thisWeekHours: number;
  thisMonthHours: number;
  pendingApprovals: number;
  approvedHours: number;
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
      return data as TimeEntryData[];
    },
    enabled: !!user?.id,
  });

  // Fetch team time entries (for partners/admins)
  const { data: teamEntries = [], isLoading: loadingTeamEntries } = useQuery({
    queryKey: ['time-entries', 'team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .order('date', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []).map(entry => ({
        ...entry,
        user: entry.profiles
      })) as TimeEntryData[];
    },
    enabled: !!user?.id,
  });

  // Fetch pending approvals
  const { data: pendingApprovals = [], isLoading: loadingPending } = useQuery({
    queryKey: ['time-entries', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []).map(entry => ({
        ...entry,
        user: entry.profiles
      })) as TimeEntryData[];
    },
    enabled: !!user?.id,
  });

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

    const approvedEntries = entries.filter(e => e.status === 'approved');
    const pendingEntries = entries.filter(e => e.status === 'pending');

    return {
      totalHours: entries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0),
      totalEarnings: entries.reduce((sum, e) => sum + Number(e.total_amount || 0), 0),
      thisWeekHours: thisWeekEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0),
      thisMonthHours: thisMonthEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0),
      pendingApprovals: pendingEntries.length,
      approvedHours: approvedEntries.reduce((sum, e) => sum + Number(e.hours_worked || 0), 0),
    };
  };

  // Add time entry mutation
  const addEntry = useMutation({
    mutationFn: async (entry: {
      date: string;
      hours_worked: number;
      task_description?: string;
      notes?: string;
      is_billable?: boolean;
      hourly_rate?: number;
      entry_type?: string;
      start_time?: string;
      end_time?: string;
      tags?: string[];
      project_id?: string;
      contract_id?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const totalAmount = entry.hourly_rate 
        ? entry.hours_worked * entry.hourly_rate 
        : 0;

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          date: entry.date,
          hours_worked: entry.hours_worked,
          billable_hours: entry.is_billable !== false ? entry.hours_worked : 0,
          task_description: entry.task_description,
          notes: entry.notes,
          is_billable: entry.is_billable ?? true,
          hourly_rate: entry.hourly_rate ?? 0,
          total_amount: totalAmount,
          entry_type: entry.entry_type ?? 'work',
          start_time: entry.start_time,
          end_time: entry.end_time,
          tags: entry.tags ?? [],
          project_id: entry.project_id,
          contract_id: entry.contract_id,
          status: 'pending',
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
        .update(updates)
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

  // Approve time entry
  const approveEntry = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_entries')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Time entry approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve time entry');
    },
  });

  // Reject time entry
  const rejectEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_entries')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Time entry rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject time entry');
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
