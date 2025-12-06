import { useState } from "react";
import { usePipelineStageMappings } from "@/hooks/usePipelineStageMappings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, GripVertical, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
];

export function DealStageEditor() {
  const { dealStages, isLoading } = usePipelineStageMappings();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    color: DEFAULT_COLORS[0],
    probability_weight: 0,
    stage_order: 0,
    stage_type: "active"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      probability_weight: 0,
      stage_order: dealStages?.length || 0,
      stage_type: "active"
    });
    setEditingStage(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (editingStage) {
        const { error } = await supabase
          .from('deal_stages')
          .update({
            name: formData.name,
            color: formData.color,
            probability_weight: formData.probability_weight
          })
          .eq('id', editingStage.id);

        if (error) throw error;
        toast.success("Stage updated successfully");
      } else {
        const { error } = await supabase
          .from('deal_stages')
          .insert({
            name: formData.name,
            color: formData.color,
            probability_weight: formData.probability_weight,
            stage_order: dealStages?.length || 0,
            stage_type: formData.stage_type
          });

        if (error) throw error;
        toast.success("Stage created successfully");
      }
      
      queryClient.invalidateQueries({ queryKey: ['deal-stages'] });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving stage:', error);
      toast.error("Failed to save stage");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (stage: any) => {
    setEditingStage(stage);
    setFormData({
      name: stage.name,
      color: stage.color,
      probability_weight: stage.probability_weight,
      stage_order: stage.stage_order,
      stage_type: stage.stage_type
    });
    setIsAddDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Deal Stages</CardTitle>
          <CardDescription>
            Configure the stages in your deal pipeline
          </CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStage ? "Edit Deal Stage" : "Add Deal Stage"}
              </DialogTitle>
              <DialogDescription>
                Configure a stage in the deal pipeline
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stage-name">Stage Name</Label>
                <Input
                  id="stage-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Qualified, Proposal, Negotiation..."
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color 
                          ? "border-foreground scale-110" 
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Label htmlFor="custom-color" className="text-sm text-muted-foreground">
                    Custom:
                  </Label>
                  <Input
                    id="custom-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-8 p-0 border-0"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#000000"
                    className="w-24"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Win Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.probability_weight}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    probability_weight: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                  }))}
                  placeholder="e.g., 25"
                />
                <p className="text-xs text-muted-foreground">
                  Used for weighted pipeline value calculations (0-100%)
                </p>
              </div>

              {editingStage && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Changing stage names may affect existing mappings and historical analytics.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name || saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingStage ? "Save Changes" : "Add Stage"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Stage Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-center">Probability</TableHead>
              <TableHead className="text-center">Order</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dealStages?.map((stage, index) => (
              <TableRow key={stage.id}>
                <TableCell>
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                </TableCell>
                <TableCell>
                  <Badge 
                    style={{ backgroundColor: stage.color, color: '#fff' }}
                    className="font-medium"
                  >
                    {stage.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {stage.color}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{stage.probability_weight}%</Badge>
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(stage)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
