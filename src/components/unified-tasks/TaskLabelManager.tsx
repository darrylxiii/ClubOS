import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Tag, Plus, X, Check, Loader2 } from "lucide-react";

interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

interface TaskLabelManagerProps {
  taskId: string;
  assignedLabels: TaskLabel[];
  onLabelsChange: () => void;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", 
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280", "#1f2937"
];

export const TaskLabelManager = ({ taskId, assignedLabels, onLabelsChange }: TaskLabelManagerProps) => {
  const { user } = useAuth();
  const [allLabels, setAllLabels] = useState<TaskLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("task_labels")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setAllLabels(data || []);
    } catch (error) {
      console.error("Error loading labels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!user || !newLabelName.trim()) return;
    
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("task_labels")
        .insert({
          name: newLabelName.trim(),
          color: newLabelColor,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setAllLabels([...allLabels, data]);
      setNewLabelName("");
      setCreateDialogOpen(false);
      toast.success("Label created");
    } catch (error) {
      console.error("Error creating label:", error);
      toast.error("Failed to create label");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleLabel = async (label: TaskLabel) => {
    const isAssigned = assignedLabels.some(l => l.id === label.id);
    
    try {
      if (isAssigned) {
        const { error } = await supabase
          .from("task_label_assignments")
          .delete()
          .eq("task_id", taskId)
          .eq("label_id", label.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("task_label_assignments")
          .insert({ task_id: taskId, label_id: label.id });

        if (error) throw error;
      }
      
      onLabelsChange();
    } catch (error) {
      console.error("Error toggling label:", error);
      toast.error("Failed to update label");
    }
  };

  const handleRemoveLabel = async (labelId: string) => {
    try {
      const { error } = await supabase
        .from("task_label_assignments")
        .delete()
        .eq("task_id", taskId)
        .eq("label_id", labelId);

      if (error) throw error;
      onLabelsChange();
    } catch (error) {
      console.error("Error removing label:", error);
      toast.error("Failed to remove label");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {assignedLabels.map(label => (
          <Badge
            key={label.id}
            style={{ backgroundColor: label.color }}
            className="text-white flex items-center gap-1 pr-1"
          >
            {label.name}
            <button
              onClick={() => handleRemoveLabel(label.id)}
              className="ml-1 hover:bg-white/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 gap-1">
              <Tag className="h-3 w-3" />
              Add Label
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search labels..." />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2">
                    <p className="text-sm text-muted-foreground mb-2">No labels found</p>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="w-full gap-1">
                          <Plus className="h-3 w-3" />
                          Create Label
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Label</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={newLabelName}
                              onChange={e => setNewLabelName(e.target.value)}
                              placeholder="Label name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Color</Label>
                            <div className="flex gap-2 flex-wrap">
                              {PRESET_COLORS.map(color => (
                                <button
                                  key={color}
                                  onClick={() => setNewLabelColor(color)}
                                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                                  style={{ 
                                    backgroundColor: color,
                                    borderColor: newLabelColor === color ? 'white' : 'transparent',
                                    boxShadow: newLabelColor === color ? '0 0 0 2px black' : 'none'
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <Button 
                            onClick={handleCreateLabel} 
                            disabled={creating || !newLabelName.trim()}
                            className="w-full"
                          >
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {allLabels.map(label => {
                    const isAssigned = assignedLabels.some(l => l.id === label.id);
                    return (
                      <CommandItem
                        key={label.id}
                        onSelect={() => handleToggleLabel(label)}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1">{label.name}</span>
                        {isAssigned && <Check className="h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
