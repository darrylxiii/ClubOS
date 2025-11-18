import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PartnerInvoice } from "@/hooks/useFinancialData";
import { format } from "date-fns";
import { Download, CreditCard } from "lucide-react";

interface PartnerInvoicesViewProps {
  invoices: PartnerInvoice[];
}

export function PartnerInvoicesView({ invoices }: PartnerInvoicesViewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'sent': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'viewed': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'overdue': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'draft': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {invoices.length === 0 ? (
        <div className="text-center text-muted-foreground py-8 border rounded-lg">
          No invoices yet
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.total_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {invoice.pdf_url && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      {['sent', 'viewed', 'overdue'].includes(invoice.status) && (
                        <Button variant="default" size="sm">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
