import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingDown, Play, CheckCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useDepreciationLedger } from "@/hooks/useDepreciationLedger";
import { CATEGORY_LABELS } from "@/hooks/useInventoryCategories";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DepreciationSchedule = () => {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  
  const { entries, loading, generateMonthlyEntries, postEntry, bulkPost, getPeriodTotals, refetch } = useDepreciationLedger({ year, month });
  const totals = getPeriodTotals(year, month);

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Depreciation Schedule</h1>
              <p className="text-muted-foreground">Monthly depreciation ledger</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => generateMonthlyEntries(year, month)}><Play className="h-4 w-4 mr-2" />Generate Entries</Button>
              <Button onClick={() => bulkPost(year, month)} disabled={totals.unpostedCount === 0}><CheckCircle className="h-4 w-4 mr-2" />Post All ({totals.unpostedCount})</Button>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex gap-4 mb-6">
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{[2023, 2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totals.totalEntries}</div><p className="text-muted-foreground text-sm">Total Entries</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{formatCurrency(totals.totalDepreciation)}</div><p className="text-muted-foreground text-sm">Total Depreciation</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{totals.postedCount}</div><p className="text-muted-foreground text-sm">Posted</p></CardContent></Card>
            <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{totals.unpostedCount}</div><p className="text-muted-foreground text-sm">Pending</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5" />Depreciation Ledger - {months[month - 1]} {year}</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Depreciation</TableHead>
                        <TableHead className="text-right">Accumulated</TableHead>
                        <TableHead className="text-right">Book Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No entries for this period. Click "Generate Entries" to create.</TableCell></TableRow>
                      ) : entries.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell><div className="font-medium">{entry.asset?.asset_name}</div><div className="text-xs text-muted-foreground">{entry.asset?.inventory_number}</div></TableCell>
                          <TableCell>{CATEGORY_LABELS[entry.asset?.category || ''] || entry.asset?.category}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.depreciation_amount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.accumulated_depreciation)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.book_value_after)}</TableCell>
                          <TableCell><Badge variant={entry.is_posted ? "default" : "secondary"}>{entry.is_posted ? "Posted" : "Pending"}</Badge></TableCell>
                          <TableCell>{!entry.is_posted && <Button size="sm" variant="outline" onClick={() => postEntry(entry.id)}>Post</Button>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default DepreciationSchedule;
