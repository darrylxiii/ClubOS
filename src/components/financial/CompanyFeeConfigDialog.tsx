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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Percent, DollarSign, Shuffle, Info, ChevronDown, Building2, CreditCard } from "lucide-react";
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
  // Bank details
  bank_name?: string | null;
  bank_iban?: string | null;
  bank_bic?: string | null;
  bank_account_holder?: string | null;
  // Payment terms
  default_payment_terms_days?: number | null;
  payment_code?: string | null;
}

interface CompanyFeeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyFeeData | null;
}

const PAYMENT_TERMS_OPTIONS = [
  { value: 7, label: "Net 7 days" },
  { value: 14, label: "Net 14 days" },
  { value: 21, label: "Net 21 days" },
  { value: 30, label: "Net 30 days" },
  { value: 45, label: "Net 45 days" },
  { value: 60, label: "Net 60 days" },
  { value: 90, label: "Net 90 days" },
];

// IBAN validation regex (simplified - allows most European IBANs)
const IBAN_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/;

function validateIBAN(iban: string): boolean {
  if (!iban) return true; // Empty is ok
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return IBAN_REGEX.test(cleanIban);
}

function formatIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
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
  
  // Bank details
  const [bankName, setBankName] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankBic, setBankBic] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankSectionOpen, setBankSectionOpen] = useState(false);
  
  // Payment terms
  const [paymentTerms, setPaymentTerms] = useState<number>(30);
  const [paymentCode, setPaymentCode] = useState("");
  const [paymentSectionOpen, setPaymentSectionOpen] = useState(false);

  useEffect(() => {
    if (company) {
      setFeeType(company.fee_type || "percentage");
      setPercentage(company.placement_fee_percentage?.toString() || "20");
      setFixedAmount(company.placement_fee_fixed?.toString() || "");
      setNotes(company.default_fee_notes || "");
      
      // Bank details
      setBankName(company.bank_name || "");
      setBankIban(company.bank_iban || "");
      setBankBic(company.bank_bic || "");
      setBankAccountHolder(company.bank_account_holder || "");
      
      // Payment terms
      setPaymentTerms(company.default_payment_terms_days || 30);
      setPaymentCode(company.payment_code || "");
      
      // Auto-expand sections if data exists
      setBankSectionOpen(Boolean(company.bank_iban));
      setPaymentSectionOpen(Boolean(company.payment_code) || Boolean(company.default_payment_terms_days && company.default_payment_terms_days !== 30));
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("No company selected");

      // Validate IBAN if provided
      if (bankIban && !validateIBAN(bankIban)) {
        throw new Error("Invalid IBAN format");
      }

      const updates: Record<string, unknown> = {
        fee_type: feeType,
        default_fee_notes: notes || null,
        // Bank details
        bank_name: bankName || null,
        bank_iban: bankIban ? bankIban.replace(/\s/g, '').toUpperCase() : null,
        bank_bic: bankBic || null,
        bank_account_holder: bankAccountHolder || null,
        // Payment terms
        default_payment_terms_days: paymentTerms,
        payment_code: paymentCode || null,
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
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success("Company configuration updated");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update configuration");
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure {company?.name}
          </DialogTitle>
          <DialogDescription>
            Fee structure, bank details, and payment terms
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

          {/* Bank Details Section */}
          <Collapsible open={bankSectionOpen} onOpenChange={setBankSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  Bank Details
                  {bankIban && <span className="text-xs text-muted-foreground">(configured)</span>}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${bankSectionOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input
                    id="bank-name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., ING Bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank-bic">BIC/SWIFT</Label>
                  <Input
                    id="bank-bic"
                    value={bankBic}
                    onChange={(e) => setBankBic(e.target.value.toUpperCase())}
                    placeholder="e.g., INGBNL2A"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-iban">IBAN</Label>
                <Input
                  id="bank-iban"
                  value={formatIBAN(bankIban)}
                  onChange={(e) => setBankIban(e.target.value)}
                  placeholder="e.g., NL91 ABNA 0417 1643 00"
                  className={bankIban && !validateIBAN(bankIban) ? "border-destructive" : ""}
                />
                {bankIban && !validateIBAN(bankIban) && (
                  <p className="text-xs text-destructive">Invalid IBAN format</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-holder">Account Holder Name</Label>
                <Input
                  id="bank-holder"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  placeholder="e.g., Company B.V."
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Bank details enable automatic payment matching when banking integrations are connected.
              </p>
            </CollapsibleContent>
          </Collapsible>

          {/* Payment Terms Section */}
          <Collapsible open={paymentSectionOpen} onOpenChange={setPaymentSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4" />
                  Payment Terms
                  {paymentCode && <span className="text-xs text-muted-foreground">({paymentCode})</span>}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${paymentSectionOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-terms">Payment Terms</Label>
                  <Select
                    value={paymentTerms.toString()}
                    onValueChange={(v) => setPaymentTerms(parseInt(v))}
                  >
                    <SelectTrigger id="payment-terms">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-code">Payment Code</Label>
                  <Input
                    id="payment-code"
                    value={paymentCode}
                    onChange={(e) => setPaymentCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    placeholder="e.g., ACME"
                    maxLength={8}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Payment code creates structured invoice references (TQC-{paymentCode || 'CODE'}-XXXX) for automatic matching.
              </p>
            </CollapsibleContent>
          </Collapsible>
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
