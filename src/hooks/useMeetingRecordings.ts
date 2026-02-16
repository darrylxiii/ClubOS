import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MeetingRecordingExtended {
  id: string;
  meeting_id: string | null;
  live_channel_id: string | null;
  conversation_id: string | null;
  candidate_id: string | null;
  application_id: string | null;
  job_id: string | null;
  host_id: string;
  title: string | null;
  recording_url: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  mime_type: string | null;
  source_type: 'tqc_meeting' | 'live_hub' | 'conversation_call' | 'fathom';
  transcript: string | null;
  transcript_json: any;
  ai_analysis: any;
  executive_summary: string | null;
  action_items: any;
  key_moments: any;
  skills_assessed: any;
  participants: any;
  processing_status: 'pending' | 'uploading' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
  processing_error: string | null;
  recording_consent_at: string | null;
  is_private: boolean;
  deleted_at: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  meeting?: {
    title: string;
    meeting_code: string;
    scheduled_start: string;
    meeting_type: string | null;
  };
  live_channel?: {
    name: string;
  };
}

interface UseMeetingRecordingsOptions {
  sourceType?: 'all' | 'tqc_meeting' | 'live_hub' | 'conversation_call' | 'fathom';
  limit?: number;
  includeDeleted?: boolean;
}

export function useMeetingRecordings(options: UseMeetingRecordingsOptions = {}) {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<MeetingRecordingExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { sourceType = 'all', limit = 50, includeDeleted = false } = options;

  const loadRecordings = useCallback(async () => {
    if (!user) {
      setRecordings([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('meeting_recordings_extended')
        .select(`
          *,
          meeting:meetings(title, meeting_code, scheduled_start, meeting_type),
          live_channel:live_channels(name)
        `)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      // Filter by source type
      if (sourceType !== 'all') {
        query = query.eq('source_type', sourceType);
      }

      // Exclude deleted unless explicitly requested
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setRecordings((data || []) as MeetingRecordingExtended[]);
    } catch (err: unknown) {
      console.error('[useMeetingRecordings] Error loading recordings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recordings');
      setRecordings([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, sourceType, limit, includeDeleted]);

  // Initial load
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('meeting-recordings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_recordings_extended'
        },
        () => {
          loadRecordings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadRecordings]);

  // Delete recording (soft delete)
  const deleteRecording = useCallback(async (recordingId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('meeting_recordings_extended')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', recordingId);

      if (error) throw error;

      // Update local state
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      return true;
    } catch (err: unknown) {
      console.error('[useMeetingRecordings] Error deleting recording:', err);
      return false;
    }
  }, [user]);

  // Permanently delete recording (admin only)
  const permanentlyDeleteRecording = useCallback(async (recordingId: string) => {
    if (!user) return false;

    try {
      // Get storage path first
      const recording = recordings.find(r => r.id === recordingId);
      
      if (recording?.storage_path) {
        // Delete from storage
        await supabase.storage
          .from('meeting-recordings')
          .remove([recording.storage_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('meeting_recordings_extended')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      // Update local state
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      return true;
    } catch (err: unknown) {
      console.error('[useMeetingRecordings] Error permanently deleting recording:', err);
      return false;
    }
  }, [user, recordings]);

  // Restore soft-deleted recording
  const restoreRecording = useCallback(async (recordingId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('meeting_recordings_extended')
        .update({
          deleted_at: null,
          deleted_by: null
        })
        .eq('id', recordingId);

      if (error) throw error;

      loadRecordings();
      return true;
    } catch (err: unknown) {
      console.error('[useMeetingRecordings] Error restoring recording:', err);
      return false;
    }
  }, [user, loadRecordings]);

  return {
    recordings,
    isLoading,
    error,
    refresh: loadRecordings,
    deleteRecording,
    permanentlyDeleteRecording,
    restoreRecording
  };
}
