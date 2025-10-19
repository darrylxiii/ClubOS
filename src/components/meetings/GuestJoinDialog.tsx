import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Video, AlertCircle, Mic, VideoIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GuestJoinDialogProps {
  meetingCode: string;
  onJoinApproved: (guestName: string, sessionToken: string) => void;
}

export function GuestJoinDialog({ meetingCode, onJoinApproved }: GuestJoinDialogProps) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [sessionToken] = useState(() => crypto.randomUUID());
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  const requestPermissions = async () => {
    if (!guestName.trim()) {
      toast.error('Please enter your name first');
      return;
    }

    setIsRequestingPermissions(true);

    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Stop the stream immediately - we just needed to get permissions
      stream.getTracks().forEach(track => track.stop());

      setPermissionsGranted(true);
      toast.success('Camera and microphone access granted!');
    } catch (error) {
      console.error('[GuestJoin] Permission denied:', error);
      toast.error('Camera and microphone access required to join the meeting');
    } finally {
      setIsRequestingPermissions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!permissionsGranted) {
      toast.error('Please grant camera and microphone permissions first');
      return;
    }

    setIsSubmitting(true);

    console.log('[GuestJoin] 📝 Submitting join request | Name:', guestName, '| Session:', sessionToken);

    try {
      // Find meeting by code
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id, title, host_id')
        .eq('meeting_code', meetingCode)
        .single();

      if (meetingError || !meeting) {
        toast.error('Meeting not found');
        return;
      }

      // Create join request
      console.log('[GuestJoin] 📤 Creating join request in database...');
      const { error: requestError } = await supabase
        .from('meeting_join_requests')
        .insert({
          meeting_id: meeting.id,
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim() || null,
          session_token: sessionToken,
          request_status: 'pending'
        });

      if (requestError) {
        console.error('[GuestJoin] ❌ Failed to create request:', requestError);
        toast.error('Failed to request access');
        return;
      }

      console.log('[GuestJoin] ✅ Join request created successfully');
      setIsWaiting(true);
      toast.success('Join request sent! Waiting for host approval...');

      // Subscribe to approval status
      console.log('[GuestJoin] 📡 Subscribing to approval updates...');
      const channel = supabase
        .channel(`guest-approval-${sessionToken}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'meeting_join_requests',
            filter: `session_token=eq.${sessionToken}`
          },
          (payload: any) => {
            console.log('[GuestJoin] 🔔 Received approval update:', payload);
            const status = payload.new.request_status;
            
            if (status === 'approved') {
              console.log('[GuestJoin] ✅ Access approved! Joining meeting...');
              toast.success('Access granted! Joining meeting...');
              channel.unsubscribe();
              onJoinApproved(guestName.trim(), sessionToken);
            } else if (status === 'rejected') {
              console.log('[GuestJoin] ❌ Access rejected by host');
              toast.error('Access denied by host');
              channel.unsubscribe();
              setIsWaiting(false);
            }
          }
        )
        .subscribe((status) => {
          console.log('[GuestJoin] 📡 Subscription status:', status);
        });

    } catch (error) {
      console.error('[GuestJoin] Error:', error);
      toast.error('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isWaiting) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <Card className="max-w-md w-full p-8 space-y-6 backdrop-blur-xl bg-black/60 border-white/10 mx-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Waiting for Host</h2>
              <p className="text-muted-foreground">
                {guestName}, your request to join has been sent.
                <br />
                The host will approve your entry shortly.
              </p>
            </div>

            <div className="w-full pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => setIsWaiting(false)}
                className="w-full"
              >
                Cancel Request
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <Card className="max-w-md w-full p-8 space-y-6 backdrop-blur-xl bg-black/60 border-white/10 mx-4">
        <div className="space-y-2 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-white">Join Meeting</h2>
          <p className="text-muted-foreground">
            Enter your details to request access to this meeting
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Your Name *</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="John Doe"
              required
              maxLength={100}
              className="bg-white/5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-email">Email (optional)</Label>
            <Input
              id="guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="john@example.com"
              maxLength={255}
              className="bg-white/5"
            />
          </div>

          {!permissionsGranted && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-200">
                Please grant camera and microphone permissions before requesting to join.
              </p>
            </div>
          )}

          {permissionsGranted && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Mic className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-200">
                Camera and microphone access granted! You can now request to join.
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              The meeting host will need to approve your request before you can join.
            </p>
          </div>

          {!permissionsGranted ? (
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={requestPermissions}
                disabled={isRequestingPermissions || !guestName.trim()}
                className="flex-1"
              >
                {isRequestingPermissions ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <VideoIcon className="mr-2 h-4 w-4" />
                    Grant Permissions
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  'Request to Join'
                )}
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
