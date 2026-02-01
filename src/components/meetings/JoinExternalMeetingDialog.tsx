import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Video, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface JoinExternalMeetingDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: (sessionId: string) => void;
}

type Platform = 'zoom' | 'teams' | 'meet' | 'unknown';

export function JoinExternalMeetingDialog({ trigger, onSuccess }: JoinExternalMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState<Platform>('unknown');

  const detectPlatform = (url: string): Platform => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('zoom.us') || urlLower.includes('zoom.com')) return 'zoom';
    if (urlLower.includes('teams.microsoft.com') || urlLower.includes('teams.live.com')) return 'teams';
    if (urlLower.includes('meet.google.com')) return 'meet';
    return 'unknown';
  };

  const handleUrlChange = (url: string) => {
    setMeetingUrl(url);
    setPlatform(detectPlatform(url));
  };

  const getPlatformBadge = () => {
    switch (platform) {
      case 'zoom':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Zoom</Badge>;
      case 'teams':
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">Microsoft Teams</Badge>;
      case 'meet':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Google Meet</Badge>;
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!meetingUrl.trim()) {
      toast.error('Please enter a meeting URL');
      return;
    }

    if (platform === 'unknown') {
      toast.error('Unsupported meeting platform. Please use Zoom, Teams, or Google Meet.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to use this feature');
        return;
      }

      // Create external meeting session record
      const { data: session, error: sessionError } = await supabase
        .from('external_meeting_sessions' as any)
        .insert({
          user_id: user.id,
          platform,
          meeting_url: meetingUrl,
          meeting_title: meetingTitle || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Meeting`,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const sessionData = session as any;

      // Dispatch meeting bot via edge function
      const { data: botResult, error: botError } = await supabase.functions.invoke('dispatch-meeting-bot', {
        body: {
          sessionId: sessionData.id,
          meetingUrl: meetingUrl,
          botName: 'TQC Notetaker'
        }
      });

      if (botError) {
        console.error('Bot dispatch error:', botError);
        // Show appropriate message based on error
        if (botResult?.message?.includes('RECALL_API_KEY')) {
          toast.warning(
            'Meeting bot integration requires configuration. Session saved for when integration is enabled.',
            { duration: 5000 }
          );
        } else {
          toast.error('Failed to dispatch meeting bot');
        }
      } else if (botResult?.success) {
        toast.success(
          'Meeting bot dispatched! It will join your meeting shortly.',
          { duration: 5000 }
        );
      } else {
        toast.info(
          'Session created. Bot integration pending configuration.',
          { duration: 5000 }
        );
      }

      onSuccess?.(sessionData.id);
      setOpen(false);
      setMeetingUrl('');
      setMeetingTitle('');

    } catch (error) {
      console.error('Error creating external meeting session:', error);
      toast.error('Failed to set up external meeting capture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Capture External Meeting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Capture External Meeting
          </DialogTitle>
          <DialogDescription>
            Send a notetaker bot to record and transcribe a Zoom, Teams, or Google Meet call.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meeting-url">Meeting URL</Label>
            <div className="flex gap-2">
              <Input
                id="meeting-url"
                value={meetingUrl}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="https://zoom.us/j/... or teams link or meet.google.com/..."
              />
              {getPlatformBadge()}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-title">Meeting Title (Optional)</Label>
            <Input
              id="meeting-title"
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
              placeholder="Weekly Sync, Interview with John, etc."
            />
          </div>

          {platform !== 'unknown' && (
            <Alert className="bg-primary/5 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription>
                A notetaker bot will join your {platform.charAt(0).toUpperCase() + platform.slice(1)} meeting 
                and automatically record, transcribe, and analyze the conversation.
              </AlertDescription>
            </Alert>
          )}

          <Alert variant="default" className="bg-primary/5 border-primary/20">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-muted-foreground">
              <strong>Note:</strong> The meeting bot will appear as "TQC Notetaker" in your call. 
              Make sure all participants consent to recording.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || platform === 'unknown' || !meetingUrl.trim()}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Notetaker Bot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
