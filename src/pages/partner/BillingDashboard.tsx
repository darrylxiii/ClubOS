import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Download, FileText, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { PartnerGlassCard } from "@/components/partner/PartnerGlassCard";
import { PartnerInlineStats } from "@/components/partner/PartnerInlineStats";
import { AnimatedNumber } from "@/components/ui/animated-number";

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  currency_code: string;
  status: string;
  created_at: string;
  invoice_date: string;
  due_date: string | null;
  pdf_url: string | null;
}

export default function BillingDashboard() {
  const { companyId } = useRole();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ['partner-invoices', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('partner_invoices')
        .select('id, invoice_number, total_amount, currency_code, status, created_at, invoice_date, due_date, pdf_url')
        .eq('partner_company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Invoice[];
    },
    enabled: !!companyId
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive"> = {
      paid: "default",
      sent: "secondary",
      overdue: "destructive",
      draft: "secondary"
    };
    return colors[status] || "default";
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const totalPaid = invoices?.filter((i) => i.status === 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const totalOutstanding = invoices?.filter((i) => i.status !== 'paid').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

  const currencyFormat = (v: number) => formatCurrency(v, 'EUR');

  return (
    <div className="space-y-6">
      <PartnerInlineStats
        stats={[
          { value: totalInvoiced, label: 'Total Invoiced', icon: DollarSign, format: currencyFormat, highlight: true },
          { value: totalPaid, label: 'Paid', format: currencyFormat },
          { value: totalOutstanding, label: 'Outstanding', format: currencyFormat },
          { value: invoices?.length || 0, label: 'Invoices', icon: FileText },
        ]}
      />

      <PartnerGlassCard
        title="Recent Invoices"
        description="View and download your invoices"
        icon={<FileText className="w-5 h-5 text-muted-foreground" />}
      >
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : invoices && invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-lg p-4 bg-card/20 border border-border/10 hover:bg-card/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{invoice.invoice_number}</span>
                      <Badge variant={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(invoice.invoice_date), 'MMM d, yyyy')}
                      </span>
                      {invoice.due_date && (
                        <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-xl font-bold tabular-nums">
                      {formatCurrency(invoice.total_amount || 0, invoice.currency_code || 'EUR')}
                    </div>
                    {invoice.pdf_url && (
                      <Button size="sm" variant="outline" asChild className="border-border/30">
                        <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No invoices found</p>
          </div>
        )}
      </PartnerGlassCard>
    </div>
  );
}
