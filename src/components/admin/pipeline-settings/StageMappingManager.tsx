import { useState } from "react";
import { usePipelineStageMappings, PipelineStageMapping } from "@/hooks/usePipelineStageMappings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, ArrowRight, TestTube, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type MatchType = 'exact' | 'contains' | 'starts_with' | 'ends_with';

const MATCH_TYPES: { value: MatchType; label: string; description: string }[] = [
  { value: 'exact', label: 'Exact Match', description: 'Stage name must match exactly' },
  { value: 'contains', label: 'Contains', description: 'Stage name contains pattern' },
  { value: 'starts_with', label: 'Starts With', description: 'Stage name starts with pattern' },
  { value: 'ends_with', label: 'Ends With', description: 'Stage name ends with pattern' },
];

export function StageMappingManager() {
  const { 
    mappings, 
    dealStages, 
    isLoading, 
    createMapping, 
    updateMapping, 
    deleteMapping,
    backfillDealStages,
    testMapping 
  } = usePipelineStageMappings();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PipelineStageMapping | null>(null);
  const [testPattern, setTestPattern] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    job_stage_pattern: "",
    deal_stage_id: "",
    priority: 10,
    match_type: "exact" as MatchType,
    description: ""
  });

  const resetForm = () => {
    setFormData({
      job_stage_pattern: "",
      deal_stage_id: "",
      priority: 10,
      match_type: "exact",
      description: ""
    });
    setEditingMapping(null);
  };

  const handleSubmit = () => {
    if (editingMapping) {
      updateMapping.mutate({
        id: editingMapping.id,
        job_stage_pattern: formData.job_stage_pattern,
        deal_stage_id: formData.deal_stage_id,
        priority: formData.priority,
        match_type: formData.match_type,
        description: formData.description
      });
    } else {
      createMapping.mutate({
        job_stage_pattern: formData.job_stage_pattern,
        deal_stage_id: formData.deal_stage_id,
        priority: formData.priority,
        match_type: formData.match_type,
        description: formData.description,
        is_default: true,
        created_by: null
      });
    }
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = (mapping: PipelineStageMapping) => {
    setEditingMapping(mapping);
    setFormData({
      job_stage_pattern: mapping.job_stage_pattern,
      deal_stage_id: mapping.deal_stage_id || "",
      priority: mapping.priority,
      match_type: mapping.match_type,
      description: mapping.description || ""
    });
    setIsAddDialogOpen(true);
  };

  const handleTest = () => {
    if (testPattern.trim()) {
      const result = testMapping(testPattern);
      setTestResult(result);
    }
  };

  const getDealStageBadge = (stage?: { name: string; color: string }) => {
    if (!stage) return <Badge variant="outline">Not Mapped</Badge>;
    return (
      <Badge 
        style={{ backgroundColor: stage.color, color: '#fff' }}
        className="font-medium"
      >
        {stage.name}
      </Badge>
    );
  };

  const getMatchTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      exact: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      contains: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      starts_with: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      ends_with: "bg-amber-500/10 text-amber-500 border-amber-500/20"
    };
    return (
      <Badge variant="outline" className={cn("capitalize", colors[type])}>
        {type.replace('_', ' ')}
      </Badge>
    );
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
    <div className="space-y-6">
      {/* Test Mapping Tool */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TestTube className="h-5 w-5 text-primary" />
            Test Stage Mapping
          </CardTitle>
          <CardDescription>
            Enter a job pipeline stage name to see which deal stage it would map to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="test-pattern">Job Stage Name</Label>
              <Input
                id="test-pattern"
                value={testPattern}
                onChange={(e) => setTestPattern(e.target.value)}
                placeholder="e.g., Technical Interview, Screening, Final Round..."
                className="mt-1.5"
              />
            </div>
            <Button onClick={handleTest} variant="secondary">
              <TestTube className="h-4 w-4 mr-2" />
              Test
            </Button>
          </div>
          {testResult && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 flex items-center gap-3">
              <span className="text-muted-foreground">"{testPattern}"</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge className="bg-primary text-primary-foreground">{testResult}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mappings Table */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Stage Mappings</CardTitle>
            <CardDescription>
              Configure how job pipeline stages map to deal pipeline stages
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => backfillDealStages.mutate()}
              disabled={backfillDealStages.isPending}
            >
              {backfillDealStages.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recalculate All
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Mapping
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingMapping ? "Edit Stage Mapping" : "Add Stage Mapping"}
                  </DialogTitle>
                  <DialogDescription>
                    Map a job pipeline stage pattern to a deal pipeline stage
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="pattern">Job Stage Pattern</Label>
                    <Input
                      id="pattern"
                      value={formData.job_stage_pattern}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_stage_pattern: e.target.value }))}
                      placeholder="e.g., Interview, Screening, Offer..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="match-type">Match Type</Label>
                    <Select
                      value={formData.match_type}
                      onValueChange={(value: MatchType) => 
                        setFormData(prev => ({ ...prev, match_type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATCH_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <span className="font-medium">{type.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({type.description})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deal-stage">Deal Stage</Label>
                    <Select
                      value={formData.deal_stage_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, deal_stage_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select deal stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {dealStages?.map(stage => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: stage.color }}
                              />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      placeholder="Higher priority wins on conflicts"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher priority mappings take precedence when multiple patterns match
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Explain when this mapping applies..."
                      rows={2}
                    />
                  </div>
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
                    disabled={!formData.job_stage_pattern || !formData.deal_stage_id}
                  >
                    {editingMapping ? "Save Changes" : "Add Mapping"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Stage Pattern</TableHead>
                <TableHead>Match Type</TableHead>
                <TableHead>Deal Stage</TableHead>
                <TableHead className="text-center">Priority</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings?.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-medium">
                    {mapping.job_stage_pattern}
                  </TableCell>
                  <TableCell>
                    {getMatchTypeBadge(mapping.match_type)}
                  </TableCell>
                  <TableCell>
                    {getDealStageBadge(mapping.deal_stage)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{mapping.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                    {mapping.description || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(mapping)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMapping.mutate(mapping.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!mappings || mappings.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No mappings configured. Add your first mapping to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
