import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

interface Communication {
  id: string;
  entity_type: string;
  channel: string;
  direction: string;
  subject: string | null;
  content_preview: string | null;
  sentiment_score: number | null;
  original_timestamp: string;
  created_at: string | null;
}

interface CommunicationPreferences {
  id: string;
  user_id: string;
  preferred_channel: 'whatsapp' | 'email' | 'phone' | 'in_person';
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  receive_marketing: boolean;
  receive_job_alerts: boolean;
  receive_meeting_reminders: boolean;
  max_messages_per_day: number;
}

interface MyStrategist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
  relationship_score: number;
  response_time_hours: number;
  last_contact: string | null;
}

export function useCandidateCommunications() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [preferences, setPreferences] = useState<CommunicationPreferences | null>(null);
  const [myStrategist, setMyStrategist] = useState<MyStrategist | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMessages: 0,
    avgResponseTime: 0,
    channelBreakdown: {} as Record<string, number>,
    lastContactDate: null as string | null
  });

  const fetchCommunications = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get candidate profile
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!candidate) return;

      // Fetch communications for this candidate
      const { data: comms, error } = await supabase
        .from('unified_communications')
        .select('*')
        .eq('entity_id', candidate.id)
        .order('original_timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCommunications(comms || []);

      // Calculate stats
      if (comms && comms.length > 0) {
        const channelBreakdown: Record<string, number> = {};
        comms.forEach(c => {
          channelBreakdown[c.channel] = (channelBreakdown[c.channel] || 0) + 1;
        });

        setStats({
          totalMessages: comms.length,
          avgResponseTime: calculateAverageResponseTime(comms),
          channelBreakdown,
          lastContactDate: comms[0]?.original_timestamp || null
        });
      }
    } catch (err: any) {
      console.error('Error fetching communications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateAverageResponseTime = (comms: Communication[]): number => {
    // Sort by time ascending to trace conversation flow
    const sorted = [...comms].sort((a, b) =>
      new Date(a.original_timestamp).getTime() - new Date(b.original_timestamp).getTime()
    );

    let totalResponseTimeHours = 0;
    let responseCount = 0;
    let lastInboundTime: number | null = null;

    for (const comm of sorted) {
      if (comm.direction === 'inbound') {
        lastInboundTime = new Date(comm.original_timestamp).getTime();
      } else if (comm.direction === 'outbound' && lastInboundTime) {
        const responseTimeMs = new Date(comm.original_timestamp).getTime() - lastInboundTime;
        // Only count if response is within 7 days (ignore outliers like re-engagement after months)
        const responseTimeHours = responseTimeMs / (1000 * 60 * 60);

        if (responseTimeHours < 168) {
          totalResponseTimeHours += responseTimeHours;
          responseCount++;
        }
        lastInboundTime = null; // Reset
      }
    }

    return responseCount > 0 ? Number((totalResponseTimeHours / responseCount).toFixed(1)) : 0;
  };

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Query the existing notification_preferences table
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch notification preferences:', error.message);
        return;
      }
      
      // Map notification_preferences to CommunicationPreferences format
      if (data) {
        setPreferences({
          id: data.id,
          user_id: data.user_id,
          preferred_channel: 'email',
          quiet_hours_start: data.quiet_hours_start || '22:00',
          quiet_hours_end: data.quiet_hours_end || '08:00',
          quiet_hours_timezone: data.quiet_hours_timezone || 'Europe/Amsterdam',
          receive_marketing: data.email_system ?? true,
          receive_job_alerts: data.email_job_matches ?? true,
          receive_meeting_reminders: data.email_meetings ?? true,
          max_messages_per_day: 10,
        });
      }
    } catch (err: any) {
      console.warn('Error fetching preferences:', err);
    }
  }, []);

  const fetchMyStrategist = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get candidate's assigned strategist from applications or assignments
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!candidate) return;

      // Get relationship score
      const { data: relationship } = await supabase
        .from('communication_relationship_scores')
        .select('*, profiles:strategist_id(id, full_name, avatar_url, email)')
        .eq('entity_id', candidate.id)
        .single();

      if (relationship && relationship.profiles) {
        const profile = relationship.profiles as any;
        setMyStrategist({
          id: profile.id,
          full_name: profile.full_name || 'Your Strategist',
          avatar_url: profile.avatar_url,
          email: profile.email,
          relationship_score: relationship.health_score || 75,
          response_time_hours: relationship.avg_response_time_hours || 4,
          last_contact: (relationship as any).last_communication_at || null
        });
      }
    } catch (err: any) {
      console.error('Error fetching strategist:', err);
    }
  }, []);

  const updatePreferences = useCallback(async (updates: Partial<CommunicationPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Map CommunicationPreferences to notification_preferences schema
      const mappedUpdates: Record<string, any> = {};
      if (updates.receive_marketing !== undefined) mappedUpdates.email_system = updates.receive_marketing;
      if (updates.receive_job_alerts !== undefined) mappedUpdates.email_job_matches = updates.receive_job_alerts;
      if (updates.receive_meeting_reminders !== undefined) mappedUpdates.email_meetings = updates.receive_meeting_reminders;
      if (updates.quiet_hours_start !== undefined) mappedUpdates.quiet_hours_start = updates.quiet_hours_start;
      if (updates.quiet_hours_end !== undefined) mappedUpdates.quiet_hours_end = updates.quiet_hours_end;
      if (updates.quiet_hours_timezone !== undefined) mappedUpdates.quiet_hours_timezone = updates.quiet_hours_timezone;

      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('notification_preferences')
          .update(mappedUpdates)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id, ...mappedUpdates });

        if (error) throw error;
      }

      await fetchPreferences();
      notify.success('Preferences updated');
    } catch (err: any) {
      notify.error('Failed to update preferences', { description: err.message });
    }
  }, [preferences, fetchPreferences]);

  useEffect(() => {
    fetchCommunications();
    fetchPreferences();
    fetchMyStrategist();
  }, [fetchCommunications, fetchPreferences, fetchMyStrategist]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('candidate-communications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'unified_communications'
        },
        () => {
          fetchCommunications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCommunications]);

  return {
    communications,
    preferences,
    myStrategist,
    stats,
    loading,
    updatePreferences,
    refetch: fetchCommunications
  };
}
