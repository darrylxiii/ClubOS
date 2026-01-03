import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Link2, Unlink, Search, CheckCircle2, AlertCircle, HelpCircle, Zap } from "lucide-react";
import { format } from "date-fns";

interface ReconciliationResult {
  invoice_id: string;
  moneybird_id: string;
  contact_name: string;
  matched_company_id: string | null;
  matched_company_name: string | null;
  match_score: number;
  match_method: string;
  status: 'matched' | 'suggested' | 'unmatched';
}

interface InvoiceWithCompany {
  id: string;
  moneybird_id: string;
  invoice_number: string | null;
  contact_name: string | null;
  total_amount: number;
  state_normalized: string;
  invoice_date: string | null;
  company_id: string | null;
  reconciliation_status: string | null;
  reconciliation_notes: string | null;
  company?: { id: string; name: string } | null;
}

export default function InvoiceReconciliation() {
  const [year] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [selectedCompanyForLink, setSelectedCompanyForLink] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Fetch all invoices with company info
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['reconciliation-invoices', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moneybird_sales_invoices')
        .select(`
          id, moneybird_id, invoice_number, contact_name, total_amount, 
          state_normalized, invoice_date, company_id, 
          reconciliation_status, reconciliation_notes
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

  // Fetch all companies for selection
  const { data: companies } = useQuery({
    queryKey: ['companies-for-reconciliation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
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

  // Manual link mutation
  const linkMutation = useMutation({
    mutationFn: async ({ invoiceId, companyId }: { invoiceId: string; companyId: string }) => {
      const { data, error } = await supabase.functions.invoke('reconcile-invoices', {
        body: { action: 'manual-link', invoice_id: invoiceId, company_id: companyId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Invoice linked to company');
      queryClient.invalidateQueries({ queryKey: ['reconciliation-invoices'] });
    },
    onError: (error) => {
      toast.error(`Link failed: ${error.message}`);
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

  const filteredInvoices = invoices?.filter(inv => 
    inv.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
    inv.company?.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const matchedInvoices = filteredInvoices.filter(i => i.company_id);
  const unmatchedInvoices = filteredInvoices.filter(i => !i.company_id);

  const stats = {
    total: invoices?.length || 0,
    matched: matchedInvoices.length,
    unmatched: unmatchedInvoices.length,
    matchRate: invoices?.length ? Math.round((matchedInvoices.length / invoices.length) * 100) : 0,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invoice Reconciliation</h1>
            <p className="text-muted-foreground">
              Link Moneybird invoices to companies for revenue attribution
            </p>
          </div>
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
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
          </TabsList>

          <TabsContent value="unmatched">
            <Card>
              <CardHeader>
                <CardTitle>Unmatched Invoices</CardTitle>
                <CardDescription>
                  Select a company to link each invoice for revenue attribution
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
                      <TableHead>Link to Company</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unmatchedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                            <Select
                              value={selectedCompanyForLink[invoice.id] || ''}
                              onValueChange={(value) => 
                                setSelectedCompanyForLink(prev => ({ ...prev, [invoice.id]: value }))
                              }
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select company" />
                              </SelectTrigger>
                              <SelectContent>
                                {companies?.map((company) => (
                                  <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => {
                                const companyId = selectedCompanyForLink[invoice.id];
                                if (companyId) {
                                  linkMutation.mutate({ invoiceId: invoice.id, companyId });
                                } else {
                                  toast.error('Please select a company first');
                                }
                              }}
                              disabled={!selectedCompanyForLink[invoice.id] || linkMutation.isPending}
                            >
                              <Link2 className="h-4 w-4" />
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
                      <TableHead>Date</TableHead>
                      <TableHead>Match Notes</TableHead>
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
                            {invoice.invoice_date && format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {invoice.reconciliation_notes || '-'}
                          </TableCell>
                          <TableCell>
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
      </Tabs>
    </div>
  );
}
