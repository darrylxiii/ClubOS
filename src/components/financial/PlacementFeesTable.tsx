import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlacementFee } from "@/hooks/useFinancialData";
import { format } from "date-fns";
import { Search, FileText, TrendingUp, TrendingDown, Minus, User, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlacementFeesTableProps {
  fees: PlacementFee[];
}

export function PlacementFeesTable({ fees }: PlacementFeesTableProps) {
  const [search, setSearch] = useState("");

  const filteredFees = fees.filter((fee) => 
    fee.invoice_id?.toLowerCase().includes(search.toLowerCase()) ||
    fee.application_id.toLowerCase().includes(search.toLowerCase()) ||
    fee.sourcer_name?.toLowerCase().includes(search.toLowerCase())
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

  const getVarianceColor = (direction: string | null) => {
    switch (direction) {
      case 'above': return 'text-green-600 dark:text-green-400';
      case 'below': return 'text-amber-600 dark:text-amber-400';
      case 'within': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-muted-foreground';
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
            placeholder="Search by application, invoice, or sourcer..."
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

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hired Date</TableHead>
              <TableHead>Sourced By</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Closed By</TableHead>
              <TableHead>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No placement fees found
                </TableCell>
              </TableRow>
            ) : (
              filteredFees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell>
                    {format(new Date(fee.hired_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{fee.sourcer_name || '-'}</span>
                            {fee.added_by && fee.sourced_by !== fee.added_by && (
                              <AlertCircle className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {(fee.added_by_name || fee.sourcer_override_reason) && fee.sourced_by !== fee.added_by && (
                          <TooltipContent>
                            <div className="space-y-1">
                              {fee.added_by_name && (
                                <p className="text-xs">Added by: {fee.added_by_name}</p>
                              )}
                              {fee.sourcer_override_reason && (
                                <p className="text-xs">Reason: {fee.sourcer_override_reason}</p>
                              )}
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{formatCurrency(fee.candidate_salary)}</span>
                      {fee.estimated_salary_min && fee.estimated_salary_max && (
                        <span className="text-xs text-muted-foreground">
                          Est: {formatCurrency(fee.estimated_salary_min)} - {formatCurrency(fee.estimated_salary_max)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {fee.salary_variance_percent !== null ? (
                      <div className={cn("flex items-center gap-1", getVarianceColor(fee.salary_variance_direction))}>
                        {fee.salary_variance_direction === 'above' && <TrendingUp className="h-4 w-4" />}
                        {fee.salary_variance_direction === 'below' && <TrendingDown className="h-4 w-4" />}
                        {fee.salary_variance_direction === 'within' && <Minus className="h-4 w-4" />}
                        <span className="text-sm font-medium">
                          {fee.salary_variance_percent > 0 ? '+' : ''}{fee.salary_variance_percent.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{formatCurrency(fee.fee_amount)}</span>
                      <span className="text-xs text-muted-foreground">{fee.fee_percentage}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(fee.status)}>
                      {fee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{fee.closer_name || '-'}</span>
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
