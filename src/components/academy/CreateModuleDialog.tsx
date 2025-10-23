import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen } from "lucide-react";

interface CreateModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  onSuccess: () => void;
  nextDisplayOrder: number;
}

export const CreateModuleDialog = ({
  open,
  onOpenChange,
  courseId,
  onSuccess,
  nextDisplayOrder,
}: CreateModuleDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    estimated_minutes: "",
    video_url: "",
    image_url: "",
  });
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("modules")
        .insert({
          course_id: courseId,
          title: formData.title,
          slug,
          description: formData.description,
          estimated_minutes: formData.estimated_minutes 
            ? parseInt(formData.estimated_minutes) 
            : null,
          video_url: formData.video_url || null,
          image_url: formData.image_url || null,
          display_order: nextDisplayOrder,
          created_by: user.id,
          is_published: false,
        });

      if (error) throw error;

      toast({
        title: "Module created",
        description: "Your module has been created successfully.",
      });

      onOpenChange(false);
      onSuccess();
      setFormData({
        title: "",
        description: "",
        estimated_minutes: "",
        video_url: "",
        image_url: "",
      });
    } catch (error: any) {
      toast({
        title: "Error creating module",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="squircle max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Create New Module
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Module Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to React Hooks"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will students learn in this module?"
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="estimated_minutes">Estimated Time (minutes)</Label>
            <Input
              id="estimated_minutes"
              type="number"
              min="1"
              value={formData.estimated_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
              placeholder="e.g., 45"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Module
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
