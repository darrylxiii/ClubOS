import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface ConflictEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  source: 'booking' | 'calendar';
  guestName?: string;
}

export interface SchedulingConflict {
  id: string;
  user_id: string;
  conflict_type: 'double_booking' | 'overlap' | 'travel_time' | 'timezone_issue' | 'buffer_violation';
  severity: 'warning' | 'error' | 'critical';
  involved_bookings: string[];
  involved_calendar_events: ConflictEvent[];
  proposed_solutions: ResolutionOption[];
  selected_solution_index?: number;
  status: 'pending' | 'resolved' | 'ignored' | 'escalated';
  resolved_at?: string;
  created_at: string;
}

export interface ResolutionOption {
  option_id: string;
  title: string;
  description: string;
  action_type: 'reschedule' | 'cancel' | 'shorten' | 'merge' | 'accept';
  affected_events: string[];
  new_time?: string;
  disruption_score: number;
  acceptance_probability: number;
}

// Helper to safely parse JSONB arrays
function parseJsonArray<T>(json: Json | null, validator: (item: unknown) => item is T): T[] {
  if (!Array.isArray(json)) return [];
  return json.filter(validator) as T[];
}

function isConflictEvent(item: unknown): item is ConflictEvent {
  return typeof item === 'object' && item !== null && 
    'id' in item && 'title' in item && 'start' in item && 'end' in item && 'source' in item;
}

function isResolutionOption(item: unknown): item is ResolutionOption {
  return typeof item === 'object' && item !== null &&
    'option_id' in item && 'title' in item && 'action_type' in item;
}

export function useConflictResolution() {
  const { user } = useAuth();
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const fetchConflicts = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduling_conflicts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type-safe transformation with proper validators
      const typedConflicts: SchedulingConflict[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        conflict_type: item.conflict_type as SchedulingConflict['conflict_type'],
        severity: item.severity as SchedulingConflict['severity'],
        involved_bookings: Array.isArray(item.involved_bookings) 
          ? (item.involved_bookings as string[])
          : [],
        involved_calendar_events: parseJsonArray(item.involved_calendar_events, isConflictEvent),
        proposed_solutions: parseJsonArray(item.proposed_solutions, isResolutionOption),
        selected_solution_index: item.selected_solution_index ?? undefined,
        status: item.status as SchedulingConflict['status'],
        resolved_at: item.resolved_at ?? undefined,
        created_at: item.created_at
      }));
      
      setConflicts(typedConflicts);
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const detectConflicts = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-scheduling-conflict', {
        body: {
          action: 'detect',
          conflictDetails: { userId: user.id }
        }
      });

      if (error) throw error;

      if (data.conflicts_found > 0) {
        toast.warning(`Found ${data.conflicts_found} scheduling conflict${data.conflicts_found > 1 ? 's' : ''}`);
        await fetchConflicts();
      } else {
        toast.success('No scheduling conflicts detected');
      }

      return data;
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
      toast.error('Failed to check for conflicts');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, fetchConflicts]);

  const proposeResolutions = useCallback(async (conflict: SchedulingConflict) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-scheduling-conflict', {
        body: {
          action: 'propose',
          conflictDetails: {
            conflictId: conflict.id,
            userId: conflict.user_id,
            involvedBookings: conflict.involved_bookings,
            involvedCalendarEvents: conflict.involved_calendar_events,
            conflictType: conflict.conflict_type
          }
        }
      });

      if (error) throw error;
      
      // Refresh conflicts to get updated solutions
      await fetchConflicts();
      
      return data.options as ResolutionOption[];
    } catch (error) {
      console.error('Failed to propose resolutions:', error);
      toast.error('Failed to generate resolution options');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [fetchConflicts]);

  const resolveConflict = useCallback(async (conflictId: string, solution: ResolutionOption) => {
    setIsResolving(true);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-scheduling-conflict', {
        body: {
          action: 'resolve',
          conflictDetails: { conflictId },
          selectedSolution: solution
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.result.message || 'Conflict resolved');
        await fetchConflicts();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      toast.error('Failed to resolve conflict');
      return false;
    } finally {
      setIsResolving(false);
    }
  }, [fetchConflicts]);

  const ignoreConflict = useCallback(async (conflictId: string) => {
    try {
      const { error } = await supabase
        .from('scheduling_conflicts')
        .update({ status: 'ignored' })
        .eq('id', conflictId);

      if (error) throw error;

      toast.info('Conflict ignored');
      await fetchConflicts();
      return true;
    } catch (error) {
      console.error('Failed to ignore conflict:', error);
      return false;
    }
  }, [fetchConflicts]);

  const autoResolve = useCallback(async () => {
    if (!user?.id) return;

    setIsResolving(true);
    try {
      const { data, error } = await supabase.functions.invoke('resolve-scheduling-conflict', {
        body: {
          action: 'auto-resolve',
          conflictDetails: { userId: user.id }
        }
      });

      if (error) throw error;

      if (data.resolved > 0) {
        toast.success(`Auto-resolved ${data.resolved} conflict${data.resolved > 1 ? 's' : ''}`);
        await fetchConflicts();
      }

      return data;
    } catch (error) {
      console.error('Failed to auto-resolve:', error);
      toast.error('Failed to auto-resolve conflicts');
    } finally {
      setIsResolving(false);
    }
  }, [user?.id, fetchConflicts]);

  return {
    conflicts,
    isLoading,
    isResolving,
    fetchConflicts,
    detectConflicts,
    proposeResolutions,
    resolveConflict,
    ignoreConflict,
    autoResolve
  };
}
