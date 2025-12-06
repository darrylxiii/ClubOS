import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, Percent, DollarSign, Shuffle, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type FeeType = "percentage" | "fixed" | "hybrid";

interface CompanyFeeData {
  id: string;
  name: string;
  fee_type: FeeType;
  placement_fee_percentage: number | null;
  placement_fee_fixed: number | null;
  default_fee_notes: string | null;
}

interface CompanyFeeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyFeeData | null;
}

export function CompanyFeeConfigDialog({
  open,
  onOpenChange,
  company,
}: CompanyFeeConfigDialogProps) {
  const queryClient = useQueryClient();
  const [feeType, setFeeType] = useState<FeeType>("percentage");
  const [percentage, setPercentage] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (company) {
      setFeeType(company.fee_type || "percentage");
      setPercentage(company.placement_fee_percentage?.toString() || "20");
      setFixedAmount(company.placement_fee_fixed?.toString() || "");
      setNotes(company.default_fee_notes || "");
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("No company selected");

      const updates: Record<string, any> = {
        fee_type: feeType,
        default_fee_notes: notes || null,
      };

      if (feeType === "percentage") {
        const pct = parseFloat(percentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
          throw new Error("Percentage must be between 0 and 100");
        }
        updates.placement_fee_percentage = pct;
        updates.placement_fee_fixed = null;
      } else if (feeType === "fixed") {
        const fixed = parseFloat(fixedAmount);
        if (isNaN(fixed) || fixed < 0) {
          throw new Error("Fixed amount must be a positive number");
        }
        updates.placement_fee_fixed = fixed;
        updates.placement_fee_percentage = null;
      } else {
        // Hybrid - both values
        const pct = parseFloat(percentage);
        const fixed = parseFloat(fixedAmount);
        if (isNaN(pct) || pct < 0 || pct > 100) {
          throw new Error("Percentage must be between 0 and 100");
        }
        updates.placement_fee_percentage = pct;
        updates.placement_fee_fixed = isNaN(fixed) ? null : fixed;
      }

      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-fees"] });
      queryClient.invalidateQueries({ queryKey: ["deal-pipeline"] });
      toast.success("Company fee configuration updated");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update fee configuration");
    },
  });

  const getPreviewText = () => {
    if (feeType === "percentage") {
      const pct = parseFloat(percentage) || 20;
      return `${pct}% of candidate salary (e.g., €${((75000 * pct) / 100).toLocaleString()} on €75,000 salary)`;
    }
    if (feeType === "fixed") {
      const fixed = parseFloat(fixedAmount) || 0;
      return `Fixed fee of €${fixed.toLocaleString()} per placement`;
    }
    // Hybrid
    const pct = parseFloat(percentage) || 20;
    const fixed = parseFloat(fixedAmount) || 0;
    return `Default ${pct}%, with option for fixed €${fixed.toLocaleString()} on specific roles`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure Fees for {company?.name}
          </DialogTitle>
          <DialogDescription>
            Set how placement fees are calculated for this company
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fee Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fee Structure Type</Label>
            <RadioGroup
              value={feeType}
              onValueChange={(v) => setFeeType(v as FeeType)}
              className="grid grid-cols-3 gap-3"
            >
              <Label
                htmlFor="percentage"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  feeType === "percentage"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="percentage" id="percentage" className="sr-only" />
                <Percent className="h-6 w-6" />
                <span className="text-sm font-medium">Percentage</span>
                <span className="text-xs text-muted-foreground text-center">
                  % of salary
                </span>
              </Label>

              <Label
                htmlFor="fixed"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  feeType === "fixed"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="fixed" id="fixed" className="sr-only" />
                <DollarSign className="h-6 w-6" />
                <span className="text-sm font-medium">Fixed Fee</span>
                <span className="text-xs text-muted-foreground text-center">
                  Set amount
                </span>
              </Label>

              <Label
                htmlFor="hybrid"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  feeType === "hybrid"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value="hybrid" id="hybrid" className="sr-only" />
                <Shuffle className="h-6 w-6" />
                <span className="text-sm font-medium">Hybrid</span>
                <span className="text-xs text-muted-foreground text-center">
                  Choose per role
                </span>
              </Label>
            </RadioGroup>
          </div>

          {/* Fee Values */}
          <div className="space-y-4">
            {(feeType === "percentage" || feeType === "hybrid") && (
              <div className="space-y-2">
                <Label htmlFor="percentage-input">Fee Percentage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="percentage-input"
                    type="number"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    min={0}
                    max={100}
                    step={0.5}
                    className="w-32"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}

            {(feeType === "fixed" || feeType === "hybrid") && (
              <div className="space-y-2">
                <Label htmlFor="fixed-input">Fixed Fee Amount</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">€</span>
                  <Input
                    id="fixed-input"
                    type="number"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(e.target.value)}
                    min={0}
                    step={500}
                    className="w-40"
                    placeholder="15000"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Retainer agreement, special terms..."
              rows={2}
            />
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Revenue Calculation Preview</p>
                <p className="text-xs text-muted-foreground mt-1">{getPreviewText()}</p>
              </div>
            </div>
          </div>

          {feeType === "hybrid" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Hybrid mode:</strong> When creating jobs, admins can choose between the
                default percentage or set a specific fixed fee for that role.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
