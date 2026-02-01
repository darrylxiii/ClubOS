import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Copy, Link2, Clock, Eye, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { format, addHours } from 'date-fns';

interface ShareRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordingId: string;
  recordingTitle: string;
}

export function ShareRecordingDialog({
  open,
  onOpenChange,
  recordingId,
  recordingTitle,
}: ShareRecordingDialogProps) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Options
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [maxViews, setMaxViews] = useState<number | null>(null);
  const [allowedDomains, setAllowedDomains] = useState('');
  const [addWatermark, setAddWatermark] = useState(true);

  const createShareLink = async () => {
    if (!user) {
      toast.error('Please sign in to share recordings');
      return;
    }

    setIsCreating(true);
    try {
      const expiresAt = addHours(new Date(), expiresInHours);
      const domains = allowedDomains.split(',').map(d => d.trim()).filter(Boolean);
      const watermarkText = addWatermark 
        ? `Confidential - Shared ${format(new Date(), 'MMM d, yyyy')}`
        : null;

      const { data, error } = await supabase
        .from('recording_share_links' as any)
        .insert({
          recording_id: recordingId,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          max_views: maxViews,
          allowed_domains: domains.length > 0 ? domains : null,
          watermark_text: watermarkText,
        })
        .select('share_token')
        .single();

      if (error) throw error;

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/shared-recording/${(data as any).share_token}`;
      setShareLink(link);
      toast.success('Share link created successfully');
    } catch (error: any) {
      console.error('Error creating share link:', error);
      toast.error(error.message || 'Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const resetDialog = () => {
    setShareLink(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDialog(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Share Recording
          </DialogTitle>
          <DialogDescription>
            Create a secure, time-limited link to share "{recordingTitle}"
          </DialogDescription>
        </DialogHeader>

        {!shareLink ? (
          <div className="space-y-6">
            {/* Expiration */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Link expires in
              </Label>
              <div className="flex gap-2">
                {[24, 48, 72, 168].map((hours) => (
                  <Button
                    key={hours}
                    variant={expiresInHours === hours ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExpiresInHours(hours)}
                  >
                    {hours < 48 ? `${hours}h` : `${hours / 24}d`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Max Views */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Maximum views (optional)
              </Label>
              <Input
                type="number"
                placeholder="Unlimited"
                min={1}
                value={maxViews || ''}
                onChange={(e) => setMaxViews(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>

            {/* Domain Restriction */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                Allowed domains (optional)
              </Label>
              <Input
                placeholder="company.com, partner.org"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Leave empty to allow any viewer.
              </p>
            </div>

            {/* Watermark Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Add watermark</Label>
                <p className="text-xs text-muted-foreground">
                  Overlay date and "Confidential" on transcript
                </p>
              </div>
              <Switch checked={addWatermark} onCheckedChange={setAddWatermark} />
            </div>

            <Separator />

            <Button onClick={createShareLink} className="w-full" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating link...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Create Share Link
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">Link created successfully!</span>
              </div>
              
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareLink}
                  className="text-sm font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Expires in {expiresInHours}h
                </Badge>
                {maxViews && (
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Max {maxViews} views
                  </Badge>
                )}
                {addWatermark && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Watermarked
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetDialog} className="flex-1">
                Create Another
              </Button>
              <Button onClick={() => onOpenChange(false)} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
