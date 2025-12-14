import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  notifyNewMessage,
  notifyApplicationUpdate,
  notifyMeetingReminder,
} from '@/services/pushNotificationService';

/**
 * Hook that sets up real-time listeners for notification triggers
 * This should be used in a top-level component that's always mounted
 */
export function useNotificationTriggers() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('notification-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as any;
          
          // Don't notify for own messages
          if (message.sender_id === user.id) return;

          // Check if user is a participant in this conversation
          const { data: participant } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', message.conversation_id)
            .eq('user_id', user.id)
            .single();

          if (!participant) return;

          // Get sender name
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', message.sender_id)
            .single();

          const senderName = sender?.full_name || 'Someone';

          // Send notification
          await notifyNewMessage(
            user.id,
            senderName,
            message.content || 'Sent a message',
            message.conversation_id
          );
        }
      )
      .subscribe();

    // Subscribe to application updates
    const applicationsChannel = supabase
      .channel('notification-applications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const oldApp = payload.old as any;
          const newApp = payload.new as any;

          // Only notify if status changed
          if (oldApp.status === newApp.status) return;

          await notifyApplicationUpdate(
            user.id,
            newApp.position,
            newApp.company_name,
            newApp.status,
            newApp.id
          );
        }
      )
      .subscribe();

    // Subscribe to meeting reminders (meetings starting within 15 minutes)
    const checkMeetingReminders = async () => {
      const now = new Date();
      const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

      const { data: upcomingMeetings } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          meeting_participants!inner(user_id)
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_start', now.toISOString())
        .lte('scheduled_start', fifteenMinutesFromNow.toISOString())
        .eq('meeting_participants.user_id', user.id);

      if (upcomingMeetings?.length) {
        for (const meeting of upcomingMeetings) {
          // Check if we already sent a reminder for this meeting
          const reminderKey = `meeting-reminder-${meeting.id}`;
          if (sessionStorage.getItem(reminderKey)) continue;

          await notifyMeetingReminder(
            [user.id],
            meeting.title || 'Meeting',
            new Date(meeting.scheduled_start),
            meeting.id
          );

          // Mark as reminded
          sessionStorage.setItem(reminderKey, 'true');
        }
      }
    };

    // Check for meeting reminders every minute
    const meetingInterval = setInterval(checkMeetingReminders, 60000);
    // Also check immediately
    checkMeetingReminders();

    return () => {
      messagesChannel.unsubscribe();
      applicationsChannel.unsubscribe();
      clearInterval(meetingInterval);
    };
  }, [user?.id]);
}
