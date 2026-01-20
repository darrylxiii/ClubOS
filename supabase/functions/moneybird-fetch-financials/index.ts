import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2';

interface MoneybirdInvoiceDetail {
  id: string;
  description: string;
  amount: string;
  price: string;
  total_price_excl_tax_with_discount: string;
}

interface MoneybirdInvoice {
  id: string;
  contact_id: string;
  contact: { company_name?: string; firstname?: string; lastname?: string } | null;
  invoice_id: string;
  state: string;
  total_price_incl_tax: string;
  total_price_excl_tax: string;
  total_paid: string;
  total_unpaid: string;
  invoice_date: string;
  due_date: string;
  paid_at: string | null;
  currency: string;
  details?: MoneybirdInvoiceDetail[];
}

interface CompanyRetainerInfo {
  id: string;
  has_retainer: boolean;
  monthly_retainer_amount: number | null;
}

// Normalize Moneybird states to consistent vocabulary
function normalizeState(rawState: string | undefined | null): string {
  const state = (rawState || '').toLowerCase().trim();
  
  const stateMap: Record<string, string> = {
    'draft': 'draft',
    'open': 'open',
    'scheduled': 'scheduled',
    'pending_payment': 'pending_payment',
    'late': 'late',
    'reminded': 'late',
    'paid': 'paid',
    'uncollectible': 'uncollectible',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
  };
  
  return stateMap[state] || 'open'; // Default to 'open' if unknown (safer than 'unknown')
}

// Helper: parse amount robustly (handles EU comma decimals)
function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const str = String(value).replace(',', '.');
  const num = Number(str) || 0;
  // Amounts from Moneybird are in euros, not cents
  return num;
}

// Classify invoice as retainer or placement based on description patterns
function classifyInvoice(
  description: string,
  netAmount: number,
  companyRetainer: CompanyRetainerInfo | null
): 'retainer' | 'placement_fee' | 'other' {
  if (!description) {
    return companyRetainer?.has_retainer ? 'other' : 'placement_fee';
  }
  
  // Pattern 1: Month + Year pattern = Retainer (e.g., "January 2025", "Januari 2025")
  const monthYearPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december|januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s*\d{4}\b/i;
  if (monthYearPattern.test(description)) {
    return 'retainer';
  }
  
  // Pattern 2: Company has retainer + amount matches (within €10 tolerance) = Retainer
  if (companyRetainer?.has_retainer && companyRetainer.monthly_retainer_amount) {
    const tolerance = 10;
    if (Math.abs(netAmount - companyRetainer.monthly_retainer_amount) < tolerance) {
      return 'retainer';
    }
  }
  
  // Pattern 3: Contains a person's name (First Last format) = Placement Fee
  // This is a heuristic: if description starts with capitalized words that look like a name
  const namePattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+/;
  if (namePattern.test(description.trim())) {
    return 'placement_fee';
  }
  
  // Default: placement_fee for non-retainer companies, 'other' for retainer companies
  return companyRetainer?.has_retainer ? 'other' : 'placement_fee';
}

// Helper: extract date from invoice with fallback chain
function getInvoiceDate(invoice: Record<string, unknown>): Date | null {
  const dateStr = invoice.invoice_date ?? invoice.date ?? invoice.updated_at ?? invoice.created_at;
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Helper: unwrap invoice if wrapped in { sales_invoice: {...} }
function unwrapInvoice(item: unknown): MoneybirdInvoice | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;
  
  // Check if wrapped
  if (obj.sales_invoice && typeof obj.sales_invoice === 'object') {
    return obj.sales_invoice as MoneybirdInvoice;
  }
  
  // Plain invoice object
  if (obj.id && (obj.invoice_date || obj.state || obj.total_price_incl_tax)) {
    return item as MoneybirdInvoice;
  }
  
  return null;
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
    response_shape: 'unknown',
    api_total_fetched: 0,
    api_page1_count: 0,
    api_page1_sample_keys: [] as string[],
    api_page1_states: [] as string[],
    api_page1_state_counts: {} as Record<string, number>,
    api_page1_normalized_state_counts: {} as Record<string, number>,
    api_page1_sample_amounts: [] as number[],
    filtered_count: 0,
    draft_pipeline_count: 0,
    draft_pipeline_amount: 0,
    processed_count: 0,
    stored_invoices_count: 0,
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

    const periodStart = `${year}-01-01`;
    const periodEnd = `${year}-12-31`;
    const startTs = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).getTime();
    const endTs = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)).getTime();
    
    const allInvoices: MoneybirdInvoice[] = [];
    let page = 1;
    let hasMore = true;

    console.log(`[Moneybird Financials] Fetching invoices for period ${periodStart} to ${periodEnd}`);

    // Paginate through all invoices
    while (hasMore) {
      const invoicesUrl = new URL(`${MONEYBIRD_API_BASE}/${administrationId}/sales_invoices.json`);
      invoicesUrl.searchParams.set('per_page', '100');
      invoicesUrl.searchParams.set('page', page.toString());
      // Request all states explicitly
      invoicesUrl.searchParams.set('filter', 'state:all');
      
      console.log(`[Moneybird Financials] Fetching page ${page}...`);
      
      const invoicesResponse = await fetch(invoicesUrl.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!invoicesResponse.ok) {
        const errorBody = await invoicesResponse.text();
        console.error(`[Moneybird Financials] API error: ${invoicesResponse.status} - ${errorBody}`);
        throw new Error(`Moneybird API error (${invoicesResponse.status}): ${errorBody.slice(0, 200)}`);
      }

      const rawResponse = await invoicesResponse.json();
      
      // Handle both array and wrapped responses
      let invoices: MoneybirdInvoice[] = [];
      if (Array.isArray(rawResponse)) {
        diagnostics.response_shape = 'array';
        invoices = rawResponse.map(unwrapInvoice).filter((inv): inv is MoneybirdInvoice => inv !== null);
      } else if (rawResponse && typeof rawResponse === 'object') {
        diagnostics.response_shape = 'object';
        // Try to find invoices array in response
        const possibleArrays = ['sales_invoices', 'invoices', 'data'];
        for (const key of possibleArrays) {
          if (Array.isArray(rawResponse[key])) {
            invoices = rawResponse[key].map(unwrapInvoice).filter((inv): inv is MoneybirdInvoice => inv !== null);
            diagnostics.response_shape = `object.${key}`;
            break;
          }
        }
      }
      
      console.log(`[Moneybird Financials] Page ${page}: ${invoices.length} invoices (shape: ${diagnostics.response_shape})`);
      diagnostics.api_total_fetched = (diagnostics.api_total_fetched as number) + invoices.length;
      
      // Collect diagnostics on first page
      if (page === 1 && invoices.length > 0) {
        diagnostics.api_page1_count = invoices.length;
        diagnostics.api_page1_sample_keys = Object.keys(invoices[0]).slice(0, 10);
        
        const stateCounts: Record<string, number> = {};
        const normalizedStateCounts: Record<string, number> = {};
        const sampleAmounts: number[] = [];
        
        for (const inv of invoices) {
          // Track raw states
          const rawState = inv.state || 'missing';
          stateCounts[rawState] = (stateCounts[rawState] || 0) + 1;
          
          // Track normalized states
          const normalizedState = normalizeState(inv.state);
          normalizedStateCounts[normalizedState] = (normalizedStateCounts[normalizedState] || 0) + 1;
          
          // Track sample amounts (first 5)
          if (sampleAmounts.length < 5) {
            sampleAmounts.push(parseAmount(inv.total_price_incl_tax));
          }
        }
        
        diagnostics.api_page1_states = Object.keys(stateCounts);
        diagnostics.api_page1_state_counts = stateCounts;
        diagnostics.api_page1_normalized_state_counts = normalizedStateCounts;
        diagnostics.api_page1_sample_amounts = sampleAmounts;
        
        console.log(`[Moneybird Financials] Page 1 diagnostics:`, JSON.stringify({
          count: invoices.length,
          shape: diagnostics.response_shape,
          states: stateCounts,
          normalized: normalizedStateCounts,
          amounts: sampleAmounts,
          sampleKeys: diagnostics.api_page1_sample_keys,
        }));
      }
      
      if (invoices.length === 0) {
        hasMore = false;
      } else {
        // Filter invoices by date
        const filteredInvoices = invoices.filter(inv => {
          const invDate = getInvoiceDate(inv as unknown as Record<string, unknown>);
          if (!invDate) return false;
          const ts = invDate.getTime();
          return ts >= startTs && ts <= endTs;
        });
        
        console.log(`[Moneybird Financials] Page ${page}: ${filteredInvoices.length} invoices match ${year}`);
        allInvoices.push(...filteredInvoices);
        
        page++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (page > 50) {
        console.log(`[Moneybird Financials] Reached page limit`);
        break;
      }
    }
    
    diagnostics.filtered_count = allInvoices.length;
    console.log(`[Moneybird Financials] Total filtered: ${allInvoices.length} invoices for ${year}`);

    // Calculate metrics with proper state handling
    // All amounts are NET (excluding 21% Dutch VAT) to reflect actual revenue
    let totalRevenue = 0;       // Net revenue (excl. VAT)
    let totalRevenueGross = 0;  // Gross revenue (incl. VAT) for reference
    let totalVAT = 0;           // Total VAT amount
    let totalPaid = 0;
    let totalOutstanding = 0;
    let invoiceCountPaid = 0;
    let invoiceCountOpen = 0;
    let invoiceCountLate = 0;
    let draftPipelineAmount = 0;
    let draftPipelineCount = 0;

    const revenueByMonth: Record<string, { revenue: number; paid: number; count: number }> = {};
    const clientRevenue: Record<string, { name: string; revenue: number; paid: number }> = {};
    const now = new Date();
    
    // Fetch companies with retainer info for classification
    const { data: retainerCompanies } = await supabase
      .from('companies')
      .select('id, name, has_retainer, monthly_retainer_amount')
      .eq('has_retainer', true);
    
    const retainerCompanyMap = new Map<string, CompanyRetainerInfo>();
    const companyNameMap = new Map<string, string>();
    retainerCompanies?.forEach(c => {
      companyNameMap.set(c.name?.toLowerCase() || '', c.id);
      retainerCompanyMap.set(c.id, {
        id: c.id,
        has_retainer: c.has_retainer,
        monthly_retainer_amount: c.monthly_retainer_amount,
      });
    });

    // Prepare invoice rows for storage
    const invoiceRows: Array<{
      moneybird_id: string;
      invoice_number: string | null;
      contact_id: string | null;
      contact_name: string | null;
      state_raw: string | null;
      state_normalized: string;
      invoice_date: string | null;
      due_date: string | null;
      paid_at: string | null;
      total_amount: number;
      net_amount: number;
      paid_amount: number;
      unpaid_amount: number;
      currency: string;
      year: number;
      raw_data: Record<string, unknown>;
      reconciliation_status: string;
      invoice_type: string;
      invoice_description: string | null;
    }> = [];

    // Initialize months
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${m.toString().padStart(2, '0')}`;
      revenueByMonth[monthKey] = { revenue: 0, paid: 0, count: 0 };
    }

    // Payment aging buckets
    const paymentAging = {
      current: 0,
      overdue_30: 0,
      overdue_60: 0,
      overdue_90: 0,
      overdue_90_plus: 0,
    };

    for (const invoice of allInvoices) {
      const amount = parseAmount(invoice.total_price_incl_tax);
      const netAmount = parseAmount(invoice.total_price_excl_tax) || amount / 1.21;
      const paidAmount = parseAmount(invoice.total_paid);
      const unpaidAmount = parseAmount(invoice.total_unpaid);
      const normalizedState = normalizeState(invoice.state);
      
      const invoiceDate = getInvoiceDate(invoice as unknown as Record<string, unknown>);
      const contactName = invoice.contact?.company_name || 
        `${invoice.contact?.firstname || ''} ${invoice.contact?.lastname || ''}`.trim() ||
        'Unknown';
      
      // Get invoice description from details
      const description = invoice.details?.[0]?.description || '';
      
      // Find matching retainer company by name
      const companyId = companyNameMap.get(contactName.toLowerCase());
      const companyRetainer = companyId ? retainerCompanyMap.get(companyId) : null;
      
      // Classify invoice type
      const invoiceType = classifyInvoice(description, netAmount, companyRetainer ?? null);
      
      // Prepare invoice row for storage
      invoiceRows.push({
        moneybird_id: invoice.id,
        invoice_number: invoice.invoice_id || null,
        contact_id: invoice.contact_id || null,
        contact_name: contactName,
        state_raw: invoice.state,
        state_normalized: normalizedState,
        invoice_date: invoiceDate ? invoiceDate.toISOString().split('T')[0] : null,
        due_date: invoice.due_date || null,
        paid_at: invoice.paid_at || null,
        total_amount: amount,
        net_amount: netAmount,
        paid_amount: paidAmount,
        unpaid_amount: unpaidAmount,
        currency: invoice.currency || 'EUR',
        year: year,
        raw_data: { 
          state: invoice.state,
          contact: invoice.contact,
          details: invoice.details,
        },
        reconciliation_status: 'pending',
        invoice_type: invoiceType,
        invoice_description: description || null,
      });
      
      // Track drafts separately (don't include in YTD revenue)
      if (normalizedState === 'draft' || normalizedState === 'scheduled') {
        draftPipelineCount++;
        draftPipelineAmount += amount;
        continue;
      }
      
      diagnostics.processed_count = (diagnostics.processed_count as number) + 1;

      // Include in revenue calculations - USE NET AMOUNTS (excluding 21% VAT)
      // This ensures revenue reflects actual earnings, not VAT collected for the government
      totalRevenue += netAmount;  // Net amount (excl. VAT)
      totalPaid += paidAmount > 0 ? netAmount * (paidAmount / amount) : 0;  // Proportional net paid
      totalOutstanding += unpaidAmount > 0 ? netAmount * (unpaidAmount / amount) : 0;  // Proportional net outstanding

      // Count by status
      if (normalizedState === 'paid') {
        invoiceCountPaid++;
      } else if (normalizedState === 'late') {
        invoiceCountLate++;
        invoiceCountOpen++;
      } else if (normalizedState === 'open' || normalizedState === 'pending_payment') {
        invoiceCountOpen++;
      }

      // Track gross and VAT for transparency
      totalRevenueGross += amount;
      totalVAT += amount - netAmount;

      // Revenue by month - use NET amounts
      if (invoiceDate) {
        const monthKey = `${invoiceDate.getFullYear()}-${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}`;
        if (revenueByMonth[monthKey]) {
          revenueByMonth[monthKey].revenue += netAmount;  // Net revenue
          revenueByMonth[monthKey].paid += paidAmount > 0 ? netAmount * (paidAmount / amount) : 0;  // Net paid
          revenueByMonth[monthKey].count++;
        }
      }

      // Client revenue
      const contactId = invoice.contact_id;
      if (!clientRevenue[contactId]) {
        clientRevenue[contactId] = { name: contactName, revenue: 0, paid: 0 };
      }
      clientRevenue[contactId].revenue += netAmount;  // Net revenue
      clientRevenue[contactId].paid += paidAmount > 0 ? netAmount * (paidAmount / amount) : 0;  // Net paid

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

    diagnostics.draft_pipeline_count = draftPipelineCount;
    diagnostics.draft_pipeline_amount = draftPipelineAmount;

    // Store invoice rows (upsert by moneybird_id)
    if (invoiceRows.length > 0) {
      // Delete existing invoices for this year first, then insert new ones
      const { error: deleteError } = await supabase
        .from('moneybird_sales_invoices')
        .delete()
        .eq('year', year);
      
      if (deleteError) {
        console.error('[Moneybird Financials] Failed to clear old invoices:', deleteError);
      }
      
      const { error: insertError } = await supabase
        .from('moneybird_sales_invoices')
        .insert(invoiceRows);
      
      if (insertError) {
        console.error('[Moneybird Financials] Failed to store invoices:', insertError);
      } else {
        diagnostics.stored_invoices_count = invoiceRows.length;
        console.log(`[Moneybird Financials] Stored ${invoiceRows.length} invoice rows`);
      }
    }

    // Format revenue by month for storage
    const revenueByMonthArray = Object.entries(revenueByMonth)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Top clients by revenue
    const topClients = Object.entries(clientRevenue)
      .map(([id, data]) => ({ contact_id: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const grossProfit = totalPaid;

    // Store the metrics - all amounts are NET (excluding VAT)
    const { error: upsertError } = await supabase
      .from('moneybird_financial_metrics')
      .upsert({
        sync_date: new Date().toISOString().split('T')[0],
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: totalRevenue,           // Net revenue (excl. VAT)
        total_revenue_gross: totalRevenueGross, // Gross revenue (incl. VAT)
        vat_amount: totalVAT,                  // VAT amount (21%)
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
          draft_pipeline_count: draftPipelineCount,
          draft_pipeline_amount: draftPipelineAmount,
          sync_duration_ms: Date.now() - startTime,
          diagnostics,
        },
        last_synced_at: new Date().toISOString(),
      }, {
        onConflict: 'period_start',
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
        draft_pipeline: { count: draftPipelineCount, amount: draftPipelineAmount },
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
      draft_pipeline_count: draftPipelineCount,
      draft_pipeline_amount: draftPipelineAmount,
      revenue_by_month: revenueByMonthArray,
      top_clients: topClients,
      payment_aging: paymentAging,
      last_synced_at: new Date().toISOString(),
    };

    console.log(`[Moneybird Financials] Completed in ${Date.now() - startTime}ms:`, {
      total_revenue: totalRevenue,
      draft_pipeline: draftPipelineAmount,
      invoices: allInvoices.length,
      stored: diagnostics.stored_invoices_count,
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
