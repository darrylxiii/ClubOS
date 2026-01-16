import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { MeetingInvitationCard } from './MeetingInvitationCard';
import { notificationSoundManager } from '@/lib/sounds/NotificationSoundManager';
import { useQuery } from '@tanstack/react-query';

interface MeetingInvitation {
  id: string;
  meeting_id: string;
  inviter_id: string;
  inviter_name?: string;
  inviter_avatar?: string;
  meeting_title: string;
  meeting_start_time: string;
  meeting_duration_minutes?: number;
  status: string;
  created_at: string;
}

export function MeetingNotificationManager() {
  const [activeInvitations, setActiveInvitations] = useState<MeetingInvitation[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Fetch user preferences
  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return data;
    },
  });

  // Load pending invitations
  useEffect(() => {
    const loadInvitations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      type InvitationRow = {
        id: string;
        meeting_id: string;
        inviter_id: string;
        status: string;
        created_at: string;
      };

      const baseQuery = supabase.from('meeting_invitations') as any;

      const result = await baseQuery
        .select('id, meeting_id, inviter_id, status, created_at')
        .eq('invitee_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const data = result.data as InvitationRow[] | null;
      const error = result.error;

      if (error || !data) return;

      // Fetch meeting and profile details
      const meetingIds = data.map(inv => inv.meeting_id);
      const inviterIds = [...new Set(data.map(inv => inv.inviter_id))];
      
      const [meetingsRes, profilesRes] = await Promise.all([
        supabase
          .from('meetings')
          .select('id, title, scheduled_start')
          .in('id', meetingIds)
          .gte('scheduled_start', new Date().toISOString()),
        supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', inviterIds),
      ]);


      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const meetingMap = new Map(meetingsRes.data?.map(m => [m.id, m]) || []);

      const enrichedInvitations: MeetingInvitation[] = data
        .filter(inv => meetingMap.has(inv.meeting_id))
        .map(inv => {
          const meeting = meetingMap.get(inv.meeting_id)!;
          const inviter = profileMap.get(inv.inviter_id);

          return {
            id: inv.id,
            meeting_id: inv.meeting_id,
            inviter_id: inv.inviter_id,
            inviter_name: inviter?.full_name ?? undefined,
            inviter_avatar: inviter?.avatar_url ?? undefined,
            meeting_title: meeting.title || 'Untitled Meeting',
            meeting_start_time: meeting.scheduled_start,
            meeting_duration_minutes: 30,
            status: inv.status,
            created_at: inv.created_at,
          };
        });

      setActiveInvitations(enrichedInvitations.filter(inv => !dismissedIds.has(inv.id)));
    };

    loadInvitations();

    // Subscribe to new invitations
    const channel = supabase
      .channel('meeting-invitations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_invitations',
        },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const newInvitation = payload.new as any;
          if (newInvitation.invitee_user_id !== user.id) return;

          // Fetch meeting details
          const { data: meeting } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', newInvitation.meeting_id)
            .single();

          // Fetch inviter profile
          const { data: inviter } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', newInvitation.inviter_id)
            .single();

          const enrichedInvitation: MeetingInvitation = {
            id: newInvitation.id,
            meeting_id: newInvitation.meeting_id,
            inviter_id: newInvitation.inviter_id,
            inviter_name: inviter?.full_name ?? undefined,
            inviter_avatar: inviter?.avatar_url ?? undefined,
            meeting_title: meeting?.title || 'Untitled Meeting',
            meeting_start_time: meeting?.scheduled_start || new Date().toISOString(),
            meeting_duration_minutes: 30,
            status: newInvitation.status,
            created_at: newInvitation.created_at,
          };

          setActiveInvitations(prev => [enrichedInvitation, ...prev]);

          // Play sound if enabled
          if (preferences?.sound_meetings !== false) {
            notificationSoundManager.updateConfig({
              enabled: true,
              volume: 0.6,
              respectQuietHours: true,
              quietHoursStart: preferences?.quiet_hours_start || undefined,
              quietHoursEnd: preferences?.quiet_hours_end || undefined,
            });
            notificationSoundManager.play('meeting_invite');
          }

          // Show browser notification if enabled
          if (preferences?.browser_meetings !== false && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(`Meeting Invitation from ${inviter?.full_name || 'Someone'}`, {
                body: meeting?.title || 'New meeting invitation',
                icon: inviter?.avatar_url || '/placeholder.svg',
                tag: newInvitation.id,
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission();
            }
          }

          // Track analytics
          await supabase.from('meeting_notification_analytics').insert({
            meeting_invitation_id: newInvitation.id,
            user_id: user.id,
            notification_type: 'browser',
            delivered_at: new Date().toISOString(),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [preferences, dismissedIds]);

  const handleDismiss = (invitationId: string) => {
    setDismissedIds(prev => new Set(prev).add(invitationId));
    setActiveInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  };

  const handleRespond = (invitationId: string) => {
    setActiveInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[300] space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeInvitations.slice(0, 3).map((invitation) => (
          <div key={invitation.id} className="pointer-events-auto">
            <MeetingInvitationCard
              invitation={invitation}
              onDismiss={() => handleDismiss(invitation.id)}
              onRespond={() => handleRespond(invitation.id)}
            />
          </div>
        ))}
      </AnimatePresence>
      
      {activeInvitations.length > 3 && (
        <div className="pointer-events-auto bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-3 text-center text-sm text-muted-foreground">
          +{activeInvitations.length - 3} more invitation{activeInvitations.length - 3 !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
