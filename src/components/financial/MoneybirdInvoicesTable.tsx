import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useMoneybirdInvoices } from "@/hooks/useMoneybirdInvoices";
import { format } from "date-fns";

interface MoneybirdInvoicesTableProps {
  year: number;
  limit?: number;
}

const stateColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  open: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pending_payment: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  late: 'bg-destructive/10 text-destructive border-destructive/20',
  paid: 'bg-green-500/10 text-green-500 border-green-500/20',
  cancelled: 'bg-muted text-muted-foreground',
  uncollectible: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function MoneybirdInvoicesTable({ year, limit }: MoneybirdInvoicesTableProps) {
  const { data: invoices, isLoading } = useMoneybirdInvoices(year);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayInvoices = limit ? invoices?.slice(0, limit) : invoices;

  if (!displayInvoices?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No invoices found for {year}
      </div>
    );
  }

  const formatCurrency = (amount: number | string) => 
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(Number(amount) || 0);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayInvoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="whitespace-nowrap">
                {invoice.invoice_date 
                  ? format(new Date(invoice.invoice_date), 'dd MMM yyyy')
                  : '-'
                }
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {invoice.contact_name || 'Unknown'}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={stateColors[invoice.state_normalized] || stateColors.open}
                >
                  {invoice.state_normalized}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(invoice.total_amount)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(invoice.paid_amount)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {Number(invoice.unpaid_amount) > 0 
                  ? formatCurrency(invoice.unpaid_amount)
                  : '-'
                }
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {limit && invoices && invoices.length > limit && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Showing {limit} of {invoices.length} invoices
        </div>
      )}
    </div>
  );
}
