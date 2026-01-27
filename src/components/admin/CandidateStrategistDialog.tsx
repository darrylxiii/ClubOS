import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useStrategistWorkload } from "@/hooks/useStrategistWorkload";

interface CandidateStrategistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    current_title: string | null;
    assigned_strategist_id: string | null;
  };
  onSuccess?: () => void;
}

export function CandidateStrategistDialog({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}: CandidateStrategistDialogProps) {
  const queryClient = useQueryClient();
  const [selectedStrategist, setSelectedStrategist] = useState<string>(
    candidate.assigned_strategist_id || ""
  );
  const [notes, setNotes] = useState("");

  const { data: workloads, isLoading: loadingWorkloads } = useStrategistWorkload();

  const assignMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ assigned_strategist_id: selectedStrategist || null })
        .eq('id', candidate.id);
      
      if (error) throw error;

      // Log the assignment change via admin_audit_activity
      if (notes.trim()) {
        await supabase.from('admin_audit_activity').insert({
          action_type: 'strategist_assignment_changed',
          action_category: 'candidate_management',
          target_entity: 'candidate_profile',
          target_id: candidate.id,
          admin_id: (await supabase.auth.getUser()).data.user?.id || '',
          metadata: {
            new_strategist_id: selectedStrategist || null,
            notes: notes.trim(),
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates-with-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
      toast.success("Strategist assigned successfully");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to assign strategist");
      console.error(error);
    },
  });

  const getCapacityColor = (percent: number) => {
    if (percent >= 90) return 'text-destructive';
    if (percent >= 70) return 'text-warning';
    return 'text-success';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Strategist</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
            <Avatar className="h-12 w-12">
              <AvatarImage src={candidate.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{candidate.full_name || candidate.email}</p>
              {candidate.current_title && (
                <p className="text-sm text-muted-foreground">{candidate.current_title}</p>
              )}
            </div>
          </div>

          {/* Current Assignment */}
          {candidate.assigned_strategist_id && (
            <div className="text-sm">
              <span className="text-muted-foreground">Currently assigned to: </span>
              <span className="font-medium">
                {workloads?.find(w => w.id === candidate.assigned_strategist_id)?.full_name || 'Unknown'}
              </span>
            </div>
          )}

          {/* Strategist Selection */}
          <div className="space-y-3">
            <Label>Select Strategist</Label>
            {loadingWorkloads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <RadioGroup value={selectedStrategist} onValueChange={setSelectedStrategist}>
                  {workloads?.map((strategist) => (
                    <div
                      key={strategist.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedStrategist === strategist.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border/50 hover:bg-accent/5'
                      }`}
                      onClick={() => setSelectedStrategist(strategist.id)}
                    >
                      <RadioGroupItem value={strategist.id} id={strategist.id} />
                      
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={strategist.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {strategist.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className="font-medium text-sm">{strategist.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {strategist.companyCount} companies • {strategist.candidateCount} candidates
                        </p>
                      </div>

                      <div className="text-right">
                        <Badge 
                          variant={strategist.capacityPercent >= 90 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {strategist.capacityPercent}% capacity
                        </Badge>
                      </div>

                      {selectedStrategist === strategist.id && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}

                  {/* Option to remove assignment */}
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStrategist === ''
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:bg-accent/5'
                    }`}
                    onClick={() => setSelectedStrategist('')}
                  >
                    <RadioGroupItem value="" id="none" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-muted-foreground">No strategist</p>
                      <p className="text-xs text-muted-foreground">Remove current assignment</p>
                    </div>
                    {selectedStrategist === '' && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </RadioGroup>
              </ScrollArea>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Assignment Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., High-priority candidate for fintech roles"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {selectedStrategist ? 'Assign Strategist' : 'Remove Assignment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
