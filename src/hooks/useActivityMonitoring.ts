import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ActivitySample {
  mouseEvents: number;
  keyboardEvents: number;
  activeSeconds: number;
  timestamp: Date;
}

interface PrivacySettings {
  id: string;
  user_id: string;
  activity_tracking_enabled: boolean;
  screenshots_enabled: boolean;
  screenshot_interval_minutes: number;
  screenshot_blur_level: 'none' | 'partial' | 'full';
  app_monitoring_enabled: boolean;
  url_tracking_enabled: boolean;
  data_retention_days: number;
  domain_whitelist: string[];
  domain_blacklist: string[];
  consent_given_at: string | null;
}

interface ActivityMonitoringState {
  isTracking: boolean;
  currentSample: ActivitySample;
  activityPercentage: number;
}

const DEBOUNCE_MS = 100;
const SAMPLE_INTERVAL_MS = 60000; // 1 minute
const ACTIVITY_WINDOW_MS = 1000; // 1 second chunks for activity calculation

/**
 * Hook for real-time activity monitoring with privacy-first design
 * Tracks mouse/keyboard events (counts only, no content) and calculates activity percentage
 */
export function useActivityMonitoring(timeEntryId: string | null, enabled: boolean = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Refs for tracking without re-renders
  const mouseEventsRef = useRef(0);
  const keyboardEventsRef = useRef(0);
  const activeSecondsRef = useRef(0);
  const lastActivityRef = useRef<number>(Date.now());
  const sampleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimersRef = useRef<{ mouse: NodeJS.Timeout | null; keyboard: NodeJS.Timeout | null }>({
    mouse: null,
    keyboard: null,
  });

  // State for UI display
  const [state, setState] = useState<ActivityMonitoringState>({
    isTracking: false,
    currentSample: {
      mouseEvents: 0,
      keyboardEvents: 0,
      activeSeconds: 0,
      timestamp: new Date(),
    },
    activityPercentage: 0,
  });

  // Fetch privacy settings
  const { data: privacySettings } = useQuery({
    queryKey: ['privacy-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // First try to get existing settings
      const { data, error } = await supabase
        .from('productivity_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching privacy settings:', error);
        return null;
      }

      // If no settings exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('productivity_privacy_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating privacy settings:', insertError);
          return null;
        }
        return newData as PrivacySettings;
      }

      return data as PrivacySettings;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to store activity sample
  const storeSample = useMutation({
    mutationFn: async (sample: {
      time_entry_id: string;
      mouse_events: number;
      keyboard_events: number;
      activity_percentage: number;
    }) => {
      if (!user?.id) throw new Error('No user');
      
      const { error } = await supabase
        .from('activity_samples')
        .insert({
          ...sample,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-samples'] });
    },
    onError: (error) => {
      console.error('Failed to store activity sample:', error);
    },
  });

  // Update privacy settings mutation
  const updatePrivacySettings = useMutation({
    mutationFn: async (updates: Partial<PrivacySettings>) => {
      if (!user?.id) throw new Error('No user');
      
      const { error } = await supabase
        .from('productivity_privacy_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy-settings'] });
    },
  });

  // Calculate activity percentage: (active_seconds / 60) * 100
  const calculateActivityPercentage = useCallback(() => {
    const percentage = Math.min(100, Math.round((activeSecondsRef.current / 60) * 100));
    return percentage;
  }, []);

  // Debounced mouse event handler
  const handleMouseMove = useCallback(() => {
    if (debounceTimersRef.current.mouse) {
      clearTimeout(debounceTimersRef.current.mouse);
    }
    
    debounceTimersRef.current.mouse = setTimeout(() => {
      mouseEventsRef.current += 1;
      lastActivityRef.current = Date.now();
    }, DEBOUNCE_MS);
  }, []);

  // Debounced keyboard event handler
  const handleKeyDown = useCallback(() => {
    if (debounceTimersRef.current.keyboard) {
      clearTimeout(debounceTimersRef.current.keyboard);
    }
    
    debounceTimersRef.current.keyboard = setTimeout(() => {
      keyboardEventsRef.current += 1;
      lastActivityRef.current = Date.now();
    }, DEBOUNCE_MS);
  }, []);

  // Check for activity every second and increment activeSeconds if user was active
  const checkActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    // If activity happened within the last second, count this second as active
    if (timeSinceLastActivity < ACTIVITY_WINDOW_MS) {
      activeSecondsRef.current = Math.min(60, activeSecondsRef.current + 1);
    }
    
    // Update state for UI
    const percentage = calculateActivityPercentage();
    setState(prev => ({
      ...prev,
      activityPercentage: percentage,
      currentSample: {
        mouseEvents: mouseEventsRef.current,
        keyboardEvents: keyboardEventsRef.current,
        activeSeconds: activeSecondsRef.current,
        timestamp: new Date(),
      },
    }));
  }, [calculateActivityPercentage]);

  // Store sample and reset counters every minute
  const flushSample = useCallback(() => {
    if (!timeEntryId || !privacySettings?.activity_tracking_enabled) return;
    
    const activityPercentage = calculateActivityPercentage();
    
    // Only store if there was any activity
    if (mouseEventsRef.current > 0 || keyboardEventsRef.current > 0 || activityPercentage > 0) {
      // Use requestIdleCallback for non-blocking storage
      const storeCallback = () => {
        storeSample.mutate({
          time_entry_id: timeEntryId,
          mouse_events: mouseEventsRef.current,
          keyboard_events: keyboardEventsRef.current,
          activity_percentage: activityPercentage,
        });
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(storeCallback, { timeout: 5000 });
      } else {
        setTimeout(storeCallback, 0);
      }
    }
    
    // Reset counters for next sample period
    mouseEventsRef.current = 0;
    keyboardEventsRef.current = 0;
    activeSecondsRef.current = 0;
  }, [timeEntryId, privacySettings?.activity_tracking_enabled, calculateActivityPercentage, storeSample]);

  // Start/stop tracking based on timeEntryId and privacy settings
  useEffect(() => {
    const shouldTrack = enabled && 
                        !!timeEntryId && 
                        !!user?.id && 
                        privacySettings?.activity_tracking_enabled !== false;

    if (shouldTrack) {
      // Add event listeners
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('keydown', handleKeyDown, { passive: true });
      document.addEventListener('click', handleMouseMove, { passive: true });
      document.addEventListener('scroll', handleMouseMove, { passive: true });
      document.addEventListener('touchstart', handleMouseMove, { passive: true });
      document.addEventListener('touchmove', handleMouseMove, { passive: true });

      // Start activity check interval (every second)
      activityCheckIntervalRef.current = setInterval(checkActivity, 1000);

      // Start sample flush interval (every minute)
      sampleIntervalRef.current = setInterval(flushSample, SAMPLE_INTERVAL_MS);

      setState(prev => ({ ...prev, isTracking: true }));

      return () => {
        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('click', handleMouseMove);
        document.removeEventListener('scroll', handleMouseMove);
        document.removeEventListener('touchstart', handleMouseMove);
        document.removeEventListener('touchmove', handleMouseMove);

        // Clear intervals
        if (activityCheckIntervalRef.current) {
          clearInterval(activityCheckIntervalRef.current);
        }
        if (sampleIntervalRef.current) {
          clearInterval(sampleIntervalRef.current);
        }

        // Flush any remaining sample data
        flushSample();

        setState(prev => ({ ...prev, isTracking: false }));
      };
    } else {
      setState(prev => ({ ...prev, isTracking: false }));
    }
  }, [enabled, timeEntryId, user?.id, privacySettings?.activity_tracking_enabled, handleMouseMove, handleKeyDown, checkActivity, flushSample]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimersRef.current.mouse) {
        clearTimeout(debounceTimersRef.current.mouse);
      }
      if (debounceTimersRef.current.keyboard) {
        clearTimeout(debounceTimersRef.current.keyboard);
      }
    };
  }, []);

  // Give consent for tracking
  const giveConsent = useCallback(() => {
    if (!user?.id) return;
    updatePrivacySettings.mutate({
      consent_given_at: new Date().toISOString(),
    });
  }, [user?.id, updatePrivacySettings]);

  return {
    // State
    isTracking: state.isTracking,
    activityPercentage: state.activityPercentage,
    currentSample: state.currentSample,
    
    // Privacy settings
    privacySettings,
    hasConsent: !!privacySettings?.consent_given_at,
    
    // Actions
    giveConsent,
    updatePrivacySettings: updatePrivacySettings.mutate,
    
    // Loading states
    isUpdatingSettings: updatePrivacySettings.isPending,
  };
}

/**
 * Hook to fetch activity samples for a time entry
 */
export function useActivitySamples(timeEntryId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activity-samples', timeEntryId],
    queryFn: async () => {
      if (!timeEntryId || !user?.id) return [];

      const { data, error } = await supabase
        .from('activity_samples')
        .select('*')
        .eq('time_entry_id', timeEntryId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!timeEntryId && !!user?.id,
  });
}

/**
 * Hook to get aggregated activity stats for a date range
 */
export function useActivityStats(startDate: Date, endDate: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['activity-stats', user?.id, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('activity_samples')
        .select('activity_percentage, timestamp')
        .eq('user_id', user.id)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          averageActivity: 0,
          totalSamples: 0,
          highActivityMinutes: 0,
          mediumActivityMinutes: 0,
          lowActivityMinutes: 0,
        };
      }

      const totalPercentage = data.reduce((sum, s) => sum + (s.activity_percentage || 0), 0);
      const averageActivity = Math.round(totalPercentage / data.length);

      return {
        averageActivity,
        totalSamples: data.length,
        highActivityMinutes: data.filter(s => s.activity_percentage >= 60).length,
        mediumActivityMinutes: data.filter(s => s.activity_percentage >= 30 && s.activity_percentage < 60).length,
        lowActivityMinutes: data.filter(s => s.activity_percentage < 30).length,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
