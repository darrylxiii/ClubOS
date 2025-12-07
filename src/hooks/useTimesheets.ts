import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export interface TimesheetPeriod {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  overtime_hours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'recalled';
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  approver_id: string | null;
  approver_comment: string | null;
  user_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_name?: string;
  user_email?: string;
  approver_name?: string;
}

export interface TimesheetValidation {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  missingDays: string[];
  highHoursDays: { date: string; hours: number }[];
  overlappingEntries: number;
}

export function useTimesheets(userId?: string) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);

  // Get current user if not provided
  useQuery({
    queryKey: ['current-user-for-timesheets'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      return user;
    },
    enabled: !userId,
  });

  // Fetch user's timesheets
  const { data: timesheets = [], isLoading, refetch } = useQuery({
    queryKey: ['timesheets', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      
      const { data, error } = await supabase
        .from('timesheet_periods')
        .select('*')
        .eq('user_id', currentUserId)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as TimesheetPeriod[];
    },
    enabled: !!currentUserId,
  });

  // Fetch pending approvals (for managers)
  const { data: pendingApprovals = [], isLoading: isLoadingApprovals } = useQuery({
    queryKey: ['pending-timesheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timesheet_periods')
        .select(`
          *,
          profiles!timesheet_periods_user_id_fkey(full_name, email)
        `)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true });
      
      if (error) throw error;
      return (data || []).map((ts: any) => ({
        ...ts,
        user_name: ts.profiles?.full_name,
        user_email: ts.profiles?.email,
      })) as TimesheetPeriod[];
    },
  });

  // Generate weekly timesheet
  const generateTimesheet = useMutation({
    mutationFn: async (weekStart?: Date) => {
      if (!currentUserId) throw new Error('Not authenticated');
      
      const startDate = weekStart 
        ? format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        : format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .rpc('generate_weekly_timesheet', {
          p_user_id: currentUserId,
          p_week_start: startDate,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success('Timesheet generated');
    },
    onError: (error) => {
      toast.error('Failed to generate timesheet');
      console.error(error);
    },
  });

  // Submit timesheet
  const submitTimesheet = useMutation({
    mutationFn: async ({ timesheetId, notes }: { timesheetId: string; notes?: string }) => {
      const { data, error } = await supabase
        .rpc('submit_timesheet', {
          p_timesheet_id: timesheetId,
          p_user_notes: notes || null,
        });
      
      if (error) throw error;
      if (!data) throw new Error('Failed to submit timesheet');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Timesheet submitted for approval');
    },
    onError: (error) => {
      toast.error('Failed to submit timesheet');
      console.error(error);
    },
  });

  // Recall timesheet
  const recallTimesheet = useMutation({
    mutationFn: async (timesheetId: string) => {
      const { data, error } = await supabase
        .rpc('recall_timesheet', {
          p_timesheet_id: timesheetId,
        });
      
      if (error) throw error;
      if (!data) throw new Error('Cannot recall this timesheet');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Timesheet recalled');
    },
    onError: (error) => {
      toast.error('Failed to recall timesheet');
      console.error(error);
    },
  });

  // Approve/Reject timesheet
  const processApproval = useMutation({
    mutationFn: async ({ 
      timesheetId, 
      action, 
      comment 
    }: { 
      timesheetId: string; 
      action: 'approve' | 'reject'; 
      comment?: string;
    }) => {
      const { data, error } = await supabase
        .rpc('process_timesheet_approval', {
          p_timesheet_id: timesheetId,
          p_action: action,
          p_comment: comment || null,
        });
      
      if (error) throw error;
      if (!data) throw new Error('Failed to process approval');
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['pending-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success(`Timesheet ${variables.action}d`);
    },
    onError: (error) => {
      toast.error('Failed to process approval');
      console.error(error);
    },
  });

  // Validate timesheet before submission
  const validateTimesheet = useCallback(async (timesheetId: string): Promise<TimesheetValidation> => {
    const validation: TimesheetValidation = {
      isValid: true,
      warnings: [],
      errors: [],
      missingDays: [],
      highHoursDays: [],
      overlappingEntries: 0,
    };

    // Fetch timesheet and its entries
    const { data: timesheet } = await supabase
      .from('timesheet_periods')
      .select('*')
      .eq('id', timesheetId)
      .single();

    if (!timesheet) {
      validation.errors.push('Timesheet not found');
      validation.isValid = false;
      return validation;
    }

    const { data: entries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('timesheet_period_id', timesheetId)
      .order('start_time');

    if (!entries || entries.length === 0) {
      validation.errors.push('No time entries in this period');
      validation.isValid = false;
      return validation;
    }

    // Check for missing days
    const entryDays = new Set(entries.map(e => format(new Date(e.start_time), 'yyyy-MM-dd')));
    const start = new Date(timesheet.start_date);
    const end = new Date(timesheet.end_date);
    
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      const dayStr = format(d, 'yyyy-MM-dd');
      const dayOfWeek = d.getDay();
      // Only flag weekdays (Mon-Fri)
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !entryDays.has(dayStr)) {
        validation.missingDays.push(dayStr);
        validation.warnings.push(`No entries for ${format(d, 'EEEE, MMM d')}`);
      }
    }

    // Check for high hours days
    const hoursByDay: Record<string, number> = {};
    entries.forEach(e => {
      const day = format(new Date(e.start_time), 'yyyy-MM-dd');
      hoursByDay[day] = (hoursByDay[day] || 0) + (e.duration_seconds || 0) / 3600;
    });

    Object.entries(hoursByDay).forEach(([date, hours]) => {
      if (hours > 10) {
        validation.highHoursDays.push({ date, hours: Math.round(hours * 10) / 10 });
        validation.warnings.push(`${format(new Date(date), 'EEEE, MMM d')}: ${hours.toFixed(1)} hours (unusually high)`);
      }
    });

    // Check for entries without projects
    const noProjectEntries = entries.filter(e => !e.project_id);
    if (noProjectEntries.length > 0) {
      validation.warnings.push(`${noProjectEntries.length} entries without a project assigned`);
    }

    return validation;
  }, []);

  // Get current week's timesheet or generate it
  const getCurrentWeekTimesheet = useCallback(async (): Promise<TimesheetPeriod | null> => {
    if (!currentUserId) return null;
    
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    const { data: existing } = await supabase
      .from('timesheet_periods')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('start_date', weekStart)
      .eq('end_date', weekEnd)
      .single();
    
    if (existing) return existing as TimesheetPeriod;
    
    // Generate if not exists
    const timesheetId = await generateTimesheet.mutateAsync(new Date());
    
    const { data: newTimesheet } = await supabase
      .from('timesheet_periods')
      .select('*')
      .eq('id', timesheetId)
      .single();
    
    return newTimesheet as TimesheetPeriod;
  }, [currentUserId]);

  return {
    timesheets,
    pendingApprovals,
    isLoading,
    isLoadingApprovals,
    refetch,
    generateTimesheet,
    submitTimesheet,
    recallTimesheet,
    processApproval,
    validateTimesheet,
    getCurrentWeekTimesheet,
  };
}
