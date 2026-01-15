import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCog } from "lucide-react";

interface StrategistAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: {
    id: string;
    name: string;
  };
}

interface Strategist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string | null;
}

export function StrategistAssignmentDialog({
  open,
  onOpenChange,
  company,
}: StrategistAssignmentDialogProps) {
  const queryClient = useQueryClient();
  const [selectedStrategistId, setSelectedStrategistId] = useState<string>("");
  const [slaDays, setSlaDays] = useState<number>(3);
  const [commissionSplit, setCommissionSplit] = useState<number>(20);

  // Fetch available strategists
  const { data: strategists, isLoading: loadingStrategists } = useQuery({
    queryKey: ["strategists-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", 
          (await supabase
            .from("user_roles")
            .select("user_id")
            .in("role", ["strategist", "admin"])
          ).data?.map(r => r.user_id) || []
        );

      if (error) throw error;
      return (data || []) as Strategist[];
    },
  });

  // Fetch current assignment
  const { data: currentAssignment, isLoading: loadingAssignment } = useQuery({
    queryKey: ["company-strategist-assignment", company.id],
    queryFn: async (): Promise<{
      id: string;
      strategist_id: string;
      sla_response_hours: number | null;
      commission_split_percentage: number | null;
      strategist: { id: string; full_name: string; avatar_url: string | null } | null;
    } | null> => {
      const { data, error } = await supabase
        .from("company_strategist_assignments" as any)
        .select("id, strategist_id, sla_response_hours, commission_split_percentage")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const assignmentData = data as unknown as {
        id: string;
        strategist_id: string;
        sla_response_hours: number | null;
        commission_split_percentage: number | null;
      };

      // Fetch strategist profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", assignmentData.strategist_id)
        .maybeSingle();

      return {
        ...assignmentData,
        strategist: profile ? {
          id: profile.id,
          full_name: profile.full_name ?? 'Unknown',
          avatar_url: profile.avatar_url,
        } : null,
      };
    },
    enabled: open,
  });

  // Set initial values from current assignment
  useEffect(() => {
    if (currentAssignment) {
      setSelectedStrategistId(currentAssignment.strategist_id);
      setSlaDays(Math.round((currentAssignment.sla_response_hours || 72) / 24));
      setCommissionSplit(currentAssignment.commission_split_percentage || 20);
    } else {
      setSelectedStrategistId("");
      setSlaDays(3);
      setCommissionSplit(20);
    }
  }, [currentAssignment]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStrategistId) {
        throw new Error("Please select a strategist");
      }

      // Deactivate any existing assignments
      await supabase
        .from("company_strategist_assignments" as any)
        .update({ is_active: false })
        .eq("company_id", company.id);

      // Create new assignment
      const { error } = await supabase
        .from("company_strategist_assignments" as any)
        .insert({
          company_id: company.id,
          strategist_id: selectedStrategistId,
          sla_response_hours: slaDays * 24,
          commission_split_percentage: commissionSplit,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Strategist assigned to ${company.name}`);
      queryClient.invalidateQueries({ queryKey: ["company-strategist-assignment", company.id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Assignment error:", error);
      toast.error("Failed to assign strategist");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("company_strategist_assignments" as any)
        .update({ is_active: false })
        .eq("company_id", company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Strategist assignment removed");
      queryClient.invalidateQueries({ queryKey: ["company-strategist-assignment", company.id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setSelectedStrategistId("");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Remove error:", error);
      toast.error("Failed to remove assignment");
    },
  });

  const selectedStrategist = strategists?.find(s => s.id === selectedStrategistId);
  const isLoading = loadingStrategists || loadingAssignment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Assign Strategist
          </DialogTitle>
          <DialogDescription>
            Assign a strategist to manage {company.name}. The strategist will receive commission splits on placements.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Assignment */}
            {currentAssignment && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-2">Current Assignment</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentAssignment.strategist?.avatar_url || undefined} />
                    <AvatarFallback>
                      {currentAssignment.strategist?.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {currentAssignment.strategist?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {commissionSplit}% commission split
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </div>
            )}

            {/* Strategist Selection */}
            <div className="space-y-2">
              <Label>Select Strategist</Label>
              <Select
                value={selectedStrategistId}
                onValueChange={setSelectedStrategistId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a strategist..." />
                </SelectTrigger>
                <SelectContent>
                  {strategists?.map((strategist) => (
                    <SelectItem key={strategist.id} value={strategist.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={strategist.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {strategist.full_name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{strategist.full_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SLA Response Time */}
            <div className="space-y-2">
              <Label htmlFor="sla">SLA Response Time (days)</Label>
              <Input
                id="sla"
                type="number"
                min={1}
                max={14}
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum days to respond to client requests
              </p>
            </div>

            {/* Commission Split */}
            <div className="space-y-2">
              <Label htmlFor="split">Commission Split (%)</Label>
              <Input
                id="split"
                type="number"
                min={0}
                max={50}
                value={commissionSplit}
                onChange={(e) => setCommissionSplit(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Percentage of placement commission for strategist
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              {currentAssignment && (
                <Button
                  variant="outline"
                  onClick={() => removeMutation.mutate()}
                  disabled={removeMutation.isPending}
                >
                  Remove Assignment
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => assignMutation.mutate()}
                  disabled={!selectedStrategistId || assignMutation.isPending}
                >
                  {assignMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {currentAssignment ? "Update" : "Assign"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
