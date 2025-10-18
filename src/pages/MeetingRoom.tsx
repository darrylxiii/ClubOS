import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VideoCallInterface } from '@/components/messages/VideoCallInterface';
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
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('meeting_code', meetingCode)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error('Meeting not found');
        navigate('/meetings');
        return;
      }

      setMeeting(data);
    } catch (error: any) {
      console.error('Error loading meeting:', error);
      toast.error('Failed to load meeting');
      navigate('/meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async () => {
    if (!meeting) return;

    // Validate guest info if not logged in
    if (!user && meeting.allow_guests) {
      if (!guestName || !guestEmail) {
        toast.error('Please provide your name and email');
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
      // Add participant
      const { error } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: meeting.id,
          user_id: user?.id,
          guest_name: !user ? guestName : null,
          guest_email: !user ? guestEmail : null,
          status: meeting.require_approval ? 'pending' : 'accepted',
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

      if (meeting.require_approval) {
        toast.success('Join request sent. Waiting for host approval...');
        // TODO: Show waiting room
      } else {
        setInCall(true);
      }
    } catch (error: any) {
      console.error('Error joining meeting:', error);
      toast.error('Failed to join meeting');
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
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  if (inCall) {
    return (
      <VideoCallInterface
        conversationId={meeting.id}
        participantName={meeting.title}
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