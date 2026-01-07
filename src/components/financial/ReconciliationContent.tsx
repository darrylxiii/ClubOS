import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Link2, CheckCircle, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceWithCompany {
  id: string;
  moneybird_id: string | null;
  invoice_number: string | null;
  contact_name: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  state_normalized: string | null;
  invoice_date: string | null;
  company_id: string | null;
  reconciliation_status: string | null;
  company?: { id: string; name: string } | null;
}

export function ReconciliationContent({ year }: { year: number }) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['reconciliation-invoices-summary', year],
    queryFn: async () => {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      const { data, error } = await supabase
        .from('moneybird_sales_invoices')
        .select(`
          id, moneybird_id, invoice_number, contact_name, total_amount, 
          paid_amount, state_normalized, invoice_date, company_id, reconciliation_status
        `)
        .gte('invoice_date', startOfYear)
        .lte('invoice_date', endOfYear)
        .order('invoice_date', { ascending: false })
        .limit(50);

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

      return (data || []).map(invoice => ({
        ...invoice,
        company: invoice.company_id ? companiesMap[invoice.company_id] : null
      })) as InvoiceWithCompany[];
    },
    staleTime: 60 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ['reconciliation-stats', year],
    queryFn: async () => {
      const startOfYear = `${year}-01-01`;
      const endOfYear = `${year}-12-31`;

      const { count: total } = await supabase
        .from('moneybird_sales_invoices')
        .select('*', { count: 'exact', head: true })
        .gte('invoice_date', startOfYear)
        .lte('invoice_date', endOfYear);

      const { count: matched } = await supabase
        .from('moneybird_sales_invoices')
        .select('*', { count: 'exact', head: true })
        .gte('invoice_date', startOfYear)
        .lte('invoice_date', endOfYear)
        .not('company_id', 'is', null);

      return {
        total: total || 0,
        matched: matched || 0,
        unmatched: (total || 0) - (matched || 0),
        matchRate: total ? Math.round((matched || 0) / total * 100) : 0
      };
    },
    staleTime: 60 * 1000,
  });

  const filteredInvoices = invoices?.filter(inv => 
    !search || 
    inv.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (amount: number | null) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStatusBadge = (invoice: InvoiceWithCompany) => {
    if (invoice.company_id) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Linked</Badge>;
    }
    if (invoice.reconciliation_status === 'pending') {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" />Unlinked</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Linked</p>
            <p className="text-2xl font-bold text-green-600">{stats?.matched || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unlinked</p>
            <p className="text-2xl font-bold text-amber-600">{stats?.unmatched || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Match Rate</p>
            <p className="text-2xl font-bold">{stats?.matchRate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Invoice Reconciliation</CardTitle>
              <CardDescription>Link invoices to companies for accurate revenue attribution</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/reconciliation" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Full View
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices?.slice(0, 10).map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number || '-'}</TableCell>
                    <TableCell>{invoice.contact_name || '-'}</TableCell>
                    <TableCell>
                      {invoice.company ? (
                        <span className="text-green-600">{invoice.company.name}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell>{getStatusBadge(invoice)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
