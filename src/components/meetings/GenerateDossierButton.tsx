import { useState } from 'react';
import { aiService } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FileText, Copy, ExternalLink, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateDossierButtonProps {
  recordingId: string;
  meetingId?: string;
  candidateId?: string;
  candidateName?: string;
}

export function GenerateDossierButton({
  recordingId,
  meetingId,
  candidateId,
  candidateName
}: GenerateDossierButtonProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dossier, setDossier] = useState<{
    id: string;
    shareToken: string;
    shareUrl: string;
    expiresAt: string;
  } | null>(null);
  const [expiryHours, setExpiryHours] = useState(72);
  const [includeScorecard, setIncludeScorecard] = useState(true);
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { dossier, success } = await aiService.generateMeetingDossier({
        recordingId,
        meetingId,
        candidateId,
        options: {
          expiryHours,
          includeScorecard,
          includeTranscript
        }
      });

      if (!success) throw new Error('Failed to generate');

      if (dossier) {
        setDossier(dossier);
        toast.success('Dossier generated successfully');
      }
    } catch (error) {
      console.error('Failed to generate dossier:', error);
      toast.error('Failed to generate dossier');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (dossier?.shareUrl) {
      navigator.clipboard.writeText(dossier.shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openDossier = () => {
    if (dossier?.shareUrl) {
      window.open(dossier.shareUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Generate Dossier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Client Dossier</DialogTitle>
          <DialogDescription>
            Create a shareable dossier with AI insights, scorecards, and recommendations
            {candidateName && ` for ${candidateName}`}.
          </DialogDescription>
        </DialogHeader>

        {!dossier ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Link expiry (hours)</Label>
              <Input
                id="expiry"
                type="number"
                min={1}
                max={720}
                value={expiryHours}
                onChange={(e) => setExpiryHours(parseInt(e.target.value) || 72)}
              />
              <p className="text-xs text-muted-foreground">
                Default: 72 hours. Max: 30 days (720 hours)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="scorecard">Include Scorecards</Label>
                <p className="text-xs text-muted-foreground">
                  Interviewer ratings and feedback
                </p>
              </div>
              <Switch
                id="scorecard"
                checked={includeScorecard}
                onCheckedChange={setIncludeScorecard}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="transcript">Include Full Transcript</Label>
                <p className="text-xs text-muted-foreground">
                  Complete meeting transcript
                </p>
              </div>
              <Switch
                id="transcript"
                checked={includeTranscript}
                onCheckedChange={setIncludeTranscript}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Dossier
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <Check className="h-5 w-5" />
                <span className="font-medium">Dossier Ready</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Expires: {new Date(dossier.expiresAt).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={dossier.shareUrl}
                readOnly
                className="flex-1 text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="icon" onClick={openDossier}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDossier(null);
                }}
              >
                Generate Another
              </Button>
              <Button
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
