import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingDown, Play, CheckCircle, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, History } from "lucide-react";
import { useState } from "react";
import { useDepreciationLedger, type DepreciationEntry } from "@/hooks/useDepreciationLedger";
import { useDepreciationRuns } from "@/hooks/useAssetEvents";
import { CATEGORY_LABELS } from "@/hooks/useInventoryCategories";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GenerateEntriesDialog } from "@/components/admin/inventory/GenerateEntriesDialog";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type SortField = 'asset_name' | 'category' | 'depreciation_amount' | 'accumulated_depreciation' | 'book_value_after' | 'is_posted';
type SortDirection = 'asc' | 'desc';

const DepreciationSchedule = () => {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('asset_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const { entries, loading, postEntry, bulkPost, getPeriodTotals, refetch } = useDepreciationLedger({ year, month });
  const { runs, loading: runsLoading } = useDepreciationRuns(year);
  const totals = getPeriodTotals(year, month);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    let aVal: string | number | boolean = '';
    let bVal: string | number | boolean = '';

    switch (sortField) {
      case 'asset_name':
        aVal = a.asset?.asset_name?.toLowerCase() || '';
        bVal = b.asset?.asset_name?.toLowerCase() || '';
        break;
      case 'category':
        aVal = CATEGORY_LABELS[a.asset?.category || ''] || a.asset?.category || '';
        bVal = CATEGORY_LABELS[b.asset?.category || ''] || b.asset?.category || '';
        break;
      case 'depreciation_amount':
        aVal = a.depreciation_amount;
        bVal = b.depreciation_amount;
        break;
      case 'accumulated_depreciation':
        aVal = a.accumulated_depreciation;
        bVal = b.accumulated_depreciation;
        break;
      case 'book_value_after':
        aVal = a.book_value_after;
        bVal = b.book_value_after;
        break;
      case 'is_posted':
        aVal = a.is_posted ? 1 : 0;
        bVal = b.is_posted ? 1 : 0;
        break;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button onClick={() => handleSort(field)} className="flex items-center hover:text-foreground transition-colors">
        {children}
        <SortIcon field={field} />
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Depreciation Schedule</h2>
          <p className="text-muted-foreground text-sm">Monthly depreciation ledger</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGenerateDialogOpen(true)}>
            <Play className="h-4 w-4 mr-2" />Generate Entries
          </Button>
          <Button onClick={() => bulkPost(year, month)} disabled={totals.unpostedCount === 0}>
            <CheckCircle className="h-4 w-4 mr-2" />Post All ({totals.unpostedCount})
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-4">
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totals.totalEntries}</div><p className="text-muted-foreground text-sm">Total Entries</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatCurrency(totals.totalDepreciation)}</div><p className="text-muted-foreground text-sm">Total Depreciation</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{totals.postedCount}</div><p className="text-muted-foreground text-sm">Posted</p></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{totals.unpostedCount}</div><p className="text-muted-foreground text-sm">Pending</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Depreciation Ledger - {months[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="asset_name">Asset</SortableHeader>
                    <SortableHeader field="category">Category</SortableHeader>
                    <SortableHeader field="depreciation_amount" className="text-right">Depreciation</SortableHeader>
                    <SortableHeader field="accumulated_depreciation" className="text-right">Accumulated</SortableHeader>
                    <SortableHeader field="book_value_after" className="text-right">Book Value</SortableHeader>
                    <SortableHeader field="is_posted">Status</SortableHeader>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No entries for this period. Click "Generate Entries" to create.
                      </TableCell>
                    </TableRow>
                  ) : sortedEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium">{entry.asset?.asset_name}</div>
                        <div className="text-xs text-muted-foreground">{entry.asset?.inventory_number}</div>
                      </TableCell>
                      <TableCell>{CATEGORY_LABELS[entry.asset?.category || ''] || entry.asset?.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.depreciation_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.accumulated_depreciation)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.book_value_after)}</TableCell>
                      <TableCell>
                        <Badge variant={entry.is_posted ? "default" : "secondary"}>
                          {entry.is_posted ? "Posted" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!entry.is_posted && (
                          <Button size="sm" variant="outline" onClick={() => postEntry(entry.id)}>
                            Post
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Depreciation Runs History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Depreciation Run History - {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : runs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No depreciation runs recorded for {year}.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Run Type</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-right">Total Depreciation</TableHead>
                    <TableHead>Run Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map(run => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">
                        {months[run.period_month - 1]} {run.period_year}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{run.run_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{run.total_entries}</TableCell>
                      <TableCell className="text-right">{formatCurrency(run.total_depreciation)}</TableCell>
                      <TableCell>{format(new Date(run.run_at), 'dd MMM yyyy HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <GenerateEntriesDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        year={year}
        month={month}
        onGenerated={refetch}
      />
    </div>
  );
};

export default DepreciationSchedule;
