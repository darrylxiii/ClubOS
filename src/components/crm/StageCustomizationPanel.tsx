import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Settings, Plus, GripVertical, Trash2, Edit2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CRMStage {
  id: string;
  name: string;
  color: string;
  probability: number;
  sort_order: number;
  is_active: boolean;
}

const DEFAULT_STAGES: CRMStage[] = [
  { id: 'new', name: 'New', color: 'gray', probability: 10, sort_order: 0, is_active: true },
  { id: 'contacted', name: 'Contacted', color: 'blue', probability: 20, sort_order: 1, is_active: true },
  { id: 'replied', name: 'Replied', color: 'cyan', probability: 40, sort_order: 2, is_active: true },
  { id: 'qualified', name: 'Qualified', color: 'green', probability: 60, sort_order: 3, is_active: true },
  { id: 'meeting_booked', name: 'Meeting Booked', color: 'yellow', probability: 75, sort_order: 4, is_active: true },
  { id: 'proposal_sent', name: 'Proposal Sent', color: 'orange', probability: 80, sort_order: 5, is_active: true },
  { id: 'negotiation', name: 'Negotiation', color: 'purple', probability: 90, sort_order: 6, is_active: true },
  { id: 'closed_won', name: 'Closed Won', color: 'emerald', probability: 100, sort_order: 7, is_active: true },
  { id: 'closed_lost', name: 'Closed Lost', color: 'red', probability: 0, sort_order: 8, is_active: true },
];

const COLOR_OPTIONS = [
  { name: 'gray', class: 'bg-gray-500' },
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'cyan', class: 'bg-cyan-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'yellow', class: 'bg-yellow-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'emerald', class: 'bg-emerald-500' },
];

interface SortableStageItemProps {
  stage: CRMStage;
  getColorClass: (color: string) => string;
  onEdit: (stage: CRMStage) => void;
  onDelete: (stageId: string) => void;
}

function SortableStageItem({ stage, getColorClass, onEdit, onDelete }: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${
        isDragging ? 'shadow-lg ring-2 ring-primary' : ''
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className={`w-4 h-4 rounded-full ${getColorClass(stage.color)}`} />
      <span className="font-medium flex-1">{stage.name}</span>
      <Badge variant="outline">{stage.probability}% probability</Badge>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(stage)}
      >
        <Edit2 className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(stage.id)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function StageCustomizationPanel() {
  const [stages, setStages] = useState<CRMStage[]>(DEFAULT_STAGES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStage, setEditingStage] = useState<CRMStage | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('blue');
  const [newStageProbability, setNewStageProbability] = useState(50);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_stage_config' as any)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.log('Using default stages');
        setStages(DEFAULT_STAGES);
      } else if (data && data.length > 0) {
        setStages(data as unknown as CRMStage[]);
      }
    } catch (error) {
      console.error('Error loading stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);

    const reordered = arrayMove(stages, oldIndex, newIndex);
    const updated = reordered.map((stage, index) => ({
      ...stage,
      sort_order: index,
    }));

    setStages(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const stage of stages) {
        const { error } = await supabase
          .from('crm_stage_config' as any)
          .upsert({
            id: stage.id,
            name: stage.name,
            color: stage.color,
            probability: stage.probability,
            sort_order: stage.sort_order,
            is_active: stage.is_active,
          });

        if (error) throw error;
      }

      toast.success('Pipeline stages saved successfully');
    } catch (error) {
      console.error('Error saving stages:', error);
      toast.error('Failed to save stages');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) {
      toast.error('Please enter a stage name');
      return;
    }

    const newStage: CRMStage = {
      id: `custom_${Date.now()}`,
      name: newStageName.trim(),
      color: newStageColor,
      probability: newStageProbability,
      sort_order: stages.length,
      is_active: true,
    };

    setStages([...stages, newStage]);
    setShowAddDialog(false);
    setNewStageName('');
    setNewStageColor('blue');
    setNewStageProbability(50);
    toast.success('Stage added');
  };

  const handleUpdateStage = (updatedStage: CRMStage) => {
    setStages(stages.map(s => s.id === updatedStage.id ? updatedStage : s));
    setEditingStage(null);
  };

  const handleDeleteStage = (stageId: string) => {
    setStages(stages.filter(s => s.id !== stageId));
    toast.success('Stage removed');
  };

  const getColorClass = (colorName: string) => {
    return COLOR_OPTIONS.find(c => c.name === colorName)?.class || 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Pipeline Stages
            </CardTitle>
            <CardDescription>
              Customize your CRM pipeline stages, colors, and win probabilities
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Stage
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Stage</DialogTitle>
                  <DialogDescription>
                    Create a new stage for your CRM pipeline
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Stage Name</Label>
                    <Input
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="e.g., Discovery Call"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => setNewStageColor(color.name)}
                          className={`w-8 h-8 rounded-full ${color.class} ${
                            newStageColor === color.name ? 'ring-2 ring-offset-2 ring-primary' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Win Probability: {newStageProbability}%</Label>
                    <Slider
                      value={[newStageProbability]}
                      onValueChange={([v]) => setNewStageProbability(v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStage}>Add Stage</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {stages.map((stage) => (
                <SortableStageItem
                  key={stage.id}
                  stage={stage}
                  getColorClass={getColorClass}
                  onEdit={setEditingStage}
                  onDelete={handleDeleteStage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Edit Stage Dialog */}
        <Dialog open={!!editingStage} onOpenChange={() => setEditingStage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stage</DialogTitle>
            </DialogHeader>
            {editingStage && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Stage Name</Label>
                  <Input
                    value={editingStage.name}
                    onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setEditingStage({ ...editingStage, color: color.name })}
                        className={`w-8 h-8 rounded-full ${color.class} ${
                          editingStage.color === color.name ? 'ring-2 ring-offset-2 ring-primary' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Win Probability: {editingStage.probability}%</Label>
                  <Slider
                    value={[editingStage.probability]}
                    onValueChange={([v]) => setEditingStage({ ...editingStage, probability: v })}
                    min={0}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingStage(null)}>
                Cancel
              </Button>
              <Button onClick={() => editingStage && handleUpdateStage(editingStage)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
