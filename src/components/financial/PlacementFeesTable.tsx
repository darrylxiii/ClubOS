import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlacementFee } from "@/hooks/useFinancialData";
import { format } from "date-fns";
import { Search, FileText } from "lucide-react";

interface PlacementFeesTableProps {
  fees: PlacementFee[];
}

export function PlacementFeesTable({ fees }: PlacementFeesTableProps) {
  const [search, setSearch] = useState("");

  const filteredFees = fees.filter((fee) => 
    fee.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
    fee.application_id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'invoiced': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'cancelled': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
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
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by application or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Generate Invoice
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hired Date</TableHead>
              <TableHead>Candidate Salary</TableHead>
              <TableHead>Fee %</TableHead>
              <TableHead>Fee Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No placement fees found
                </TableCell>
              </TableRow>
            ) : (
              filteredFees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell>
                    {format(new Date(fee.hired_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{formatCurrency(fee.candidate_salary)}</TableCell>
                  <TableCell>{fee.fee_percentage}%</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(fee.fee_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(fee.status)}>
                      {fee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {fee.payment_due_date && format(new Date(fee.payment_due_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {fee.invoice_id ? (
                      <Button variant="ghost" size="sm">
                        View Invoice
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
