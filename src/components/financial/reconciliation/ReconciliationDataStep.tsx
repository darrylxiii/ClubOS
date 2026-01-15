import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertTriangle, FileText, MessageSquare, Flag } from "lucide-react";
import { 
  InvoiceForReconciliation, 
  PlacementFeeForReconciliation, 
  ReconciliationFormData,
  INVOICE_TYPES,
  PAYMENT_TERMS,
  VARIANCE_REASONS
} from "./types";

interface ReconciliationDataStepProps {
  invoice: InvoiceForReconciliation;
  selectedPlacement: PlacementFeeForReconciliation | null;
  formData: ReconciliationFormData;
  onChange: (data: ReconciliationFormData) => void;
}

export function ReconciliationDataStep({ 
  invoice, 
  selectedPlacement, 
  formData, 
  onChange 
}: ReconciliationDataStepProps) {
  const hasVariance = selectedPlacement && Math.abs(invoice.total_amount - selectedPlacement.fee_amount) > 0.01;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Invoice Type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice Type</Label>
            <Select
              value={formData.invoice_type}
              onValueChange={(value) => onChange({ 
                ...formData, 
                invoice_type: value as ReconciliationFormData['invoice_type'] 
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Terms</Label>
            <Select
              value={formData.payment_terms}
              onValueChange={(value) => onChange({ 
                ...formData, 
                payment_terms: value as ReconciliationFormData['payment_terms'] 
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((term) => (
                  <SelectItem key={term.value} value={term.value}>
                    {term.label} {term.days > 0 && `(${term.days} days)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Variance Handling - Only show if there's a variance */}
      {hasVariance && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Amount Variance Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-3 bg-white rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Invoice</p>
                <p className="font-bold">{formatCurrency(invoice.total_amount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="font-bold">{formatCurrency(selectedPlacement.fee_amount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Difference</p>
                <p className="font-bold text-amber-600">
                  {formatCurrency(invoice.total_amount - selectedPlacement.fee_amount)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Variance Reason</Label>
              <Select
                value={formData.variance_reason || ''}
                onValueChange={(value) => onChange({ ...formData, variance_reason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason for variance" />
                </SelectTrigger>
                <SelectContent>
                  {VARIANCE_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.variance_reason === 'other' && (
              <div className="space-y-2">
                <Label>Variance Amount Override</Label>
                <Input
                  type="number"
                  value={formData.variance_amount}
                  onChange={(e) => onChange({ 
                    ...formData, 
                    variance_amount: parseFloat(e.target.value) || 0 
                  })}
                  placeholder="0.00"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes & Review Flag */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notes & Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea
              value={formData.reconciliation_notes}
              onChange={(e) => onChange({ ...formData, reconciliation_notes: e.target.value })}
              placeholder="Add any notes about this reconciliation..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              These notes are for internal reference only
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Requires Finance Review</p>
                <p className="text-xs text-muted-foreground">
                  Flag this for the finance team to review
                </p>
              </div>
            </div>
            <Switch
              checked={formData.requires_finance_review}
              onCheckedChange={(checked) => onChange({ 
                ...formData, 
                requires_finance_review: checked 
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
