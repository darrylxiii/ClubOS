import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateMeetingMessageParams {
  conversationId: string;
  meetingId: string;
  systemMessageType: 'meeting_created' | 'meeting_scheduled' | 'meeting_started' | 'meeting_ended' | 'call_started' | 'call_ended' | 'participant_joined' | 'participant_left';
  content: string;
  metadata?: Record<string, any>;
}

export const useMeetingMessages = () => {
  const createMeetingMessage = useCallback(async ({
    conversationId,
    meetingId,
    systemMessageType,
    content,
    metadata = {}
  }: CreateMeetingMessageParams) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          content,
          message_type: 'system',
          system_message_type: systemMessageType,
          meeting_id: meetingId,
          metadata: {
            ...metadata,
            is_meeting_system_message: true
          }
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error creating meeting message:', error);
      toast.error('Failed to create meeting notification');
    }
  }, []);

  const notifyMeetingCreated = useCallback(async (
    conversationId: string,
    meetingId: string,
    meetingTitle: string,
    userName: string
  ) => {
    await createMeetingMessage({
      conversationId,
      meetingId,
      systemMessageType: 'meeting_created',
      content: `${userName} created an instant meeting: ${meetingTitle}`,
      metadata: { meeting_title: meetingTitle, user_name: userName }
    });
  }, [createMeetingMessage]);

  const notifyCallStarted = useCallback(async (
    conversationId: string,
    meetingId: string,
    callType: 'audio' | 'video',
    userName: string
  ) => {
    await createMeetingMessage({
      conversationId,
      meetingId,
      systemMessageType: 'call_started',
      content: `${userName} started a ${callType} call`,
      metadata: { call_type: callType, user_name: userName }
    });
  }, [createMeetingMessage]);

  const notifyCallEnded = useCallback(async (
    conversationId: string,
    meetingId: string,
    duration: string
  ) => {
    await createMeetingMessage({
      conversationId,
      meetingId,
      systemMessageType: 'call_ended',
      content: `Call ended • Duration: ${duration}`,
      metadata: { duration }
    });
  }, [createMeetingMessage]);

  return {
    createMeetingMessage,
    notifyMeetingCreated,
    notifyCallStarted,
    notifyCallEnded
  };
};
