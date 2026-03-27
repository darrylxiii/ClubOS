import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Copy, Check, ExternalLink, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ShareProfileDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

interface ShareLink {
  id: string;
  token: string;
  expires_at: string;
  created_at: string;
  view_count: number;
  last_viewed_at: string | null;
}

export const ShareProfileDialog = ({ open, onClose, userId }: ShareProfileDialogProps) => {
  const { t } = useTranslation('common');
  const [duration, setDuration] = useState<string>("24");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeLinks, setActiveLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadActiveLinks();
    }
  }, [open]);

  const loadActiveLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profile_share_links")
        .select("*")
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActiveLinks(data || []);
    } catch (error) {
      console.error("Error loading share links:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = async () => {
    setGenerating(true);
    try {
      // Generate token
      const { data: tokenData, error: tokenError } = await supabase.rpc("generate_share_token");
      if (tokenError) throw tokenError;

      const token = tokenData;
      const hoursToAdd = parseInt(duration);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + hoursToAdd);

      // Create share link
      const { error: insertError } = await supabase
        .from("profile_share_links")
        .insert({
          user_id: userId,
          token,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) throw insertError;

      toast.success(t('shareProfileDialog.linkGenerated', 'Share link generated!'));
      await loadActiveLinks();
    } catch (error: unknown) {
      console.error("Error generating share link:", error);
      toast.error(error instanceof Error ? error.message : t('shareProfileDialog.failedToGenerate', 'Failed to generate share link'));
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = `https://os.thequantumclub.com/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t('shareProfileDialog.linkCopied', 'Link copied to clipboard!'));
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteShareLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("profile_share_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      toast.success(t('shareProfileDialog.linkDeleted', 'Share link deleted'));
      await loadActiveLinks();
    } catch (error: unknown) {
      console.error("Error deleting share link:", error);
      toast.error(t('shareProfileDialog.failedToDelete', 'Failed to delete share link'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('profile.shareYourProfile')}</DialogTitle>
          <DialogDescription>
            {t('profile.shareProfileDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generate New Link */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.linkDuration')}</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('profile.hours', { count: 1 })}</SelectItem>
                  <SelectItem value="6">{t('profile.hours', { count: 6 })}</SelectItem>
                  <SelectItem value="12">{t('profile.hours', { count: 12 })}</SelectItem>
                  <SelectItem value="24">{t('profile.hours', { count: 24 })}</SelectItem>
                  <SelectItem value="48">{t('profile.hours', { count: 48 })}</SelectItem>
                  <SelectItem value="72">{t('profile.hours', { count: 72 })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={generateShareLink}
              disabled={generating}
              className="w-full"
            >
              {generating ? t('common:status.generating') : t('profile.generateShareLink')}
            </Button>
          </div>

          {/* Active Links */}
          {!loading && activeLinks.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t('profile.activeShareLinks')}</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 border rounded-lg space-y-2 bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={`https://os.thequantumclub.com/share/${link.token}`}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(link.token)}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          window.open(`/share/${link.token}`, "_blank")
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteShareLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {t('shareProfileDialog.expires', 'Expires')}{" "}
                        {formatDistanceToNow(new Date(link.expires_at), {
                          addSuffix: true,
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {link.view_count} {t('profile.views')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareProfileDialog;
