import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StageParticipant {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: 'host' | 'speaker' | 'listener';
  is_muted: boolean;
  is_video_on: boolean;
  is_hand_raised: boolean;
  is_speaking: boolean;
}

export function useStageChannel(channelId: string) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<StageParticipant[]>([]);
  const [myParticipant, setMyParticipant] = useState<StageParticipant | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);

  // Load participants
  const loadParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from('live_channel_participants')
      .select('*')
      .eq('channel_id', channelId);

    if (error) {
      console.error('Error loading participants:', error);
      return;
    }

    // Fetch profiles separately
    const userIds = (data || []).map(p => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const profilesMap = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    const formatted = (data || []).map(p => {
      const profile = profilesMap.get(p.user_id);
      return {
        id: p.id,
        user_id: p.user_id,
        display_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        role: (p.role || 'listener') as 'host' | 'speaker' | 'listener',
        is_muted: p.is_muted ?? true,
        is_video_on: p.is_video_on ?? false,
        is_hand_raised: p.is_hand_raised ?? false,
        is_speaking: p.is_speaking ?? false,
      };
    });

    setParticipants(formatted);

    // Find my participant
    const mine = formatted.find(p => p.user_id === user?.id);
    if (mine) {
      setMyParticipant(mine);
      setIsMuted(mine.is_muted);
      setIsVideoOn(mine.is_video_on);
    }
  }, [channelId, user?.id]);

  // Join channel
  const joinChannel = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // First, leave any other channels
    await supabase
      .from('live_channel_participants')
      .delete()
      .eq('user_id', user.id);

    const { error } = await supabase
      .from('live_channel_participants')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        role: 'listener',
        is_muted: true,
        is_video_on: false,
        is_hand_raised: false,
        is_deafened: false,
        is_screen_sharing: false,
        is_speaking: false
      });

    if (error) {
      console.error('Error joining channel:', error);
      throw new Error('Failed to join stage channel. Please try again.');
    }

    setIsConnected(true);
    await loadParticipants();
  }, [channelId, user, loadParticipants]);

  // Leave channel
  const leaveChannel = useCallback(async () => {
    if (!myParticipant) return;

    await supabase
      .from('live_channel_participants')
      .delete()
      .eq('id', myParticipant.id);

    setIsConnected(false);
    setMyParticipant(null);
  }, [myParticipant]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!myParticipant) return;

    const newMuted = !isMuted;
    await supabase
      .from('live_channel_participants')
      .update({ is_muted: newMuted })
      .eq('id', myParticipant.id);

    setIsMuted(newMuted);
  }, [myParticipant, isMuted]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!myParticipant) return;

    const newVideo = !isVideoOn;
    await supabase
      .from('live_channel_participants')
      .update({ is_video_on: newVideo })
      .eq('id', myParticipant.id);

    setIsVideoOn(newVideo);
  }, [myParticipant, isVideoOn]);

  // Raise/lower hand
  const toggleHandRaise = useCallback(async () => {
    if (!myParticipant) return;

    const newHandRaised = !myParticipant.is_hand_raised;
    await supabase
      .from('live_channel_participants')
      .update({ is_hand_raised: newHandRaised })
      .eq('id', myParticipant.id);

    await loadParticipants();
  }, [myParticipant, loadParticipants]);

  // Moderator: Invite to speak
  const inviteToSpeak = useCallback(async (participantId: string) => {
    await supabase
      .from('live_channel_participants')
      .update({ role: 'speaker', is_hand_raised: false })
      .eq('id', participantId);

    await loadParticipants();
  }, [loadParticipants]);

  // Moderator: Move to audience
  const moveToAudience = useCallback(async (participantId: string) => {
    await supabase
      .from('live_channel_participants')
      .update({ role: 'listener', is_muted: true, is_video_on: false })
      .eq('id', participantId);

    await loadParticipants();
  }, [loadParticipants]);

  // Moderator: Lower hand
  const lowerHand = useCallback(async (participantId: string) => {
    await supabase
      .from('live_channel_participants')
      .update({ is_hand_raised: false })
      .eq('id', participantId);

    await loadParticipants();
  }, [loadParticipants]);

  // Subscribe to participant changes
  useEffect(() => {
    loadParticipants();

    const channel = supabase
      .channel(`stage-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_channel_participants',
          filter: `channel_id=eq.${channelId}`
        },
        () => loadParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, loadParticipants]);

  const speakers = participants.filter(p => p.role === 'host' || p.role === 'speaker');
  const listeners = participants.filter(p => p.role === 'listener');
  const isHost = myParticipant?.role === 'host';
  const isSpeaker = myParticipant?.role === 'speaker' || isHost;

  return {
    isConnected,
    isMuted,
    isVideoOn,
    myParticipant,
    speakers,
    listeners,
    isHost,
    isSpeaker,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
    toggleHandRaise,
    inviteToSpeak,
    moveToAudience,
    lowerHand,
  };
}
