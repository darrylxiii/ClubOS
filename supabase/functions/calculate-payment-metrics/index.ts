import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceData {
  contact_id: string;
  total_price_incl_tax_base: number;
  state: string;
  paid_at: string | null;
  due_date: string | null;
  invoice_date: string | null;
}

interface CompanyMetrics {
  companyId: string;
  contactId: string;
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  avgDaysToPay: number | null;
  onTimePaymentRate: number;
  paymentReliabilityScore: number;
  lastPaymentDate: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[calculate-payment-metrics] Starting calculation...');

    // Fetch all invoices with contact mapping
    const { data: invoices, error: invoicesError } = await supabase
      .from('moneybird_sales_invoices')
      .select('contact_id, total_price_incl_tax_base, state, paid_at, due_date, invoice_date')
      .not('contact_id', 'is', null);

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    console.log(`[calculate-payment-metrics] Processing ${invoices?.length || 0} invoices`);

    // Fetch company-contact mappings
    const { data: contactMappings, error: mappingsError } = await supabase
      .from('moneybird_contacts')
      .select('moneybird_contact_id, company_id')
      .not('company_id', 'is', null);

    if (mappingsError) {
      throw new Error(`Failed to fetch contact mappings: ${mappingsError.message}`);
    }

    // Create contact to company lookup
    const contactToCompany = new Map<string, string>();
    for (const mapping of contactMappings || []) {
      if (mapping.moneybird_contact_id && mapping.company_id) {
        contactToCompany.set(mapping.moneybird_contact_id, mapping.company_id);
      }
    }

    console.log(`[calculate-payment-metrics] Found ${contactToCompany.size} contact-company mappings`);

    // Group invoices by company
    const companyInvoices = new Map<string, InvoiceData[]>();
    
    for (const invoice of invoices || []) {
      const companyId = contactToCompany.get(invoice.contact_id);
      if (!companyId) continue;
      
      if (!companyInvoices.has(companyId)) {
        companyInvoices.set(companyId, []);
      }
      companyInvoices.get(companyId)!.push(invoice);
    }

    console.log(`[calculate-payment-metrics] Processing metrics for ${companyInvoices.size} companies`);

    // Calculate metrics for each company
    const updates: { id: string; updates: Record<string, unknown> }[] = [];
    
    for (const [companyId, invoiceList] of companyInvoices) {
      const metrics = calculateCompanyMetrics(companyId, invoiceList);
      
      updates.push({
        id: companyId,
        updates: {
          total_revenue: metrics.totalRevenue,
          total_paid: metrics.totalPaid,
          total_outstanding: metrics.totalOutstanding,
          invoice_count: metrics.invoiceCount,
          payment_reliability_score: metrics.paymentReliabilityScore,
          last_payment_date: metrics.lastPaymentDate,
        },
      });
    }

    // Batch update companies
    let successCount = 0;
    let errorCount = 0;

    for (const update of updates) {
      const { error } = await supabase
        .from('companies')
        .update(update.updates)
        .eq('id', update.id);

      if (error) {
        console.error(`[calculate-payment-metrics] Failed to update company ${update.id}:`, error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`[calculate-payment-metrics] Updated ${successCount} companies, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: updates.length,
        updated: successCount,
        errors: errorCount,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[calculate-payment-metrics] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function calculateCompanyMetrics(companyId: string, invoices: InvoiceData[]): CompanyMetrics {
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let paidInvoiceCount = 0;
  let onTimePayments = 0;
  let totalDaysToPay = 0;
  let daysToPayCount = 0;
  let lastPaymentDate: string | null = null;

  for (const invoice of invoices) {
    const amount = invoice.total_price_incl_tax_base || 0;
    totalRevenue += amount;

    const isPaid = invoice.state === 'paid' || invoice.paid_at;
    
    if (isPaid) {
      totalPaid += amount;
      paidInvoiceCount++;

      // Calculate days to pay
      if (invoice.paid_at && invoice.invoice_date) {
        const invoiceDate = new Date(invoice.invoice_date);
        const paidDate = new Date(invoice.paid_at);
        const daysToPay = Math.floor((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysToPay >= 0) {
          totalDaysToPay += daysToPay;
          daysToPayCount++;
        }

        // Track last payment date
        if (!lastPaymentDate || invoice.paid_at > lastPaymentDate) {
          lastPaymentDate = invoice.paid_at;
        }

        // Check if paid on time
        if (invoice.due_date) {
          const dueDate = new Date(invoice.due_date);
          if (paidDate <= dueDate) {
            onTimePayments++;
          }
        }
      }
    } else {
      totalOutstanding += amount;
    }
  }

  // Calculate averages and rates
  const avgDaysToPay = daysToPayCount > 0 ? totalDaysToPay / daysToPayCount : null;
  const onTimePaymentRate = paidInvoiceCount > 0 ? (onTimePayments / paidInvoiceCount) * 100 : 0;
  
  // Calculate payment reliability score (0-100)
  // Factors:
  // - On-time payment rate: 50 points
  // - Average days to pay (faster = better): 30 points
  // - Collection rate: 20 points
  let score = 0;
  
  // On-time payment rate (0-50 points)
  score += onTimePaymentRate * 0.5;
  
  // Average days to pay (0-30 points, assumes 30 days is baseline)
  if (avgDaysToPay !== null) {
    const daysScore = Math.max(0, 30 - (avgDaysToPay - 30) * 0.5);
    score += Math.min(30, daysScore);
  } else {
    score += 15; // Neutral if no data
  }
  
  // Collection rate (0-20 points)
  const collectionRate = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;
  score += collectionRate * 0.2;
  
  const paymentReliabilityScore = Math.round(Math.min(100, Math.max(0, score)));

  return {
    companyId,
    contactId: '', // Not used in this context
    totalRevenue,
    totalPaid,
    totalOutstanding,
    invoiceCount: invoices.length,
    paidInvoiceCount,
    avgDaysToPay,
    onTimePaymentRate,
    paymentReliabilityScore,
    lastPaymentDate,
  };
}