import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, GripVertical, Trash2, Edit2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Stage {
  name: string;
  order: number;
}

interface PipelineCustomizerProps {
  jobId: string;
  currentStages: Stage[];
  onUpdate: () => void;
}

export const PipelineCustomizer = ({ jobId, currentStages, onUpdate }: PipelineCustomizerProps) => {
  const [stages, setStages] = useState<Stage[]>(currentStages);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const newStage: Stage = {
      name: newStageName,
      order: stages.length,
    };
    setStages([...stages, newStage]);
    setNewStageName("");
  };

  const handleRemoveStage = (index: number) => {
    const updated = stages.filter((_, i) => i !== index).map((stage, i) => ({
      ...stage,
      order: i,
    }));
    setStages(updated);
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    
    const reordered = newStages.map((stage, i) => ({ ...stage, order: i }));
    setStages(reordered);
  };

  const handleRenameStage = (index: number, newName: string) => {
    const updated = stages.map((stage, i) => 
      i === index ? { ...stage, name: newName } : stage
    );
    setStages(updated);
    setEditingIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ pipeline_stages: stages as any })
        .eq('id', jobId);

      if (error) throw error;

      toast.success("Pipeline updated successfully");
      onUpdate();
    } catch (error) {
      console.error('Error updating pipeline:', error);
      toast.error("Failed to update pipeline");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg font-black uppercase">Pipeline Stages</CardTitle>
        <CardDescription>Customize your hiring pipeline stages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-center gap-2 p-3 border rounded bg-card">
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              
              {editingIndex === index ? (
                <Input
                  value={stage.name}
                  onChange={(e) => {
                    const updated = [...stages];
                    updated[index].name = e.target.value;
                    setStages(updated);
                  }}
                  onBlur={() => setEditingIndex(null)}
                  autoFocus
                  className="flex-1"
                />
              ) : (
                <span className="flex-1 font-medium">{stage.name}</span>
              )}

              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveStage(index, 'up')}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMoveStage(index, 'down')}
                  disabled={index === stages.length - 1}
                >
                  ↓
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingIndex(index)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveStage(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="New stage name..."
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
          />
          <Button onClick={handleAddStage}>
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Pipeline
        </Button>
      </CardContent>
    </Card>
  );
};