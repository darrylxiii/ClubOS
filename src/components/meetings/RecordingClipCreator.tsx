import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Scissors, Copy, Clock, Share2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RecordingClipCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordingId: string;
  startMs: number;
  endMs: number;
  transcript: string;
  recordingUrl?: string;
}

export function RecordingClipCreator({
  open,
  onOpenChange,
  recordingId,
  startMs,
  endMs,
  transcript,
  recordingUrl
}: RecordingClipCreatorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(transcript.slice(0, 200));
  const [isPublic, setIsPublic] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number>(72); // hours
  const [creating, setCreating] = useState(false);
  const [clipUrl, setClipUrl] = useState<string | null>(null);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const durationMs = endMs - startMs;
  const durationSeconds = Math.round(durationMs / 1000);

  const handleCreate = async () => {
    if (!user || !title.trim()) {
      toast.error('Please enter a title for the clip');
      return;
    }

    setCreating(true);
    try {
      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresIn);

      // Create clip record - use RPC or direct insert
      const clipId = crypto.randomUUID();
      const { error } = await supabase
        .from('meeting_clips' as any)
        .insert({
          id: clipId,
          recording_id: recordingId,
          created_by: user.id,
          title: title.trim(),
          description: description.trim(),
          start_ms: startMs,
          end_ms: endMs,
          duration_seconds: durationSeconds,
          transcript_excerpt: transcript,
          is_public: isPublic,
          expires_at: expiresAt.toISOString(),
          view_count: 0
        });

      if (error) throw error;

      // Generate shareable URL
      const shareUrl = `${window.location.origin}/clip/${clipId}`;
      setClipUrl(shareUrl);
      
      toast.success('Clip created successfully!');
    } catch (error) {
      console.error('Error creating clip:', error);
      toast.error('Failed to create clip');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (clipUrl) {
      await navigator.clipboard.writeText(clipUrl);
      toast.success('Link copied to clipboard');
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription(transcript.slice(0, 200));
    setIsPublic(false);
    setClipUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Create Clip
          </DialogTitle>
          <DialogDescription>
            Create a shareable clip from this recording segment
          </DialogDescription>
        </DialogHeader>

        {clipUrl ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-600 font-medium mb-2">
                ✓ Clip created successfully!
              </p>
              <div className="flex items-center gap-2">
                <Input value={clipUrl} readOnly className="text-sm" />
                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
              <Button onClick={copyToClipboard}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Link
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Clip Preview */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(startMs)} - {formatTime(endMs)}
                </Badge>
                <Badge variant="outline">
                  {durationSeconds}s
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">
                "{transcript}"
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Clip Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Great answer about leadership"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional context for viewers"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Public Access</Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can view
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              <div>
                <Label htmlFor="expires">Link Expires In</Label>
                <select
                  id="expires"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value={24}>24 hours</option>
                  <option value={72}>3 days</option>
                  <option value={168}>1 week</option>
                  <option value={720}>30 days</option>
                  <option value={0}>Never</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || !title.trim()}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4 mr-2" />
                    Create Clip
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
