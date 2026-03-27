import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CreateObjectiveDialogProps {
  children: React.ReactNode;
  onObjectiveCreated: () => void;
}

export const CreateObjectiveDialog = ({ children, onObjectiveCreated }: CreateObjectiveDialogProps) => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("club_objectives").insert({
        title: formData.title,
        description: formData.description,
        status: "pending",
        created_by: user.id,
      });

      if (error) throw error;

      toast.success(t('clubTasks.objectiveCreatedSuccessfully'));
      setOpen(false);
      setFormData({ title: "", description: "" });
      onObjectiveCreated();
    } catch (error) {
      console.error("Error creating objective:", error);
      toast.error(t('clubTasks.failedToCreateObjective'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('clubTasks.createNewObjective')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('clubTasks.objectiveTitle ')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Quantum Objectives required"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('clubTasks.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('clubTasks.describeTheObjective')}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('clubTasks.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('clubTasks.creating') : t('clubTasks.createObjective')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
