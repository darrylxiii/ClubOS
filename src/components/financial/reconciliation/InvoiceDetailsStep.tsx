import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Calendar, CreditCard, Building2 } from "lucide-react";
import { InvoiceForReconciliation } from "./types";

interface InvoiceDetailsStepProps {
  invoice: InvoiceForReconciliation;
}

export function InvoiceDetailsStep({ invoice }: InvoiceDetailsStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { 
      style: 'currency', 
      currency: invoice.currency || 'EUR' 
    }).format(amount);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'open': return 'secondary';
      case 'late': return 'destructive';
      case 'pending': return 'outline';
      default: return 'secondary';
    }
  };

  // Extract line items from raw_data if available
  const lineItems = invoice.raw_data?.details as Array<{
    description?: string;
    amount?: string;
    price?: string;
  }> | undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Invoice Number</p>
              <p className="font-mono font-medium">{invoice.invoice_number || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Moneybird ID</p>
              <p className="font-mono text-sm">{invoice.moneybird_id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={getStatusVariant(invoice.state_normalized)} className="capitalize">
                {invoice.state_normalized}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{invoice.currency || 'EUR'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Contact Name (from Moneybird)</p>
                <p className="font-medium">{invoice.contact_name || 'Unknown'}</p>
              </div>
              {invoice.contact_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Contact ID</p>
                  <p className="font-mono text-sm">{invoice.contact_id}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Invoice Date</span>
                <span className="font-medium">
                  {invoice.invoice_date 
                    ? format(new Date(invoice.invoice_date), 'MMM d, yyyy')
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Due Date</span>
                <span className="font-medium">
                  {invoice.due_date 
                    ? format(new Date(invoice.due_date), 'MMM d, yyyy')
                    : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="text-xl font-bold">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid</span>
              <span className="text-green-600 font-medium">{formatCurrency(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className={invoice.unpaid_amount > 0 ? 'text-amber-600 font-medium' : ''}>
                {formatCurrency(invoice.unpaid_amount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {lineItems && lineItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{item.description || 'Item'}</span>
                  <span className="font-mono text-sm">
                    {item.price ? formatCurrency(parseFloat(item.price)) : '-'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
