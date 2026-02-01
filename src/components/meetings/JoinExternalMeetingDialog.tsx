import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Video, Loader2, Monitor, CheckCircle2, Info } from "lucide-react";
import { useExternalMeetingCapture } from "@/hooks/useExternalMeetingCapture";
import { ExternalCapturePreview } from "./ExternalCapturePreview";

interface JoinExternalMeetingDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: (sessionId: string) => void;
}

type Platform = 'zoom' | 'teams' | 'meet' | 'other';

export function JoinExternalMeetingDialog({ trigger, onSuccess }: JoinExternalMeetingDialogProps) {
  const [open, setOpen] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [platform, setPlatform] = useState<Platform>('other');
  const [loading, setLoading] = useState(false);

  const { 
    state: captureState, 
    checkBrowserSupport,
    requestScreenCapture, 
    startRecording, 
    stopRecording,
    cancelCapture 
  } = useExternalMeetingCapture({
    onCaptureComplete: (sessionId) => {
      onSuccess?.(sessionId);
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Capture error:', error);
      toast.error(error.message || 'Capture failed');
    }
  });

  const resetForm = () => {
    setMeetingTitle('');
    setPlatform('other');
    setLoading(false);
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
        return <Badge variant="secondary" className="bg-muted">Other</Badge>;
    }
  };

  const handleStartCapture = async () => {
    const compatibility = checkBrowserSupport();
    
    if (!compatibility.supported) {
      toast.error(compatibility.reason || 'Screen capture not supported');
      return;
    }

    if (!compatibility.supportsSystemAudio) {
      toast.warning(
        'Your browser may not capture meeting audio. For best results, use Chrome 94+ or Edge.',
        { duration: 6000 }
      );
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
          meeting_title: meetingTitle || `${platform.charAt(0).toUpperCase() + platform.slice(1)} Meeting`,
          status: 'pending',
          capture_method: 'native_screen_capture',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      const sessionData = session as any;

      // Request screen capture
      const stream = await requestScreenCapture();
      
      if (stream) {
        // Start recording
        await startRecording(
          stream, 
          sessionData.id, 
          platform, 
          meetingTitle || `${platform} Meeting`
        );
      }

    } catch (error) {
      console.error('Error starting capture:', error);
      if ((error as Error).name !== 'NotAllowedError') {
        toast.error('Failed to start screen capture');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStopCapture = () => {
    stopRecording();
  };

  const handleCancel = () => {
    if (captureState.isCapturing) {
      cancelCapture();
    }
    setOpen(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && captureState.isCapturing) {
        // Don't close while capturing - user must stop first
        return;
      }
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Capture External Meeting
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Capture External Meeting
          </DialogTitle>
          <DialogDescription>
            Record your Zoom, Teams, or Google Meet window directly from your browser.
          </DialogDescription>
        </DialogHeader>

        {captureState.isCapturing ? (
          <div className="py-4">
            <ExternalCapturePreview
              stream={captureState.stream}
              isCapturing={captureState.isCapturing}
              duration={captureState.duration}
              hasAudio={captureState.hasAudio}
              onStop={handleStopCapture}
            />
          </div>
        ) : captureState.isUploading || captureState.isProcessing ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {captureState.isUploading ? 'Uploading recording...' : 'Processing transcript...'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Meeting Title</Label>
              <Input
                id="meeting-title"
                value={meetingTitle}
                onChange={e => setMeetingTitle(e.target.value)}
                placeholder="Weekly Sync, Interview with John, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="flex flex-wrap gap-2">
                {(['zoom', 'teams', 'meet', 'other'] as Platform[]).map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={platform === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPlatform(p)}
                    className="capitalize"
                  >
                    {p === 'meet' ? 'Google Meet' : p === 'teams' ? 'MS Teams' : p}
                  </Button>
                ))}
              </div>
            </div>

            <Alert className="bg-primary/5 border-primary/20">
              <Monitor className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>How it works:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>Open your meeting in another browser window or tab</li>
                  <li>Click "Start Capture" below</li>
                  <li>Select your meeting window and check "Share audio"</li>
                  <li>Click "Stop Recording" when the meeting ends</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Alert variant="default" className="bg-muted/50">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-muted-foreground text-sm">
                <strong>Privacy:</strong> Your recording stays in-house. Make sure all participants consent to recording.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!captureState.isCapturing && !captureState.isUploading && !captureState.isProcessing && (
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartCapture} 
              disabled={loading}
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Monitor className="h-4 w-4" />
              Start Capture
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
