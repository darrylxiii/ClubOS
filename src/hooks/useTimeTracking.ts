import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useCallback, useState, useRef } from "react";

// Match new database schema
export interface TimeEntryData {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number;
  is_running: boolean;
  description: string | null;
  is_billable: boolean;
  activity_level: string | null;
  idle_seconds: number | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  // Integration fields
  contract_id?: string | null;
  company_id?: string | null;
  pilot_task_id?: string | null;
  hourly_rate?: number | null;
  earnings?: number | null;
  // Joined data
  project?: TrackingProject;
  task?: TrackingTask;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface TrackingProject {
  id: string;
  name: string;
  color: string;
  description: string | null;
  budget_hours: number | null;
  hourly_rate: number | null;
  client_id: string | null;
  is_active: boolean;
  is_billable_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingTask {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  estimated_hours: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTimerSettings {
  id: string;
  user_id: string;
  idle_threshold_minutes: number;
  auto_stop_on_idle: boolean;
  default_project_id: string | null;
  show_running_timer_header: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeStats {
  totalHours: number;
  thisWeekHours: number;
  thisMonthHours: number;
  billableHours: number;
  runningEntry: TimeEntryData | null;
}

// Format seconds to HH:MM:SS
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Convert duration_seconds to hours
export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

export function useTimeTracking() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's time entries
  const { data: myEntries = [], isLoading: loadingMyEntries } = useQuery({
    queryKey: ['time-entries', 'my', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          project:tracking_projects(*),
          task:tracking_tasks(*)
        `)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as TimeEntryData[];
    },
    enabled: !!user?.id,
  });

  // Fetch running entry specifically
  const { data: runningEntry, isLoading: loadingRunning } = useQuery({
    queryKey: ['time-entries', 'running', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          project:tracking_projects(*),
          task:tracking_tasks(*)
        `)
        .eq('user_id', user.id)
        .eq('is_running', true)
        .maybeSingle();

      if (error) throw error;
      return data as TimeEntryData | null;
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 2500,
  });

  // Fetch all projects
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['tracking-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_projects')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as TrackingProject[];
    },
  });

  // Fetch tasks for a specific project
  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tracking-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_tasks')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []) as TrackingTask[];
    },
  });

  // Fetch user timer settings
  const { data: timerSettings } = useQuery({
    queryKey: ['user-timer-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_timer_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserTimerSettings | null;
    },
    enabled: !!user?.id,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('time-entries-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['time-entries'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Calculate stats
  const calculateStats = (entries: TimeEntryData[]): TimeStats => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    
    const thisWeekSeconds = entries
      .filter(e => e.start_time && new Date(e.start_time) >= weekStart)
      .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    
    const thisMonthSeconds = entries
      .filter(e => e.start_time && new Date(e.start_time) >= monthStart)
      .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
    
    const billableSeconds = entries
      .filter(e => e.is_billable)
      .reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

    return {
      totalHours: secondsToHours(totalSeconds),
      thisWeekHours: secondsToHours(thisWeekSeconds),
      thisMonthHours: secondsToHours(thisMonthSeconds),
      billableHours: secondsToHours(billableSeconds),
      runningEntry: runningEntry || null,
    };
  };

  // Start timer mutation
  const startTimer = useMutation({
    mutationFn: async (params: {
      project_id?: string;
      task_id?: string;
      description?: string;
      is_billable?: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          project_id: params.project_id || null,
          task_id: params.task_id || null,
          description: params.description || null,
          is_billable: params.is_billable ?? true,
          start_time: new Date().toISOString(),
          is_running: true,
          duration_seconds: 0,
          source: 'timer',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Timer started');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start timer');
    },
  });

  // Stop timer mutation
  const stopTimer = useMutation({
    mutationFn: async (entryId?: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const targetId = entryId || runningEntry?.id;
      if (!targetId) throw new Error('No running timer');

      const entry = runningEntry || myEntries.find(e => e.id === targetId);
      if (!entry?.start_time) throw new Error('Invalid entry');

      const endTime = new Date();
      const startTime = new Date(entry.start_time);
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      const { error } = await supabase
        .from('time_entries')
        .update({
          is_running: false,
          end_time: endTime.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', targetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Timer stopped');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to stop timer');
    },
  });

  // Add manual entry mutation
  const addManualEntry = useMutation({
    mutationFn: async (entry: {
      start_time: string;
      end_time: string;
      project_id?: string;
      task_id?: string;
      description?: string;
      is_billable?: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const startTime = new Date(entry.start_time);
      const endTime = new Date(entry.end_time);
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      if (durationSeconds <= 0) {
        throw new Error('End time must be after start time');
      }

      // Check for overlapping entries
      const { data: overlapping } = await supabase
        .from('time_entries')
        .select('id')
        .eq('user_id', user.id)
        .or(`start_time.lte.${entry.end_time},end_time.gte.${entry.start_time}`)
        .limit(1);

      if (overlapping && overlapping.length > 0) {
        throw new Error('This time overlaps with an existing entry');
      }

      const { error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          start_time: entry.start_time,
          end_time: entry.end_time,
          duration_seconds: durationSeconds,
          project_id: entry.project_id || null,
          task_id: entry.task_id || null,
          description: entry.description || null,
          is_billable: entry.is_billable ?? true,
          is_running: false,
          source: 'manual',
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

  // Update entry mutation
  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TimeEntryData> & { id: string }) => {
      const { error } = await supabase
        .from('time_entries')
        .update({
          description: updates.description,
          project_id: updates.project_id,
          task_id: updates.task_id,
          is_billable: updates.is_billable,
          idle_seconds: updates.idle_seconds,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Entry updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update entry');
    },
  });

  // Delete entry mutation
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
      toast.success('Entry deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete entry');
    },
  });

  // Discard idle time mutation
  const discardIdleTime = useMutation({
    mutationFn: async ({ entryId, idleSeconds }: { entryId: string; idleSeconds: number }) => {
      const entry = myEntries.find(e => e.id === entryId) || runningEntry;
      if (!entry) throw new Error('Entry not found');

      const newIdleSeconds = (entry.idle_seconds || 0) + idleSeconds;
      
      const { error } = await supabase
        .from('time_entries')
        .update({
          idle_seconds: newIdleSeconds,
        })
        .eq('id', entryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Idle time discarded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to discard idle time');
    },
  });

  // Update timer settings
  const updateTimerSettings = useMutation({
    mutationFn: async (settings: Partial<UserTimerSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_timer_settings')
        .upsert({
          user_id: user.id,
          ...settings,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-timer-settings'] });
      toast.success('Settings saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  // Switch project for running timer
  const switchProject = useMutation({
    mutationFn: async ({ projectId, taskId }: { projectId: string; taskId?: string }) => {
      if (!runningEntry) throw new Error('No running timer');

      const { error } = await supabase
        .from('time_entries')
        .update({
          project_id: projectId,
          task_id: taskId || null,
        })
        .eq('id', runningEntry.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Project switched');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to switch project');
    },
  });

  return {
    myEntries,
    runningEntry,
    projects,
    tasks,
    timerSettings,
    myStats: calculateStats(myEntries),
    isLoading: loadingMyEntries || loadingRunning || loadingProjects,
    startTimer,
    stopTimer,
    addManualEntry,
    updateEntry,
    deleteEntry,
    discardIdleTime,
    updateTimerSettings,
    switchProject,
  };
}

// Hook for idle detection
export function useIdleDetection(
  isTimerRunning: boolean,
  thresholdMinutes: number = 5,
  onIdle: (idleSeconds: number) => void
) {
  const [isIdle, setIsIdle] = useState(false);
  const [idleTime, setIdleTime] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (isIdle) {
      setIsIdle(false);
      setIdleTime(0);
    }
  }, [isIdle]);

  useEffect(() => {
    if (!isTimerRunning) {
      setIsIdle(false);
      setIdleTime(0);
      return;
    }

    const handleActivity = () => resetActivity();

    // Add event listeners
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Check for idle every second
    idleCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = Math.floor((now - lastActivityRef.current) / 1000);
      const thresholdSeconds = thresholdMinutes * 60;

      if (timeSinceActivity >= thresholdSeconds && !isIdle) {
        setIsIdle(true);
        setIdleTime(timeSinceActivity);
        onIdle(timeSinceActivity);
      } else if (timeSinceActivity >= thresholdSeconds && isIdle) {
        setIdleTime(timeSinceActivity);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
      }
    };
  }, [isTimerRunning, thresholdMinutes, isIdle, onIdle, resetActivity]);

  return { isIdle, idleTime, resetActivity };
}
