import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import { Download, FileText, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function BillingDashboard() {
  const { companyId } = useRole();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['partner-invoices', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('partner_invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[] || [];
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

  const formatCurrency = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8" />
            Billing & Invoices
          </h1>
          <p className="text-muted-foreground mt-2">Manage your billing and download invoices</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                invoices?.reduce((sum: number, inv: any) => sum + (inv.total_cents || 0), 0) || 0,
                'EUR'
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                invoices?.filter((i: any) => i.status === 'paid')
                  .reduce((sum: number, inv: any) => sum + (inv.total_cents || 0), 0) || 0,
                'EUR'
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(
                invoices?.filter((i: any) => i.status !== 'paid')
                  .reduce((sum: number, inv: any) => sum + (inv.total_cents || 0), 0) || 0,
                'EUR'
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>View and download your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map((invoice: any) => (
                <div key={invoice.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
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
                          {format(new Date(invoice.billing_period_start || invoice.created_at), 'MMM d, yyyy')}
                        </span>
                        {invoice.due_date && (
                          <span>Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="text-xl font-bold">
                        {formatCurrency(invoice.total_cents || 0, invoice.currency || 'EUR')}
                      </div>
                      {invoice.invoice_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
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
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
