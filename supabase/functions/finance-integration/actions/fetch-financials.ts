import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getMoneybirdConfig, MONEYBIRD_API_BASE } from "../utils/moneybird.ts";

const FetchFinancialsSchema = z.object({
    year: z.number().default(() => new Date().getFullYear()),
});

// Helper: parse amount robustly
function parseAmount(value: string | number | null | undefined): number {
    if (value == null) return 0;
    const str = String(value).replace(',', '.');
    return Number(str) || 0;
}

// Helper: extract date
function getInvoiceDate(invoice: any): Date | null {
    const dateStr = invoice.invoice_date ?? invoice.date ?? invoice.updated_at;
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

export async function handleFetchFinancials(supabase: SupabaseClient, payload: any) {
    const input = FetchFinancialsSchema.parse(payload);
    const { accessToken, administrationId } = getMoneybirdConfig();
    const startTime = Date.now();

    console.log(`[Action: Fetch Financials] Year: ${input.year}`);

    // 1. Fetch Invoices (Full Pagination)
    const periodFilter = `${input.year}0101..${input.year}1231`;
    let allInvoices: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const invoicesUrl = new URL(`${MONEYBIRD_API_BASE}/${administrationId}/sales_invoices.json`);
        invoicesUrl.searchParams.set('per_page', '100');
        invoicesUrl.searchParams.set('page', page.toString());
        invoicesUrl.searchParams.set('filter', 'state:all');
        invoicesUrl.searchParams.set('period', periodFilter);

        const res = await fetch(invoicesUrl.toString(), {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!res.ok) throw new Error(`Moneybird API Error (Page ${page}): ${await res.text()}`);

        const rawData = await res.json();
        const invoices = Array.isArray(rawData) ? rawData : [];

        if (invoices.length === 0) {
            hasMore = false;
        } else {
            allInvoices.push(...invoices);
            page++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (page > 100) break;
    }

    // 2. Calculate Metrics (Ported Logic)
    let totalRevenue = 0;       // Net revenue (excl. VAT)
    let totalRevenueGross = 0;
    let totalVAT = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let invoiceCountPaid = 0;
    let invoiceCountOpen = 0;
    let invoiceCountLate = 0;
    let draftPipelineAmount = 0;
    let draftPipelineCount = 0;

    const revenueByMonth: Record<string, { revenue: number; paid: number; count: number }> = {};
    const clientRevenue: Record<string, { name: string; revenue: number; paid: number }> = {};
    const paymentAging = { current: 0, overdue_30: 0, overdue_60: 0, overdue_90: 0, overdue_90_plus: 0 };
    const now = new Date();

    // Initialize months
    for (let m = 1; m <= 12; m++) {
        const monthKey = `${input.year}-${m.toString().padStart(2, '0')}`;
        revenueByMonth[monthKey] = { revenue: 0, paid: 0, count: 0 };
    }

    for (const invoice of allInvoices) {
        const amount = parseAmount(invoice.total_price_incl_tax);
        const netAmount = parseAmount(invoice.total_price_excl_tax) || amount / 1.21;
        const paidAmount = parseAmount(invoice.total_paid);
        const unpaidAmount = parseAmount(invoice.total_unpaid);
        const state = (invoice.state || '').toLowerCase();
        const invoiceDate = getInvoiceDate(invoice);

        const contactName = invoice.contact?.company_name ||
            `${invoice.contact?.firstname || ''} ${invoice.contact?.lastname || ''}`.trim() || 'Unknown';

        // Drafts
        if (state === 'draft' || state === 'scheduled') {
            draftPipelineCount++;
            draftPipelineAmount += amount;
            continue;
        }

        // Metrics
        totalRevenue += netAmount;
        totalRevenueGross += amount;
        totalVAT += amount - netAmount;
        totalPaid += paidAmount > 0 ? netAmount * (paidAmount / amount) : 0;
        totalOutstanding += unpaidAmount > 0 ? netAmount * (unpaidAmount / amount) : 0;

        // Counts
        if (state === 'paid') invoiceCountPaid++;
        else if (state === 'late' || state === 'reminded') { invoiceCountLate++; invoiceCountOpen++; }
        else if (state === 'open' || state === 'pending_payment') invoiceCountOpen++;

        // Revenue By Month
        if (invoiceDate) {
            const monthKey = `${invoiceDate.getFullYear()}-${(invoiceDate.getMonth() + 1).toString().padStart(2, '0')}`;
            if (revenueByMonth[monthKey]) {
                revenueByMonth[monthKey].revenue += netAmount;
                revenueByMonth[monthKey].paid += paidAmount > 0 ? netAmount * (paidAmount / amount) : 0;
                revenueByMonth[monthKey].count++;
            }
        }

        // Client Revenue
        const contactId = invoice.contact_id || 'unknown';
        if (!clientRevenue[contactId]) clientRevenue[contactId] = { name: contactName, revenue: 0, paid: 0 };
        clientRevenue[contactId].revenue += netAmount;
        clientRevenue[contactId].paid += paidAmount > 0 ? netAmount * (paidAmount / amount) : 0;

        // Aging
        if (unpaidAmount > 0 && invoice.due_date) {
            const dueDate = new Date(invoice.due_date);
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysOverdue <= 0) paymentAging.current += unpaidAmount;
            else if (daysOverdue <= 30) paymentAging.overdue_30 += unpaidAmount;
            else if (daysOverdue <= 60) paymentAging.overdue_60 += unpaidAmount;
            else if (daysOverdue <= 90) paymentAging.overdue_90 += unpaidAmount;
            else paymentAging.overdue_90_plus += unpaidAmount;
        }
    }

    // 3. Format Output
    const revenueByMonthArray = Object.entries(revenueByMonth)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

    const topClients = Object.entries(clientRevenue)
        .map(([id, data]) => ({ contact_id: id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    // 4. Store Metrics (Side Effect)
    await supabase.from('moneybird_financial_metrics').upsert({
        sync_date: new Date().toISOString().split('T')[0],
        period_start: `${input.year}-01-01`,
        period_end: `${input.year}-12-31`,
        total_revenue: totalRevenue,
        total_revenue_gross: totalRevenueGross,
        vat_amount: totalVAT,
        total_paid: totalPaid,
        total_outstanding: totalOutstanding,
        gross_profit: totalPaid,
        invoice_count_paid: invoiceCountPaid,
        invoice_count_open: invoiceCountOpen,
        invoice_count_late: invoiceCountLate,
        revenue_by_month: revenueByMonthArray,
        top_clients: topClients,
        payment_aging: paymentAging,
        metadata: {
            year: input.year,
            total_invoices: allInvoices.length,
            draft_pipeline_count: draftPipelineCount,
            draft_pipeline_amount: draftPipelineAmount,
            sync_duration_ms: Date.now() - startTime
        },
        last_synced_at: new Date().toISOString()
    }, { onConflict: 'period_start' });

    // 5. Log Success
    await supabase.from('moneybird_sync_logs').insert({
        operation_type: 'fetch_financials',
        entity_type: 'metrics',
        entity_id: input.year.toString(),
        success: true,
        duration_ms: Date.now() - startTime,
        response_payload: { count: allInvoices.length }
    });

    return {
        success: true,
        data: {
            year: input.year,
            total_revenue: totalRevenue,
            total_paid: totalPaid,
            total_outstanding: totalOutstanding,
            gross_profit: totalPaid,
            invoice_count_paid: invoiceCountPaid,
            invoice_count_open: invoiceCountOpen,
            invoice_count_late: invoiceCountLate,
            draft_pipeline_count: draftPipelineCount,
            draft_pipeline_amount: draftPipelineAmount,
            revenue_by_month: revenueByMonthArray,
            top_clients: topClients,
            payment_aging: paymentAging,
            last_synced_at: new Date().toISOString(),
        }
    };
}
