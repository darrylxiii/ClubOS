import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BreakoutRoom {
  id: string;
  name: string;
  timer_end_at?: string;
  broadcast_message?: string;
  recall_requested?: boolean;
}

interface UseBreakoutRoomWebRTCProps {
  meetingId: string;
  userId: string;
  userName: string;
  mainRoomPeerConnection?: RTCPeerConnection | null;
  onTransition?: (to: 'main' | 'breakout', roomId?: string) => void;
}

export function useBreakoutRoomWebRTC({
  meetingId,
  userId,
  userName,
  mainRoomPeerConnection,
  onTransition
}: UseBreakoutRoomWebRTCProps) {
  const [currentBreakoutRoom, setCurrentBreakoutRoom] = useState<BreakoutRoom | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);
  
  const breakoutPeerConnection = useRef<RTCPeerConnection | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to breakout room changes for recall and broadcast
  useEffect(() => {
    if (!currentBreakoutRoom) return;

    const channel = supabase
      .channel(`breakout-room-${currentBreakoutRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_breakout_rooms',
          filter: `id=eq.${currentBreakoutRoom.id}`
        },
        (payload) => {
          const updated = payload.new as BreakoutRoom;
          
          // Handle recall request
          if (updated.recall_requested && !currentBreakoutRoom.recall_requested) {
            toast.info('Host is recalling all participants to the main room');
            returnToMainRoom();
          }

          // Handle broadcast message
          if (updated.broadcast_message && updated.broadcast_message !== broadcastMessage) {
            setBroadcastMessage(updated.broadcast_message);
            toast.info(`Message from host: ${updated.broadcast_message}`);
          }

          // Update timer
          if (updated.timer_end_at !== currentBreakoutRoom.timer_end_at) {
            setCurrentBreakoutRoom(prev => prev ? { ...prev, timer_end_at: updated.timer_end_at } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBreakoutRoom?.id]);

  // Timer countdown
  useEffect(() => {
    if (!currentBreakoutRoom?.timer_end_at) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const endTime = new Date(currentBreakoutRoom.timer_end_at!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        toast.info('Breakout session time is up');
        returnToMainRoom();
      }
    };

    updateTimer();
    timerInterval.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [currentBreakoutRoom?.timer_end_at]);

  const joinBreakoutRoom = useCallback(async (roomId: string, roomName: string) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    try {
      // Mute main room connection (don't destroy, just pause tracks)
      if (mainRoomPeerConnection) {
        mainRoomPeerConnection.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.enabled = false;
          }
        });
      }

      // Record participant join in database
      const { error: joinError } = await supabase
        .from('breakout_room_participants' as any)
        .upsert({
          breakout_room_id: roomId,
          participant_id: userId,
          participant_name: userName,
          joined_at: new Date().toISOString(),
          left_at: null
        }, {
          onConflict: 'breakout_room_id,participant_id'
        });

      if (joinError) {
        console.error('Error joining breakout room:', joinError);
        throw joinError;
      }

      // Fetch room details
      const { data: room } = await supabase
        .from('meeting_breakout_rooms' as any)
        .select('*')
        .eq('id', roomId)
        .single();

      if (room) {
        const roomData = room as any;
        setCurrentBreakoutRoom({
          id: roomData.id,
          name: roomData.name,
          timer_end_at: roomData.timer_end_at,
          broadcast_message: roomData.broadcast_message,
          recall_requested: roomData.recall_requested
        });
      }
      onTransition?.('breakout', roomId);
      toast.success(`Joined breakout room: ${roomName}`);

    } catch (error) {
      console.error('Error joining breakout room:', error);
      toast.error('Failed to join breakout room');
      
      // Re-enable main room tracks on error
      if (mainRoomPeerConnection) {
        mainRoomPeerConnection.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.enabled = true;
          }
        });
      }
    } finally {
      setIsTransitioning(false);
    }
  }, [meetingId, userId, userName, mainRoomPeerConnection, isTransitioning, onTransition]);

  const returnToMainRoom = useCallback(async () => {
    if (!currentBreakoutRoom || isTransitioning) return;

    setIsTransitioning(true);
    try {
      // Close breakout peer connection if exists
      if (breakoutPeerConnection.current) {
        breakoutPeerConnection.current.close();
        breakoutPeerConnection.current = null;
      }

      // Update participant record
      await supabase
        .from('breakout_room_participants' as any)
        .update({ left_at: new Date().toISOString() })
        .eq('breakout_room_id', currentBreakoutRoom.id)
        .eq('participant_id', userId);

      // Re-enable main room tracks
      if (mainRoomPeerConnection) {
        mainRoomPeerConnection.getSenders().forEach(sender => {
          if (sender.track) {
            sender.track.enabled = true;
          }
        });
      }

      setCurrentBreakoutRoom(null);
      setBroadcastMessage(null);
      setTimeRemaining(null);
      onTransition?.('main');
      toast.success('Returned to main room');

    } catch (error) {
      console.error('Error returning to main room:', error);
      toast.error('Failed to return to main room');
    } finally {
      setIsTransitioning(false);
    }
  }, [currentBreakoutRoom, userId, mainRoomPeerConnection, isTransitioning, onTransition]);

  // Host functions
  const recallAllParticipants = useCallback(async () => {
    try {
      // Get all active breakout rooms for this meeting
      const { data: rooms, error } = await supabase
        .from('meeting_breakout_rooms' as any)
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('is_active', true);

      if (error) throw error;

      // Set recall_requested for all rooms
      const roomsArray = rooms as any[] || [];
      for (const room of roomsArray) {
        await supabase
          .from('meeting_breakout_rooms' as any)
          .update({ recall_requested: true })
          .eq('id', room.id);
      }

      toast.success('Recall sent to all breakout rooms');
    } catch (error) {
      console.error('Error recalling participants:', error);
      toast.error('Failed to recall participants');
    }
  }, [meetingId]);

  const broadcastToAllRooms = useCallback(async (message: string) => {
    try {
      const { data: rooms, error } = await supabase
        .from('meeting_breakout_rooms' as any)
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('is_active', true);

      if (error) throw error;

      const roomsArray = rooms as any[] || [];
      for (const room of roomsArray) {
        await supabase
          .from('meeting_breakout_rooms' as any)
          .update({ broadcast_message: message })
          .eq('id', room.id);
      }

      toast.success('Message broadcast to all rooms');
    } catch (error) {
      console.error('Error broadcasting message:', error);
      toast.error('Failed to broadcast message');
    }
  }, [meetingId]);

  const setRoomTimer = useCallback(async (roomId: string, durationMinutes: number) => {
    try {
      const timerEndAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      
      await supabase
        .from('meeting_breakout_rooms' as any)
        .update({ timer_end_at: timerEndAt })
        .eq('id', roomId);

      toast.success(`Timer set for ${durationMinutes} minutes`);
    } catch (error) {
      console.error('Error setting timer:', error);
      toast.error('Failed to set timer');
    }
  }, []);

  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    currentBreakoutRoom,
    isTransitioning,
    isInBreakoutRoom: !!currentBreakoutRoom,
    timeRemaining,
    timeRemainingFormatted: timeRemaining !== null ? formatTimeRemaining(timeRemaining) : null,
    broadcastMessage,
    joinBreakoutRoom,
    returnToMainRoom,
    recallAllParticipants,
    broadcastToAllRooms,
    setRoomTimer
  };
}
