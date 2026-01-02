import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2';

interface MoneybirdInvoice {
  id: string;
  contact_id: string;
  contact: { company_name?: string; firstname?: string; lastname?: string } | null;
  invoice_id: string;
  state: string;
  total_price_incl_tax: string;
  total_paid: string;
  total_unpaid: string;
  invoice_date: string;
  due_date: string;
  paid_at: string | null;
  currency: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const accessToken = Deno.env.get('MONEYBIRD_ACCESS_TOKEN')!;
  const administrationId = Deno.env.get('MONEYBIRD_ADMINISTRATION_ID')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (!accessToken || !administrationId) {
      return new Response(
        JSON.stringify({ error: 'Moneybird not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { year = new Date().getFullYear() } = body;

    console.log(`[Moneybird Financials] Fetching data for year ${year}`);

    // Fetch all sales invoices for the year
    const periodStart = `${year}-01-01`;
    const periodEnd = `${year}-12-31`;
    
    // Use filter to get invoices for the year
    const invoicesUrl = new URL(`${MONEYBIRD_API_BASE}/${administrationId}/sales_invoices.json`);
    invoicesUrl.searchParams.set('filter', `period:${year}`);
    invoicesUrl.searchParams.set('per_page', '100');

    const allInvoices: MoneybirdInvoice[] = [];
    let page = 1;
    let hasMore = true;

    // Paginate through all invoices
    while (hasMore) {
      invoicesUrl.searchParams.set('page', page.toString());
      
      const invoicesResponse = await fetch(invoicesUrl.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!invoicesResponse.ok) {
        throw new Error(`Failed to fetch invoices: ${invoicesResponse.status}`);
      }

      const invoices: MoneybirdInvoice[] = await invoicesResponse.json();
      
      if (invoices.length === 0) {
        hasMore = false;
      } else {
        allInvoices.push(...invoices);
        page++;
        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Safety limit
      if (page > 10) break;
    }

    console.log(`[Moneybird Financials] Fetched ${allInvoices.length} invoices`);

    // Calculate metrics
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let invoiceCountPaid = 0;
    let invoiceCountOpen = 0;
    let invoiceCountLate = 0;

    const revenueByMonth: Record<string, { revenue: number; paid: number; count: number }> = {};
    const clientRevenue: Record<string, { name: string; revenue: number; paid: number }> = {};
    const now = new Date();

    // Initialize months
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${m.toString().padStart(2, '0')}`;
      revenueByMonth[monthKey] = { revenue: 0, paid: 0, count: 0 };
    }

    // Payment aging buckets
    const paymentAging = {
      current: 0,      // Not yet due
      overdue_30: 0,   // 1-30 days overdue
      overdue_60: 0,   // 31-60 days overdue
      overdue_90: 0,   // 61-90 days overdue
      overdue_90_plus: 0, // 90+ days overdue
    };

    for (const invoice of allInvoices) {
      const amount = parseFloat(invoice.total_price_incl_tax) || 0;
      const paidAmount = parseFloat(invoice.total_paid) || 0;
      const unpaidAmount = parseFloat(invoice.total_unpaid) || 0;
      
      // Skip draft invoices
      if (invoice.state === 'draft') continue;

      totalRevenue += amount;
      totalPaid += paidAmount;
      totalOutstanding += unpaidAmount;

      // Count by status
      if (invoice.state === 'paid') {
        invoiceCountPaid++;
      } else if (invoice.state === 'late') {
        invoiceCountLate++;
        invoiceCountOpen++;
      } else if (invoice.state === 'open' || invoice.state === 'pending_payment') {
        invoiceCountOpen++;
      }

      // Revenue by month
      const invoiceDate = new Date(invoice.invoice_date);
      const monthKey = `${invoiceDate.getFullYear()}-${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (revenueByMonth[monthKey]) {
        revenueByMonth[monthKey].revenue += amount;
        revenueByMonth[monthKey].paid += paidAmount;
        revenueByMonth[monthKey].count++;
      }

      // Client revenue
      const contactId = invoice.contact_id;
      const contactName = invoice.contact?.company_name || 
        `${invoice.contact?.firstname || ''} ${invoice.contact?.lastname || ''}`.trim() ||
        'Unknown';
      
      if (!clientRevenue[contactId]) {
        clientRevenue[contactId] = { name: contactName, revenue: 0, paid: 0 };
      }
      clientRevenue[contactId].revenue += amount;
      clientRevenue[contactId].paid += paidAmount;

      // Payment aging for unpaid invoices
      if (unpaidAmount > 0 && invoice.due_date) {
        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue <= 0) {
          paymentAging.current += unpaidAmount;
        } else if (daysOverdue <= 30) {
          paymentAging.overdue_30 += unpaidAmount;
        } else if (daysOverdue <= 60) {
          paymentAging.overdue_60 += unpaidAmount;
        } else if (daysOverdue <= 90) {
          paymentAging.overdue_90 += unpaidAmount;
        } else {
          paymentAging.overdue_90_plus += unpaidAmount;
        }
      }
    }

    // Format revenue by month for storage
    const revenueByMonthArray = Object.entries(revenueByMonth)
      .map(([month, data]) => ({
        month,
        ...data,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Top clients by revenue
    const topClients = Object.entries(clientRevenue)
      .map(([id, data]) => ({
        contact_id: id,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate gross profit (simplified - just revenue for now)
    const grossProfit = totalPaid;

    // Store the metrics
    const { error: upsertError } = await supabase
      .from('moneybird_financial_metrics')
      .upsert({
        sync_date: new Date().toISOString().split('T')[0],
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: totalRevenue,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
        gross_profit: grossProfit,
        invoice_count_paid: invoiceCountPaid,
        invoice_count_open: invoiceCountOpen,
        invoice_count_late: invoiceCountLate,
        revenue_by_month: revenueByMonthArray,
        top_clients: topClients,
        payment_aging: paymentAging,
        metadata: {
          year,
          total_invoices: allInvoices.length,
          sync_duration_ms: Date.now() - startTime,
        },
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'sync_date,period_start,period_end',
      });

    if (upsertError) {
      console.error('[Moneybird Financials] Failed to save metrics:', upsertError);
      throw upsertError;
    }

    // Log the sync
    await supabase.from('moneybird_sync_logs').insert({
      operation_type: 'fetch_financials',
      entity_type: 'metrics',
      entity_id: year.toString(),
      response_payload: {
        total_revenue: totalRevenue,
        total_paid: totalPaid,
        invoice_count: allInvoices.length,
      },
      success: true,
      duration_ms: Date.now() - startTime,
    });

    const result = {
      year,
      total_revenue: totalRevenue,
      total_paid: totalPaid,
      total_outstanding: totalOutstanding,
      gross_profit: grossProfit,
      invoice_count_paid: invoiceCountPaid,
      invoice_count_open: invoiceCountOpen,
      invoice_count_late: invoiceCountLate,
      revenue_by_month: revenueByMonthArray,
      top_clients: topClients,
      payment_aging: paymentAging,
      last_synced_at: new Date().toISOString(),
    };

    console.log(`[Moneybird Financials] Completed in ${Date.now() - startTime}ms:`, {
      total_revenue: totalRevenue,
      total_paid: totalPaid,
      invoices: allInvoices.length,
    });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Moneybird Financials] Error:', error);
    
    await supabase.from('moneybird_sync_logs').insert({
      operation_type: 'fetch_financials',
      entity_type: 'metrics',
      entity_id: 'error',
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
