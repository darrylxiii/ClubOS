import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MeetingVideoCallInterface } from '@/components/meetings/MeetingVideoCallInterface';
import { GuestJoinDialog } from '@/components/meetings/GuestJoinDialog';
import { MinimalHeader } from '@/components/MinimalHeader';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Lock, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

export default function MeetingRoom() {
  const { meetingCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [password, setPassword] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(null);
  const [hostIsPresent, setHostIsPresent] = useState(false);

  useEffect(() => {
    if (meetingCode) {
      loadMeeting();
    }
  }, [meetingCode]);

  // Check if host is present (for non-hosts to join early)
  // Uses heartbeat-based presence detection (last_seen < 30s ago OR left_at is null)
  useEffect(() => {
    if (!meeting?.id) return;
    
    // Check if current user is host (null-safe for guests)
    const isHost = user?.id === meeting.host_id;
    if (isHost) return; // Host doesn't need to check their own presence
    
    const checkHostPresence = async () => {
      const { data } = await supabase
        .from('meeting_participants')
        .select('id, last_seen, left_at')
        .eq('meeting_id', meeting.id)
        .eq('user_id', meeting.host_id)
        .maybeSingle();
      
      if (!data) {
        setHostIsPresent(false);
        return;
      }
      
      // Consider host present if left_at is null AND last_seen is recent (within 30 seconds)
      const isActive = data.left_at === null && 
        data.last_seen && 
        (new Date().getTime() - new Date(data.last_seen).getTime()) < 30000;
      
      setHostIsPresent(isActive ?? false);
    };
    
    checkHostPresence();
    
    // Subscribe to changes (works for both authenticated users and guests)
    const channel = supabase
      .channel(`meeting-${meeting.id}-host-presence`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants',
          filter: `meeting_id=eq.${meeting.id}`
        },
        () => checkHostPresence()
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [meeting?.id, meeting?.host_id, user?.id]);

  // Add cleanup handler ONLY for actual page close (not UI transitions)
  useEffect(() => {
    if (!meeting?.id || !inCall) return;

    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      // This only fires on actual browser close/refresh, not component unmount
      console.log('[MeetingRoom] 🧹 Cleaning up participant on page unload/close');
      
      // Mark participant as left
      try {
        if (user) {
          await supabase
            .from('meeting_participants')
            .update({ left_at: new Date().toISOString(), status: 'left' })
            .eq('meeting_id', meeting.id)
            .eq('user_id', user.id)
            .is('left_at', null);
        } else if (guestSessionToken) {
          await supabase
            .from('meeting_participants')
            .update({ left_at: new Date().toISOString(), status: 'left' })
            .eq('meeting_id', meeting.id)
            .eq('session_token', guestSessionToken)
            .is('left_at', null);
        }
      } catch (error) {
        console.error('[MeetingRoom] ❌ Error marking participant as left:', error);
      }
    };

    // Register beforeunload handler
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // ONLY remove listener, DO NOT call cleanup on component unmount
      // This prevents false "left" marks during UI transitions
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [meeting?.id, inCall, user, guestSessionToken]);

  const loadMeeting = async () => {
    try {
      setLoading(true);
      
      // Use maybeSingle to avoid errors when meeting not found
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('meeting_code', meetingCode ?? '')
        .maybeSingle();

      if (error) {
        console.error('Database error loading meeting:', error);
        throw error;
      }

      if (!data) {
        console.log('Meeting not found with code:', meetingCode);
        toast.error('Meeting not found. Please check the meeting link.');
        // Don't auto-navigate - let user see the error
        setLoading(false);
        return;
      }

      console.log('Meeting loaded successfully:', data);
      setMeeting(data);
    } catch (error: any) {
      console.error('Error loading meeting:', error);
      toast.error(error.message || 'Failed to load meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!meeting) return;

    // Check password first if required
    if (meeting.access_type === 'password' && meeting.meeting_password !== password) {
      toast.error('Incorrect password');
      return;
    }

    // For guests, show the approval dialog
    if (!user) {
      setShowGuestDialog(true);
      return;
    }

    // For authenticated users, join directly
    setJoining(true);
    try {
      logger.debug('Authenticated user joining meeting', { componentName: 'MeetingRoom', userId: user.id });
      
      // First, mark any existing active participant as left (in case of reconnection)
      const { error: updateError } = await supabase
        .from('meeting_participants')
        .update({ 
          left_at: new Date().toISOString(),
          status: 'left'
        })
        .eq('meeting_id', meeting.id)
        .eq('user_id', user.id)
        .is('left_at', null);

      if (updateError) {
        logger.warn('Could not mark old participant as left', { componentName: 'MeetingRoom', error: updateError });
      }

      // Now insert the new active participant entry
      const { error: insertError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          status: 'accepted',
          joined_at: new Date().toISOString(),
          left_at: null
        });

      if (insertError) {
        // If it's a duplicate error, the user might already be in - that's okay
        if (insertError.code === '23505') {
          console.log('[MeetingRoom] ✅ User already in meeting, proceeding...');
          toast.info('Rejoining meeting...');
        } else {
          console.error('[MeetingRoom] ❌ Error inserting participant:', insertError);
          throw insertError;
        }
      } else {
        console.log('[MeetingRoom] ✅ User joined meeting successfully');
      }

      // Update meeting status to 'in_progress' if host is joining
      if (user.id === meeting.host_id && meeting.status === 'scheduled') {
        await supabase
          .from('meetings')
          .update({ status: 'in_progress' })
          .eq('id', meeting.id);
        console.log('[MeetingRoom] ✅ Meeting status updated to in_progress');
      }

      setInCall(true);
    } catch (error: any) {
      console.error('[MeetingRoom] ❌ Error joining meeting:', error);
      
      // Show user-friendly error with retry option
      if (error.code === '23505') {
        toast.info('You are already in this meeting');
        setInCall(true); // Allow them to proceed anyway
      } else {
        toast.error('Failed to join meeting', {
          description: 'Please check your connection and try again',
          action: {
            label: 'Retry',
            onClick: () => handleJoinMeeting()
          }
        });
      }
    } finally {
      setJoining(false);
    }
  };

  const handleGuestJoinApproved = (name: string, sessionToken: string) => {
    console.log('[MeetingRoom] Guest approved with session token:', sessionToken);
    setGuestName(name);
    setGuestSessionToken(sessionToken);
    setShowGuestDialog(false);
    setInCall(true);
  };

  const handleEndCall = async () => {
    // Mark participant as left in database
    try {
      if (user) {
        await supabase
          .from('meeting_participants')
          .update({ left_at: new Date().toISOString(), status: 'left' })
          .eq('meeting_id', meeting.id)
          .eq('user_id', user.id)
          .is('left_at', null);

        // If host is leaving, check if there are other participants
        if (user.id === meeting.host_id) {
          const { count } = await supabase
            .from('meeting_participants')
            .select('*', { count: 'exact', head: true })
            .eq('meeting_id', meeting.id)
            .is('left_at', null);

          // If no other participants, mark meeting as completed
          if (!count || count === 0) {
            await supabase
              .from('meetings')
              .update({ status: 'completed' })
              .eq('id', meeting.id);
            console.log('[MeetingRoom] ✅ Meeting status updated to completed');
          }
        }
      } else if (guestSessionToken) {
        await supabase
          .from('meeting_participants')
          .update({ left_at: new Date().toISOString(), status: 'left' })
          .eq('meeting_id', meeting.id)
          .eq('session_token', guestSessionToken)
          .is('left_at', null);
      }
    } catch (error) {
      console.error('[MeetingRoom] Error marking participant as left:', error);
    }
    
    setInCall(false);
    navigate('/meetings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MinimalHeader backPath="/meetings" />
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-2xl w-full p-8">
            <div className="text-center space-y-4">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-32 w-full" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MinimalHeader backPath="/meetings" />
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-2xl w-full p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Video className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">Meeting Not Found</h2>
            <p className="text-muted-foreground">
              The meeting link may be invalid or the meeting may have been deleted.
            </p>
            <Button onClick={() => navigate('/meetings')} className="mt-4">
              View All Meetings
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (showGuestDialog && meeting) {
    return (
      <GuestJoinDialog
        meetingCode={meeting.meeting_code}
        onJoinApproved={handleGuestJoinApproved}
      />
    );
  }

  if (inCall) {
    // Generate participant ID (user ID or guest session token)
    const currentParticipantId = user?.id || guestSessionToken || `guest-${Date.now()}`;
    const displayName = user?.user_metadata?.full_name || user?.email || guestName;

    console.log('[MeetingRoom] Entering call with participant ID:', currentParticipantId, 'Display name:', displayName);

    return (
      <MeetingVideoCallInterface
        meeting={meeting}
        participantId={currentParticipantId}
        participantName={displayName}
        isGuest={!user}
        onEnd={handleEndCall}
      />
    );
  }

  const scheduledStart = new Date(meeting.scheduled_start);
  const scheduledEnd = new Date(meeting.scheduled_end);
  const now = new Date();
  const isScheduledTimeReached = scheduledStart <= now;
  const hasEnded = scheduledEnd < now;
  
  // Hosts can always join (to prepare/start early)
  const isHost = user?.id === meeting.host_id;
  
  // Non-hosts can join if scheduled time reached OR if host is already in the meeting
  const canJoin = isHost || isScheduledTimeReached || hostIsPresent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex flex-col">
      <MinimalHeader backPath="/meetings" />
      <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full p-8 glass-card">
        {/* Meeting Info */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{meeting.title}</h1>
          {meeting.description && (
            <p className="text-muted-foreground mb-4">{meeting.description}</p>
          )}

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(scheduledStart, 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {format(scheduledStart, 'h:mm a')} - {format(scheduledEnd, 'h:mm a')}
            </div>
          </div>
        </div>

        {/* Join Form */}
        {!hasEnded ? (
          <div className="space-y-6">
            {/* Password */}
            {meeting.access_type === 'password' && (
              <div>
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Meeting Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter meeting password"
                />
              </div>
            )}

            {/* Join Button */}
            <Button
              onClick={handleJoinMeeting}
              disabled={joining || !canJoin}
              className="w-full h-12 text-lg gap-2"
              size="lg"
            >
              <Video className="h-5 w-5" />
              {joining ? 'Joining...' : 
               isHost ? 'Start Meeting' :
               !canJoin ? 'Waiting for Host' : 
               'Join Meeting'}
            </Button>

            {!user && (
              <p className="text-center text-sm text-muted-foreground">
                Joining as a guest. You'll need host approval to enter.
              </p>
            )}

            {!isScheduledTimeReached && !isHost && (
              <p className="text-center text-sm text-muted-foreground">
                {hostIsPresent 
                  ? '✓ Host is ready - you can join early!' 
                  : `Meeting starts ${format(scheduledStart, 'MMM d, yyyy')} at ${format(scheduledStart, 'h:mm a')}`
                }
              </p>
            )}
            
            {isHost && !isScheduledTimeReached && (
              <p className="text-center text-sm text-primary font-medium">
                You can start the meeting early
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">This meeting has ended</p>
            <Button onClick={() => navigate('/meetings')}>
              Back to Meetings
            </Button>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}