import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AgendaItem {
  id: string;
  meeting_id: string;
  item_order: number;
  title: string;
  description?: string;
  allocated_minutes: number;
  actual_minutes?: number;
  started_at?: string;
  completed_at?: string;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  notes?: string;
  ai_summary?: string;
}

export interface AgendaProgress {
  completed: number;
  total: number;
  completedMinutes: number;
  totalAllocated: number;
}

export function useMeetingAgenda(meetingId: string | null) {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [activeItem, setActiveItem] = useState<AgendaItem | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isOverTime, setIsOverTime] = useState(false);
  const [progress, setProgress] = useState<AgendaProgress>({ completed: 0, total: 0, completedMinutes: 0, totalAllocated: 0 });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch agenda status
  const fetchAgenda = useCallback(async () => {
    if (!meetingId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('track-meeting-agenda', {
        body: { action: 'get_status', meetingId }
      });

      if (error) throw error;

      setAgenda(data.agenda || []);
      setActiveItem(data.activeItem || null);
      setTimeRemaining(data.timeRemaining);
      setIsOverTime(data.isOverTime || false);
      setProgress(data.progress || { completed: 0, total: 0, completedMinutes: 0, totalAllocated: 0 });
    } catch (error) {
      console.error('Failed to fetch agenda:', error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  // Create agenda
  const createAgenda = useCallback(async (items: Array<{ title: string; minutes: number; description?: string }>) => {
    if (!meetingId) return;

    try {
      const { data, error } = await supabase.functions.invoke('track-meeting-agenda', {
        body: { action: 'create', meetingId, agendaItems: items }
      });

      if (error) throw error;

      await fetchAgenda();
      return data.agenda;
    } catch (error) {
      console.error('Failed to create agenda:', error);
    }
  }, [meetingId, fetchAgenda]);

  // Start an agenda item
  const startItem = useCallback(async (itemId: string) => {
    if (!meetingId) return;

    try {
      const { error } = await supabase.functions.invoke('track-meeting-agenda', {
        body: { action: 'start_item', meetingId, itemId }
      });

      if (error) throw error;

      await fetchAgenda();
    } catch (error) {
      console.error('Failed to start item:', error);
    }
  }, [meetingId, fetchAgenda]);

  // Complete current item
  const completeItem = useCallback(async (itemId: string) => {
    if (!meetingId) return;

    try {
      const { data, error } = await supabase.functions.invoke('track-meeting-agenda', {
        body: { action: 'complete_item', meetingId, itemId }
      });

      if (error) throw error;

      await fetchAgenda();
      return data;
    } catch (error) {
      console.error('Failed to complete item:', error);
    }
  }, [meetingId, fetchAgenda]);

  // Skip an item
  const skipItem = useCallback(async (itemId: string) => {
    if (!meetingId) return;

    try {
      const { error } = await supabase.functions.invoke('track-meeting-agenda', {
        body: { action: 'skip_item', meetingId, itemId }
      });

      if (error) throw error;

      await fetchAgenda();
    } catch (error) {
      console.error('Failed to skip item:', error);
    }
  }, [meetingId, fetchAgenda]);

  // Detect topic change from transcript
  const detectTopicChange = useCallback(async (transcript: string) => {
    if (!meetingId) return null;

    try {
      const { data, error } = await supabase.functions.invoke('track-meeting-agenda', {
        body: { action: 'detect_topic', meetingId, currentTranscript: transcript }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to detect topic:', error);
      return null;
    }
  }, [meetingId]);

  // Update time remaining every minute
  useEffect(() => {
    if (!activeItem?.started_at || !activeItem?.allocated_minutes) return;

    const updateTime = () => {
      const startTime = new Date(activeItem.started_at!);
      const elapsed = (Date.now() - startTime.getTime()) / 60000;
      const remaining = Math.round(activeItem.allocated_minutes - elapsed);
      setTimeRemaining(remaining);
      setIsOverTime(remaining < 0);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [activeItem]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!meetingId) return;

    fetchAgenda();

    const channel = supabase
      .channel(`meeting-agenda-${meetingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_agenda_items',
          filter: `meeting_id=eq.${meetingId}`
        },
        () => {
          fetchAgenda();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, fetchAgenda]);

  return {
    agenda,
    activeItem,
    timeRemaining,
    isOverTime,
    progress,
    isLoading,
    fetchAgenda,
    createAgenda,
    startItem,
    completeItem,
    skipItem,
    detectTopicChange
  };
}
