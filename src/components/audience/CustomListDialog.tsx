import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomList {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface CustomListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  list: CustomList | null;
}

const iconOptions = ['📋', '👥', '⭐', '🎯', '💼', '🏆', '🎨', '🚀', '💡', '🔥'];
const colorOptions = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#14b8a6'];

export const CustomListDialog = ({ isOpen, onClose, onSave, list }: CustomListDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📋');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description);
      setSelectedIcon(list.icon || '📋');
      setSelectedColor(list.color || '#6366f1');
    } else {
      setName('');
      setDescription('');
      setSelectedIcon('📋');
      setSelectedColor('#6366f1');
    }
  }, [list, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    try {
      setSaving(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const listData = {
        user_id: user.user.id,
        name: name.trim(),
        description: description.trim(),
        list_type: 'custom' as const,
        icon: selectedIcon,
        color: selectedColor,
      };

      if (list) {
        // Update existing list
        const { error } = await (supabase as any)
          .from('audience_lists')
          .update(listData)
          .eq('id', list.id);

        if (error) throw error;
        toast.success('List updated');
      } else {
        // Create new list
        const { error } = await (supabase as any)
          .from('audience_lists')
          .insert(listData);

        if (error) throw error;
        toast.success('List created');
      }

      onSave();
    } catch (error) {
      console.error('Error saving list:', error);
      toast.error('Failed to save list');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background/95 backdrop-blur-xl border-white/10">
        <DialogHeader>
          <DialogTitle>{list ? 'Edit List' : 'Create New List'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">List Name</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Board Members, Project Team"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="list-description">Description (Optional)</Label>
            <Textarea
              id="list-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this list for?"
              className="bg-background/50 resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {iconOptions.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-xl transition-all ${
                    selectedIcon === icon
                      ? 'border-primary bg-primary/10 scale-110'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    selectedColor === color
                      ? 'border-primary scale-110'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : list ? 'Update List' : 'Create List'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};