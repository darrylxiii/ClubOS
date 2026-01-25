import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FocusTimeBlock {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  block_type: 'focus' | 'lunch' | 'personal' | 'no_meetings' | 'deep_work';
  label: string | null;
  is_active: boolean;
  auto_detected: boolean;
  sync_to_calendar: boolean;
  calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FocusTimePreferences {
  id: string;
  user_id: string;
  enable_focus_defender: boolean;
  auto_detect_patterns: boolean;
  min_focus_block_minutes: number;
  max_daily_meetings: number;
  max_weekly_meeting_hours: number;
  preferred_meeting_hours: { start: number; end: number };
  buffer_between_meetings_minutes: number;
  protect_mornings: boolean;
  morning_end_hour: number;
  allow_override_with_reason: boolean;
  notification_when_protected: boolean;
}

export interface MeetingLoad {
  user_id: string;
  date: string;
  meeting_count: number;
  meeting_minutes: number;
  back_to_back_count: number;
  longest_meeting_minutes: number;
  focus_time_minutes: number;
  load_score: number;
  burnout_risk: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface ProtectionCheck {
  isProtected: boolean;
  blockType: string | null;
  blockLabel: string | null;
  canOverride: boolean;
  message: string | null;
  suggestedAlternative: string | null;
}

export function useFocusTimeDefender(userId?: string) {
  const queryClient = useQueryClient();

  // Fetch focus time blocks
  const {
    data: focusBlocks,
    isLoading: blocksLoading,
    error: blocksError,
  } = useQuery({
    queryKey: ['focus-time-blocks', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('focus_time_blocks')
        .select('*')
        .eq('user_id', userId)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return data as FocusTimeBlock[];
    },
    enabled: !!userId,
  });

  // Fetch preferences
  const {
    data: preferences,
    isLoading: prefsLoading,
  } = useQuery({
    queryKey: ['focus-time-preferences', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('focus_time_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      return {
        ...data,
        preferred_meeting_hours: (data.preferred_meeting_hours as { start: number; end: number }) || { start: 9, end: 17 },
      } as FocusTimePreferences;
    },
    enabled: !!userId,
  });

  // Fetch today's load
  const today = new Date().toISOString().split('T')[0];
  const {
    data: todayLoad,
    refetch: refetchLoad,
  } = useQuery({
    queryKey: ['meeting-load', userId, today],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('team_meeting_load')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as MeetingLoad | null;
    },
    enabled: !!userId,
  });

  // Create focus block mutation
  const createBlock = useMutation({
    mutationFn: async (block: Partial<FocusTimeBlock>) => {
      if (!block.day_of_week || !block.start_time || !block.end_time) {
        throw new Error('Missing required fields: day_of_week, start_time, end_time');
      }
      const { data, error } = await supabase
        .from('focus_time_blocks')
        .insert([{ 
          day_of_week: block.day_of_week,
          start_time: block.start_time,
          end_time: block.end_time,
          block_type: block.block_type || 'focus',
          label: block.label || null,
          is_active: block.is_active ?? true,
          auto_detected: block.auto_detected ?? false,
          sync_to_calendar: block.sync_to_calendar ?? true,
          user_id: userId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-time-blocks', userId] });
      toast.success('Focus block created');
    },
    onError: (error) => {
      toast.error('Failed to create focus block', { description: error.message });
    },
  });

  // Update focus block mutation
  const updateBlock = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FocusTimeBlock> & { id: string }) => {
      const { data, error } = await supabase
        .from('focus_time_blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-time-blocks', userId] });
      toast.success('Focus block updated');
    },
  });

  // Delete focus block mutation
  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('focus_time_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-time-blocks', userId] });
      toast.success('Focus block deleted');
    },
  });

  // Save preferences mutation
  const savePreferences = useMutation({
    mutationFn: async (prefs: Partial<FocusTimePreferences>) => {
      const { data, error } = await supabase
        .from('focus_time_preferences')
        .upsert([{ ...prefs, user_id: userId }], { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-time-preferences', userId] });
      toast.success('Preferences saved');
    },
  });

  // Check if time is protected
  const checkProtection = useCallback(async (proposedTime: string, duration: number = 30): Promise<ProtectionCheck> => {
    if (!userId) {
      return {
        isProtected: false,
        blockType: null,
        blockLabel: null,
        canOverride: true,
        message: null,
        suggestedAlternative: null,
      };
    }

    try {
      const { data, error } = await supabase.functions.invoke('quin-focus-defender', {
        body: {
          action: 'check_availability',
          userId,
          proposedTime,
          duration,
        },
      });

      if (error) throw error;
      return data as ProtectionCheck;
    } catch (error) {
      console.error('Protection check failed:', error);
      return {
        isProtected: false,
        blockType: null,
        blockLabel: null,
        canOverride: true,
        message: null,
        suggestedAlternative: null,
      };
    }
  }, [userId]);

  // Analyze patterns and get suggestions
  const analyzePatterns = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('quin-focus-defender', {
        body: {
          action: 'analyze_patterns',
          userId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.suggestedBlocks?.length > 0) {
        toast.success('Pattern analysis complete', {
          description: `Found ${data.suggestedBlocks.length} suggested focus blocks`,
        });
      }
    },
  });

  // Calculate meeting load
  const calculateLoad = useMutation({
    mutationFn: async (date?: string) => {
      const { data, error } = await supabase.functions.invoke('quin-focus-defender', {
        body: {
          action: 'calculate_load',
          userId,
          date: date || today,
        },
      });

      if (error) throw error;
      return data as MeetingLoad;
    },
    onSuccess: () => {
      refetchLoad();
    },
  });

  // Get blocks for a specific day
  const getBlocksForDay = useCallback((dayOfWeek: number): FocusTimeBlock[] => {
    return (focusBlocks || []).filter(block => block.day_of_week === dayOfWeek && block.is_active);
  }, [focusBlocks]);

  // Day names for display
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return {
    // Data
    focusBlocks: focusBlocks || [],
    preferences,
    todayLoad,
    
    // Loading states
    isLoading: blocksLoading || prefsLoading,
    error: blocksError,
    
    // Mutations
    createBlock,
    updateBlock,
    deleteBlock,
    savePreferences,
    analyzePatterns,
    calculateLoad,
    
    // Utilities
    checkProtection,
    getBlocksForDay,
    dayNames,
  };
}

// Hook for team load distribution
export function useTeamLoadBalance(bookingLinkId?: string) {
  const queryClient = useQueryClient();

  const {
    data: teamLoad,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['team-load', bookingLinkId],
    queryFn: async () => {
      if (!bookingLinkId) return null;
      
      const { data, error } = await supabase.functions.invoke('balance-team-meetings', {
        body: {
          action: 'get_team_load',
          bookingLinkId,
        },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!bookingLinkId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const selectHost = useMutation({
    mutationFn: async ({ proposedTime, duration, meetingType }: { proposedTime: string; duration?: number; meetingType?: string }) => {
      const { data, error } = await supabase.functions.invoke('balance-team-meetings', {
        body: {
          action: 'select_host',
          bookingLinkId,
          proposedTime,
          duration,
          meetingType,
        },
      });

      if (error) throw error;
      return data;
    },
  });

  const getRebalanceSuggestions = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('balance-team-meetings', {
        body: {
          action: 'rebalance_schedule',
          bookingLinkId,
        },
      });

      if (error) throw error;
      return data;
    },
  });

  return {
    teamLoad,
    isLoading,
    error,
    refetch,
    selectHost,
    getRebalanceSuggestions,
  };
}
