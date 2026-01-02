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

// Helper: parse amount robustly (handles EU comma decimals)
function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const str = String(value).replace(',', '.');
  return Number(str) || 0;
}

// Helper: extract date from invoice with fallback chain
function getInvoiceDate(invoice: Record<string, unknown>): Date | null {
  const dateStr = invoice.invoice_date ?? invoice.date ?? invoice.updated_at ?? invoice.created_at;
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
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

  // Diagnostics object to track what's happening
  const diagnostics: Record<string, unknown> = {
    year: null,
    api_total_fetched: 0,
    api_page1_count: 0,
    api_page1_date_min: null,
    api_page1_date_max: null,
    api_page1_missing_date: 0,
    api_page1_sample_dates: [] as string[],
    filtered_count: 0,
    filtered_date_min: null,
    filtered_date_max: null,
  };

  try {
    if (!accessToken || !administrationId) {
      return new Response(
        JSON.stringify({ error: 'Moneybird not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { year = new Date().getFullYear() } = body;
    diagnostics.year = year;

    console.log(`[Moneybird Financials] Fetching data for year ${year}`);

    // Use numeric date comparison (robust against timestamps)
    const periodStart = `${year}-01-01`;
    const periodEnd = `${year}-12-31`;
    const startTs = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).getTime();
    const endTs = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).getTime();
    
    const allInvoices: MoneybirdInvoice[] = [];
    let page = 1;
    let hasMore = true;

    console.log(`[Moneybird Financials] Fetching invoices for period ${periodStart} to ${periodEnd} (timestamps ${startTs} to ${endTs})`);

    // Paginate through all invoices
    while (hasMore) {
      const invoicesUrl = new URL(`${MONEYBIRD_API_BASE}/${administrationId}/sales_invoices.json`);
      invoicesUrl.searchParams.set('per_page', '100');
      invoicesUrl.searchParams.set('page', page.toString());
      
      console.log(`[Moneybird Financials] Fetching page ${page}...`);
      
      const invoicesResponse = await fetch(invoicesUrl.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!invoicesResponse.ok) {
        const errorBody = await invoicesResponse.text();
        console.error(`[Moneybird Financials] API error: ${invoicesResponse.status} - ${errorBody}`);
        throw new Error(`Moneybird API error (${invoicesResponse.status}): ${errorBody.slice(0, 200)}`);
      }

      const invoices: MoneybirdInvoice[] = await invoicesResponse.json();
      console.log(`[Moneybird Financials] Page ${page}: ${invoices.length} invoices`);
      diagnostics.api_total_fetched = (diagnostics.api_total_fetched as number) + invoices.length;
      
      // Collect diagnostics on first page
      if (page === 1) {
        diagnostics.api_page1_count = invoices.length;
        const parsedDates: Date[] = [];
        for (const inv of invoices) {
          const d = getInvoiceDate(inv as unknown as Record<string, unknown>);
          if (d) {
            parsedDates.push(d);
          } else {
            diagnostics.api_page1_missing_date = (diagnostics.api_page1_missing_date as number) + 1;
          }
        }
        if (parsedDates.length > 0) {
          parsedDates.sort((a, b) => a.getTime() - b.getTime());
          diagnostics.api_page1_date_min = parsedDates[0].toISOString().split('T')[0];
          diagnostics.api_page1_date_max = parsedDates[parsedDates.length - 1].toISOString().split('T')[0];
          diagnostics.api_page1_sample_dates = parsedDates.slice(0, 5).map(d => d.toISOString().split('T')[0]);
        }
        console.log(`[Moneybird Financials] Page 1 diagnostics:`, JSON.stringify(diagnostics));
      }
      
      if (invoices.length === 0) {
        hasMore = false;
      } else {
        // Filter invoices by date using numeric comparison
        const filteredInvoices = invoices.filter(inv => {
          const invDate = getInvoiceDate(inv as unknown as Record<string, unknown>);
          if (!invDate) return false;
          const ts = invDate.getTime();
          return ts >= startTs && ts <= endTs;
        });
        
        console.log(`[Moneybird Financials] Page ${page}: ${filteredInvoices.length} invoices match ${year}`);
        allInvoices.push(...filteredInvoices);
        
        page++;
        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Safety limit (50 pages = 5000 invoices max)
      if (page > 50) {
        console.log(`[Moneybird Financials] Reached page limit, stopping pagination`);
        break;
      }
    }
    
    // Update filtered diagnostics
    diagnostics.filtered_count = allInvoices.length;
    if (allInvoices.length > 0) {
      const filteredDates = allInvoices
        .map(inv => getInvoiceDate(inv as unknown as Record<string, unknown>))
        .filter((d): d is Date => d !== null)
        .sort((a, b) => a.getTime() - b.getTime());
      if (filteredDates.length > 0) {
        diagnostics.filtered_date_min = filteredDates[0].toISOString().split('T')[0];
        diagnostics.filtered_date_max = filteredDates[filteredDates.length - 1].toISOString().split('T')[0];
      }
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
      const amount = parseAmount(invoice.total_price_incl_tax);
      const paidAmount = parseAmount(invoice.total_paid);
      const unpaidAmount = parseAmount(invoice.total_unpaid);
      
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
      const invoiceDate = getInvoiceDate(invoice as unknown as Record<string, unknown>);
      if (invoiceDate) {
        const monthKey = `${invoiceDate.getFullYear()}-${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}`;
        if (revenueByMonth[monthKey]) {
          revenueByMonth[monthKey].revenue += amount;
          revenueByMonth[monthKey].paid += paidAmount;
          revenueByMonth[monthKey].count++;
        }
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
          diagnostics,
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
      diagnostics,
    });

    return new Response(
      JSON.stringify({ success: true, data: result, diagnostics }),
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
