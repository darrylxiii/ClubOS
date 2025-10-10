import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditProfileSlugDialogProps {
  open: boolean;
  onClose: () => void;
  currentSlug: string;
  userId: string;
  onSuccess: (newSlug: string) => void;
}

export default function EditProfileSlugDialog({
  open,
  onClose,
  currentSlug,
  userId,
  onSuccess,
}: EditProfileSlugDialogProps) {
  const [slug, setSlug] = useState(currentSlug);
  const [saving, setSaving] = useState(false);

  const validateSlug = (value: string): boolean => {
    // Must be lowercase alphanumeric with hyphens only
    const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    return slugRegex.test(value);
  };

  const handleSave = async () => {
    if (!slug.trim()) {
      toast.error("Profile URL cannot be empty");
      return;
    }

    if (!validateSlug(slug)) {
      toast.error("Profile URL can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    if (slug === currentSlug) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      // Check if slug is available
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('profile_slug', slug)
        .single();

      if (existing) {
        toast.error("This profile URL is already taken");
        setSaving(false);
        return;
      }

      // Update the slug
      const { error } = await supabase
        .from('profiles')
        .update({ profile_slug: slug })
        .eq('id', userId);

      if (error) throw error;

      toast.success("Profile URL updated successfully!");
      onSuccess(slug);
      onClose();
    } catch (error: any) {
      console.error('Error updating slug:', error);
      toast.error("Failed to update profile URL");
    } finally {
      setSaving(false);
    }
  };

  const handleSlugChange = (value: string) => {
    // Convert to lowercase and replace invalid characters
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile URL</DialogTitle>
          <DialogDescription>
            Choose a custom URL for your profile. Use lowercase letters, numbers, and hyphens only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Profile URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">thequantumclub.app/profile/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="your-name"
                className="flex-1"
              />
            </div>
            {slug && !validateSlug(slug) && (
              <p className="text-sm text-destructive">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !validateSlug(slug)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
