import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MeetingVideoCallInterface } from '@/components/meetings/MeetingVideoCallInterface';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, Lock, Users, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

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

  useEffect(() => {
    if (meetingCode) {
      loadMeeting();
    }
  }, [meetingCode]);

  const loadMeeting = async () => {
    try {
      setLoading(true);
      
      // Use maybeSingle to avoid errors when meeting not found
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('meeting_code', meetingCode)
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

    // Check if user needs to authenticate
    if (!user && !meeting.allow_guests) {
      toast.error('This meeting requires authentication');
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // Validate guest info if not logged in
    if (!user && meeting.allow_guests) {
      if (!guestName?.trim() || !guestEmail?.trim()) {
        toast.error('Please provide your name and email');
        return;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail)) {
        toast.error('Please provide a valid email address');
        return;
      }
    }

    // Check password
    if (meeting.access_type === 'password' && meeting.meeting_password !== password) {
      toast.error('Incorrect password');
      return;
    }

    setJoining(true);
    try {
      console.log('Joining meeting:', meeting.id);
      
      // Add participant
      const { error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user?.id || null,
          guest_name: !user ? guestName.trim() : null,
          guest_email: !user ? guestEmail.trim() : null,
          status: meeting.require_approval ? 'pending' : 'accepted',
          joined_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding participant:', error);
        throw error;
      }

      if (meeting.require_approval && user?.id !== meeting.host_id) {
        toast.success('Join request sent. Waiting for host approval...');
        // TODO: Show waiting room with real-time approval updates
      } else {
        console.log('Participant added successfully, joining call');
        setInCall(true);
      }
    } catch (error: any) {
      console.error('Error joining meeting:', error);
      
      if (error.code === '23505') {
        // Duplicate entry - already joined
        toast.info('You have already joined this meeting');
        setInCall(true);
      } else {
        toast.error(error.message || 'Failed to join meeting. Please try again.');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleEndCall = () => {
    setInCall(false);
    navigate('/meetings');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
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
    );
  }

  if (inCall) {
    // Generate participant ID (user ID or guest session ID)
    const currentParticipantId = user?.id || `guest-${guestEmail}`;
    const displayName = user?.user_metadata?.full_name || user?.email || guestName;

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
  const isStarted = scheduledStart <= new Date();
  const hasEnded = scheduledEnd < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-8">
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
            {/* Guest Info */}
            {!user && meeting.allow_guests && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  Join as Guest
                </div>
                <div>
                  <Label htmlFor="guest-name">Your Name *</Label>
                  <Input
                    id="guest-name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <Label htmlFor="guest-email">Your Email *</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
            )}

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
              disabled={joining || !isStarted}
              className="w-full h-12 text-lg gap-2"
              size="lg"
            >
              <Video className="h-5 w-5" />
              {joining ? 'Joining...' : !isStarted ? 'Meeting Not Started' : 'Join Meeting'}
            </Button>

            {!user && !meeting.allow_guests && (
              <p className="text-center text-sm text-muted-foreground">
                <Button variant="link" onClick={() => navigate('/auth')}>
                  Sign in
                </Button>
                to join this meeting
              </p>
            )}

            {!isStarted && (
              <p className="text-center text-sm text-muted-foreground">
                Meeting starts {format(scheduledStart, 'MMM d, yyyy')} at {format(scheduledStart, 'h:mm a')}
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
  );
}