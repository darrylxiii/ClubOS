import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AudiencePickerButton } from "@/components/audience/AudiencePickerButton";
import type { AudienceSelection } from "@/components/audience/types";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onPostCreated: () => void;
}

export const CreatePostDialog = ({ open, onOpenChange, companyId, onPostCreated }: CreatePostDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    post_type: 'update',
    tags: '',
    is_public: true,
    is_featured: false,
    publish_now: true,
  });
  const [audienceSelection, setAudienceSelection] = useState<AudienceSelection>({
    type: 'company_internal',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to create a post");
      return;
    }

    setLoading(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { data: newPost, error } = await supabase
        .from('company_posts')
        .insert({
          company_id: companyId,
          author_id: user.id,
          title: formData.title,
          content: formData.content,
          post_type: formData.post_type,
          tags: tagsArray,
          is_public: formData.is_public,
          is_featured: formData.is_featured,
          published_at: formData.publish_now ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Save audience settings
      if (newPost) {
        await (supabase as any).from('post_audience_settings').insert({
          post_id: newPost.id,
          post_type: 'company_post',
          audience_type: audienceSelection.type,
          custom_list_ids: audienceSelection.customListIds || [],
          allow_company_internal: audienceSelection.multiSelect?.company || false,
          allow_connections: audienceSelection.multiSelect?.connections || false,
          allow_best_friends: audienceSelection.multiSelect?.bestFriends || false,
          allow_public: audienceSelection.type === 'public',
        });
      }

      toast.success("Post created successfully");
      setFormData({
        title: '',
        content: '',
        post_type: 'update',
        tags: '',
        is_public: true,
        is_featured: false,
        publish_now: true,
      });
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error("Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase">Create Post</DialogTitle>
          <DialogDescription>
            Share news, updates, or announcements with your followers
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Exciting news to share..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post_type">Post Type</Label>
            <Select
              value={formData.post_type}
              onValueChange={(value) => setFormData({ ...formData, post_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="media">Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share your story..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="hiring, product, team"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Audience</Label>
              <AudiencePickerButton
                value={audienceSelection}
                onChange={setAudienceSelection}
                className="w-full justify-start"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_public">Public Post</Label>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_featured">Featured</Label>
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="publish_now">Publish Now</Label>
              <Switch
                id="publish_now"
                checked={formData.publish_now}
                onCheckedChange={(checked) => setFormData({ ...formData, publish_now: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
