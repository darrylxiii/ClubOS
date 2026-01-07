import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useVATByQuarter } from "@/hooks/useVATData";

interface VATRegisterTableProps {
  year?: number;
}

export function VATRegisterTable({ year }: VATRegisterTableProps) {
  const { data: quarters, isLoading } = useVATByQuarter(year);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string, quarter: number) => {
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    const currentYear = new Date().getFullYear();
    const selectedYear = year || currentYear;
    
    if (selectedYear < currentYear || (selectedYear === currentYear && quarter < currentQuarter)) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Filing</Badge>;
    }
    if (selectedYear === currentYear && quarter === currentQuarter) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Current</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Future</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  const yearTotal = quarters?.reduce((acc, q) => ({
    netRevenue: acc.netRevenue + q.netRevenue,
    grossRevenue: acc.grossRevenue + q.grossRevenue,
    vatCollected: acc.vatCollected + q.vatCollected,
    invoiceCount: acc.invoiceCount + q.invoiceCount,
  }), { netRevenue: 0, grossRevenue: 0, vatCollected: 0, invoiceCount: 0 });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Net Revenue</TableHead>
          <TableHead className="text-right">Gross Revenue</TableHead>
          <TableHead className="text-right">VAT (21%)</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quarters?.map((q) => (
          <TableRow key={q.quarter}>
            <TableCell className="font-medium">Q{q.quarter} {year || new Date().getFullYear()}</TableCell>
            <TableCell className="text-right">{formatCurrency(q.netRevenue)}</TableCell>
            <TableCell className="text-right text-muted-foreground">{formatCurrency(q.grossRevenue)}</TableCell>
            <TableCell className="text-right font-medium text-destructive">
              {formatCurrency(q.vatCollected)}
            </TableCell>
            <TableCell className="text-right">{q.invoiceCount}</TableCell>
            <TableCell>{getStatusBadge(q.filingStatus, q.quarter)}</TableCell>
          </TableRow>
        ))}
        {/* Year Total Row */}
        <TableRow className="bg-muted/50 font-bold">
          <TableCell>Year Total</TableCell>
          <TableCell className="text-right">{formatCurrency(yearTotal?.netRevenue || 0)}</TableCell>
          <TableCell className="text-right text-muted-foreground">{formatCurrency(yearTotal?.grossRevenue || 0)}</TableCell>
          <TableCell className="text-right text-destructive">{formatCurrency(yearTotal?.vatCollected || 0)}</TableCell>
          <TableCell className="text-right">{yearTotal?.invoiceCount || 0}</TableCell>
          <TableCell></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
