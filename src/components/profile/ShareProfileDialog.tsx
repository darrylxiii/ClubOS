import { useState, useEffect } from "react";
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

      toast.success("Share link generated!");
      await loadActiveLinks();
    } catch (error: unknown) {
      console.error("Error generating share link:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate share link");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = `https://thequantumclub.app/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteShareLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("profile_share_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      toast.success("Share link deleted");
      await loadActiveLinks();
    } catch (error: unknown) {
      console.error("Error deleting share link:", error);
      toast.error("Failed to delete share link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Profile</DialogTitle>
          <DialogDescription>
            Generate a temporary link to share your profile with anyone, even if they're not logged in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generate New Link */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="72">72 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={generateShareLink}
              disabled={generating}
              className="w-full"
            >
              {generating ? "Generating..." : "Generate Share Link"}
            </Button>
          </div>

          {/* Active Links */}
          {!loading && activeLinks.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Active Share Links</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activeLinks.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 border rounded-lg space-y-2 bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={`https://thequantumclub.app/share/${link.token}`}
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
                        Expires{" "}
                        {formatDistanceToNow(new Date(link.expires_at), {
                          addSuffix: true,
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {link.view_count} views
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
