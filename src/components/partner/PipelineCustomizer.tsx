import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical, Trash2, Edit2, Save, Sparkles, Building2, Users } from "lucide-react";
import { toast } from "sonner";
import { usePipelineManagement } from "@/hooks/usePipelineManagement";
import { cn } from "@/lib/utils";

interface Stage {
  name: string;
  order: number;
  owner?: 'company' | 'quantum_club';
  format?: 'online' | 'in_person' | 'hybrid';
  resources?: string[];
  description?: string;
}

interface PipelineCustomizerProps {
  jobId: string;
  currentStages: Stage[];
  onUpdate: () => void;
}

export const PipelineCustomizer = ({ jobId, currentStages, onUpdate }: PipelineCustomizerProps) => {
  const [stages, setStages] = useState<Stage[]>(currentStages);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const { saving, savePipeline, addStage, removeStage } = usePipelineManagement(jobId);

  const handleAddStage = async () => {
    if (!newStageName.trim()) return;
    
    const newStage: Stage = {
      name: newStageName,
      order: stages.length,
      owner: 'company',
      format: 'online',
      resources: [],
      description: ''
    };

    const result = await addStage(stages, newStage);
    if (result.success) {
      setStages([...stages, newStage]);
      setNewStageName("");
      toast.success("Stage added", { 
        description: "Pipeline updated with confetti sparkle ✨",
        duration: 3000 
      });
      onUpdate();
    }
  };

  const handleRemoveStage = async (index: number) => {
    const result = await removeStage(stages, index);
    if (result.success) {
      const updated = stages.filter((_, i) => i !== index).map((stage, i) => ({
        ...stage,
        order: i,
      }));
      setStages(updated);
      toast.success("Stage removed");
      onUpdate();
    }
  };

  const handleMoveStage = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stages.length - 1) return;

    const newStages = [...stages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    
    const reordered = newStages.map((stage, i) => ({ ...stage, order: i }));
    setStages(reordered);
  };

  const handleUpdateStage = (index: number, field: keyof Stage, value: any) => {
    const updated = stages.map((stage, i) => 
      i === index ? { ...stage, [field]: value } : stage
    );
    setStages(updated);
  };

  const handleSave = async () => {
    const result = await savePipeline(stages);
    if (result.success) {
      toast.success("Pipeline saved", { 
        description: "Signature Secure ✓",
        duration: 3000 
      });
      onUpdate();
    }
  };

  const getOwnerIcon = (owner?: string) => {
    return owner === 'quantum_club' ? Users : Building2;
  };

  const getFormatBadge = (format?: string) => {
    const colors = {
      online: 'bg-accent/20 text-accent border-accent/30',
      in_person: 'bg-primary/20 text-primary border-primary/30',
      hybrid: 'bg-secondary/20 text-secondary border-secondary/30'
    };
    return colors[format as keyof typeof colors] || colors.online;
  };

  return (
    <Card className="border-2 backdrop-blur-xl bg-background/80">
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          <CardTitle className="text-lg font-black uppercase bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
            Premium Pipeline Editor
          </CardTitle>
        </div>
        <CardDescription>Customize your exclusive hiring pipeline stages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const OwnerIcon = getOwnerIcon(stage.owner);
            const isExpanded = expandedIndex === index;
            
            return (
              <div 
                key={index} 
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 transition-all duration-300",
                  "bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm",
                  isExpanded ? "border-accent shadow-lg shadow-accent/20" : "border-border/50 hover:border-accent/50",
                  "hover:shadow-md"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative p-4">
                  {/* Stage Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-accent transition-colors" />
                    
                    {editingIndex === index ? (
                      <Input
                        value={stage.name}
                        onChange={(e) => handleUpdateStage(index, 'name', e.target.value)}
                        onBlur={() => setEditingIndex(null)}
                        autoFocus
                        className="flex-1 border-accent"
                      />
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-bold text-lg">{stage.name}</span>
                        <OwnerIcon className="w-4 h-4 text-muted-foreground" />
                        {stage.format && (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-semibold border",
                            getFormatBadge(stage.format)
                          )}>
                            {stage.format}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveStage(index, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 p-0 hover:bg-accent/20"
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveStage(index, 'down')}
                        disabled={index === stages.length - 1}
                        className="h-8 w-8 p-0 hover:bg-accent/20"
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        className="h-8 w-8 p-0 hover:bg-primary/20"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveStage(index)}
                        className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="space-y-4 pt-4 border-t border-border/50 animate-fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Stage Owner</Label>
                          <Select
                            value={stage.owner || 'company'}
                            onValueChange={(value) => handleUpdateStage(index, 'owner', value)}
                          >
                            <SelectTrigger className="border-accent/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="company">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  Our Team
                                </div>
                              </SelectItem>
                              <SelectItem value="quantum_club">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  Quantum Club Elite
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Format</Label>
                          <Select
                            value={stage.format || 'online'}
                            onValueChange={(value) => handleUpdateStage(index, 'format', value)}
                          >
                            <SelectTrigger className="border-primary/50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="online">Online</SelectItem>
                              <SelectItem value="in_person">In-Person</SelectItem>
                              <SelectItem value="hybrid">Hybrid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Description</Label>
                        <Textarea
                          value={stage.description || ''}
                          onChange={(e) => handleUpdateStage(index, 'description', e.target.value)}
                          placeholder="Describe what happens in this stage..."
                          className="border-accent/50 min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Stage */}
        <div className="flex gap-2 pt-2">
          <Input
            placeholder="New stage name..."
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
            className="border-accent/50 focus:border-accent"
          />
          <Button 
            onClick={handleAddStage}
            className="bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving} 
          className="w-full h-12 bg-gradient-to-r from-primary to-accent font-black uppercase tracking-wide hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Securing...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Signature Secure Save
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
