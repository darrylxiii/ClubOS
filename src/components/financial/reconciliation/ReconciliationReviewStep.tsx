import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Building2, User, FileText, AlertTriangle, Flag } from "lucide-react";
import { format } from "date-fns";
import { 
  InvoiceForReconciliation, 
  CompanyForReconciliation, 
  PlacementFeeForReconciliation, 
  ReconciliationFormData,
  INVOICE_TYPES,
  PAYMENT_TERMS,
  VARIANCE_REASONS
} from "./types";

interface ReconciliationReviewStepProps {
  invoice: InvoiceForReconciliation;
  selectedCompany: CompanyForReconciliation | null;
  selectedPlacement: PlacementFeeForReconciliation | null;
  formData: ReconciliationFormData;
}

export function ReconciliationReviewStep({ 
  invoice, 
  selectedCompany, 
  selectedPlacement, 
  formData 
}: ReconciliationReviewStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const invoiceType = INVOICE_TYPES.find(t => t.value === formData.invoice_type);
  const paymentTerm = PAYMENT_TERMS.find(t => t.value === formData.payment_terms);
  const varianceReason = VARIANCE_REASONS.find(r => r.value === formData.variance_reason);

  const hasVariance = selectedPlacement && Math.abs(invoice.total_amount - selectedPlacement.fee_amount) > 0.01;

  return (
    <div className="space-y-4">
      <Card className="bg-green-50/50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            Ready to Reconcile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">
            Review the details below and click "Confirm Reconciliation" to complete.
          </p>
        </CardContent>
      </Card>

      {/* Invoice Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Invoice #</p>
              <p className="font-mono font-medium">{invoice.invoice_number || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contact</p>
              <p className="font-medium">{invoice.contact_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-bold">{formatCurrency(invoice.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">
                {invoice.invoice_date 
                  ? format(new Date(invoice.invoice_date), 'MMM d, yyyy')
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Attribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Attribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCompany ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedCompany.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCompany.industry || 'No industry'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  Current LTV: <span className="font-medium">{formatCurrency(selectedCompany.total_revenue || 0)}</span>
                </p>
                <p className="text-sm text-green-600">
                  After: <span className="font-medium">
                    {formatCurrency((selectedCompany.total_revenue || 0) + invoice.total_amount)}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No company selected</p>
          )}
        </CardContent>
      </Card>

      {/* Placement Link */}
      {selectedPlacement && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Linked Placement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedPlacement.candidate_name}</p>
                <p className="text-sm text-muted-foreground">{selectedPlacement.job_title}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(selectedPlacement.fee_amount)}</p>
                {selectedPlacement.hired_date && (
                  <p className="text-xs text-muted-foreground">
                    Hired {format(new Date(selectedPlacement.hired_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variance Alert */}
      {hasVariance && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700">Variance Recorded</p>
                <p className="text-xs text-amber-600">
                  {formatCurrency(invoice.total_amount - selectedPlacement!.fee_amount)} difference
                  {varianceReason && ` - ${varianceReason.label}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classification & Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Classification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Invoice Type</p>
              <Badge variant="secondary">{invoiceType?.label || formData.invoice_type}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Terms</p>
              <Badge variant="outline">{paymentTerm?.label || formData.payment_terms}</Badge>
            </div>
          </div>

          {formData.reconciliation_notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted p-2 rounded">{formData.reconciliation_notes}</p>
              </div>
            </>
          )}

          {formData.requires_finance_review && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center gap-2 text-amber-600">
                <Flag className="h-4 w-4" />
                <span className="text-sm font-medium">Flagged for Finance Review</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Impact Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Impact Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Invoice will be marked as reconciled
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Company revenue metrics will be updated
            </li>
            {selectedPlacement && (
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Placement fee will be linked to this invoice
              </li>
            )}
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Audit trail will be created
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
