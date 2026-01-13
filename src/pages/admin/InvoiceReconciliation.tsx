import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Unlink, Search, CheckCircle2, AlertCircle, Zap, Edit2, Flag, Download } from "lucide-react";
import { format } from "date-fns";
import { ReconciliationModal, InvoiceForReconciliation } from "@/components/financial/reconciliation";

interface InvoiceWithCompany extends InvoiceForReconciliation {
  company?: { id: string; name: string } | null;
}

export default function InvoiceReconciliation() {
  const [year] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithCompany | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all invoices with company info
  const { data: invoices } = useQuery({
    queryKey: ['reconciliation-invoices', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moneybird_sales_invoices')
        .select(`
          id, moneybird_id, invoice_number, contact_name, contact_id, total_amount, 
          paid_amount, unpaid_amount, state_normalized, invoice_date, due_date, 
          currency, company_id, placement_fee_id, application_id,
          reconciliation_status, reconciliation_notes, invoice_type, 
          variance_reason, variance_amount, reconciliation_confidence,
          requires_finance_review, payment_terms, raw_data
        `)
        .eq('year', year)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      // Fetch company names for matched invoices
      const companyIds = data?.filter(i => i.company_id).map(i => i.company_id) || [];
      let companiesMap: Record<string, { id: string; name: string }> = {};

      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);

        companiesMap = (companies || []).reduce((acc, c) => {
          acc[c.id] = c;
          return acc;
        }, {} as Record<string, { id: string; name: string }>);
      }

      return (data || []).map(inv => ({
        ...inv,
        company: inv.company_id ? companiesMap[inv.company_id] : null,
      })) as InvoiceWithCompany[];
    },
  });

  // Auto-reconcile mutation
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('reconcile-invoices', {
        body: { action: 'auto-reconcile', year, threshold: 0.8 }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Auto-matched ${data.stats.auto_matched} invoices`);
      queryClient.invalidateQueries({ queryKey: ['reconciliation-invoices'] });
    },
    onError: (error) => {
      toast.error(`Reconciliation failed: ${error.message}`);
    },
  });

  // Unlink mutation
  const unlinkMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase.functions.invoke('reconcile-invoices', {
        body: { action: 'unlink', invoice_id: invoiceId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invoice unlinked');
      queryClient.invalidateQueries({ queryKey: ['reconciliation-invoices'] });
    },
    onError: (error) => {
      toast.error(`Unlink failed: ${error.message}`);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const handleOpenReconcileModal = (invoice: InvoiceWithCompany) => {
    setSelectedInvoice(invoice);
    setModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!invoices?.length) return;

    const headers = ['Invoice #', 'Contact', 'Company', 'Amount', 'Status', 'Type', 'Date', 'Reconciled'];
    const rows = invoices.map(inv => [
      inv.invoice_number || '',
      inv.contact_name || '',
      inv.company?.name || '',
      inv.total_amount,
      inv.state_normalized,
      inv.invoice_type || '',
      inv.invoice_date || '',
      inv.reconciliation_status || 'pending',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredInvoices = invoices?.filter(inv =>
    inv.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.company?.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const matchedInvoices = filteredInvoices.filter(i => i.company_id);
  const unmatchedInvoices = filteredInvoices.filter(i => !i.company_id);
  const needsReviewInvoices = filteredInvoices.filter(i => i.requires_finance_review);

  const stats = {
    total: invoices?.length || 0,
    matched: matchedInvoices.length,
    unmatched: unmatchedInvoices.length,
    needsReview: needsReviewInvoices.length,
    matchRate: invoices?.length ? Math.round((matchedInvoices.length / invoices.length) * 100) : 0,
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'placement_fee': return 'bg-green-100 text-green-800';
      case 'retainer': return 'bg-blue-100 text-blue-800';
      case 'consulting': return 'bg-purple-100 text-purple-800';
      case 'credit_note': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Invoice Reconciliation</h1>
          <p className="text-muted-foreground">
            Link Moneybird invoices to companies for revenue attribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={() => reconcileMutation.mutate()}
            disabled={reconcileMutation.isPending}
          >
            {reconcileMutation.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Auto-Reconcile
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Matched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unmatched</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.unmatched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.needsReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Match Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matchRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="unmatched" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unmatched" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Unmatched ({unmatchedInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="matched" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Matched ({matchedInvoices.length})
          </TabsTrigger>
          {needsReviewInvoices.length > 0 && (
            <TabsTrigger value="review" className="gap-2">
              <Flag className="h-4 w-4" />
              Needs Review ({needsReviewInvoices.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="unmatched">
          <Card>
            <CardHeader>
              <CardTitle>Unmatched Invoices</CardTitle>
              <CardDescription>
                Click "Reconcile" to link each invoice to a company with full data capture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Moneybird Contact</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatchedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        All invoices are matched!
                      </TableCell>
                    </TableRow>
                  ) : (
                    unmatchedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.invoice_number || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {invoice.contact_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell>
                          {invoice.invoice_date && format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {invoice.state_normalized}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleOpenReconcileModal(invoice)}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Reconcile
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matched">
          <Card>
            <CardHeader>
              <CardTitle>Matched Invoices</CardTitle>
              <CardDescription>
                Invoices linked to companies for revenue tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Moneybird Contact</TableHead>
                    <TableHead>Linked Company</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No matched invoices yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    matchedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.invoice_number || '-'}
                        </TableCell>
                        <TableCell>{invoice.contact_name || 'Unknown'}</TableCell>
                        <TableCell className="font-medium">
                          {invoice.company?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell>
                          {invoice.invoice_type && (
                            <Badge className={getTypeColor(invoice.invoice_type)}>
                              {invoice.invoice_type.replace('_', ' ')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {invoice.invoice_date && format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenReconcileModal(invoice)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => unlinkMutation.mutate(invoice.id)}
                            disabled={unlinkMutation.isPending}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Needs Finance Review</CardTitle>
              <CardDescription>
                Invoices flagged for finance team review
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {needsReviewInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm">
                        {invoice.invoice_number || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.company?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                      <TableCell>
                        {invoice.invoice_type && (
                          <Badge className={getTypeColor(invoice.invoice_type)}>
                            {invoice.invoice_type.replace('_', ' ')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.variance_amount ? (
                          <span className="text-amber-600">
                            {formatCurrency(invoice.variance_amount)}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {invoice.reconciliation_notes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleOpenReconcileModal(invoice)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reconciliation Modal */}
      <ReconciliationModal
        invoice={selectedInvoice}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
