import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Communication {
  id: string;
  entity_type: string;
  channel: string;
  direction: string;
  subject: string | null;
  content_preview: string | null;
  sentiment_score: number | null;
  original_timestamp: string;
  created_at: string;
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
  const { toast } = useToast();

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
          avgResponseTime: 4.2, // TODO: Calculate from response_time_seconds
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

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use type assertion since table is newly created
      const { data, error } = await (supabase as any)
        .from('candidate_communication_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setPreferences(data as CommunicationPreferences | null);
    } catch (err: any) {
      console.error('Error fetching preferences:', err);
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

      // Use type assertion since table is newly created
      const client = supabase as any;

      if (preferences) {
        // Update existing
        const { error } = await client
          .from('candidate_communication_preferences')
          .update(updates)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await client
          .from('candidate_communication_preferences')
          .insert({ user_id: user.id, ...updates });

        if (error) throw error;
      }

      await fetchPreferences();
      toast({ title: 'Preferences updated' });
    } catch (err: any) {
      toast({ title: 'Failed to update preferences', description: err.message, variant: 'destructive' });
    }
  }, [preferences, fetchPreferences, toast]);

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
