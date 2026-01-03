import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize company name for fuzzy matching
function normalizeCompanyName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/\s*(b\.?v\.?|n\.?v\.?|bv|nv|ltd\.?|inc\.?|gmbh|llc|limited|holding|group)\.?\s*$/gi, '')
    // Remove "the" prefix
    .replace(/^the\s+/i, '')
    // Remove special characters but keep spaces
    .replace(/[^\w\s]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity score between two strings (Levenshtein-based)
function similarityScore(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  // Simple contains check for high confidence
  if (longer.includes(shorter) || shorter.includes(longer)) {
    return 0.9;
  }
  
  // Levenshtein distance
  const costs: number[] = [];
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }
  
  return (longer.length - costs[str2.length]) / longer.length;
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      action = 'auto-reconcile', 
      invoice_id, 
      company_id,
      year = new Date().getFullYear(),
      threshold = 0.8 
    } = body;

    console.log(`[Reconcile Invoices] Action: ${action}, Year: ${year}`);

    // Manual reconciliation: link specific invoice to company
    if (action === 'manual-link' && invoice_id && company_id) {
      const { error } = await supabase
        .from('moneybird_sales_invoices')
        .update({
          company_id,
          reconciliation_status: 'matched',
          reconciliation_notes: 'Manually linked by admin',
        })
        .eq('id', invoice_id);

      if (error) throw error;

      // Trigger company revenue sync
      await supabase.functions.invoke('sync-company-revenue', {
        body: { company_id }
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Invoice linked to company' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unlink invoice from company
    if (action === 'unlink' && invoice_id) {
      const { error } = await supabase
        .from('moneybird_sales_invoices')
        .update({
          company_id: null,
          reconciliation_status: 'pending',
          reconciliation_notes: 'Unlinked by admin',
        })
        .eq('id', invoice_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Invoice unlinked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get pending invoices
    const { data: pendingInvoices, error: invoicesError } = await supabase
      .from('moneybird_sales_invoices')
      .select('id, moneybird_id, contact_name, contact_id, total_amount, invoice_number, company_id, reconciliation_status')
      .eq('year', year)
      .is('company_id', null);

    if (invoicesError) throw invoicesError;

    console.log(`[Reconcile Invoices] Found ${pendingInvoices?.length || 0} unmatched invoices`);

    // Get all companies for matching
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name');

    if (companiesError) throw companiesError;

    console.log(`[Reconcile Invoices] Loaded ${companies?.length || 0} companies for matching`);

    // Build normalized company lookup
    const companyLookup = new Map<string, { id: string; name: string; normalized: string }>();
    for (const company of companies || []) {
      const normalized = normalizeCompanyName(company.name);
      companyLookup.set(normalized, { 
        id: company.id, 
        name: company.name,
        normalized 
      });
    }

    const results: ReconciliationResult[] = [];
    const autoMatched: string[] = [];
    const suggestions: { invoice_id: string; suggestions: { company_id: string; company_name: string; score: number }[] }[] = [];

    for (const invoice of pendingInvoices || []) {
      const invoiceContactNormalized = normalizeCompanyName(invoice.contact_name);
      
      let bestMatch: { company: { id: string; name: string; normalized: string }; score: number; method: string } | null = null;

      // First: try exact match on normalized name
      const exactMatch = companyLookup.get(invoiceContactNormalized);
      if (exactMatch) {
        bestMatch = { company: exactMatch, score: 1, method: 'exact' };
      }

      // Second: fuzzy matching
      if (!bestMatch) {
        for (const [_, company] of companyLookup) {
          const score = similarityScore(invoiceContactNormalized, company.normalized);
          if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { company, score, method: 'fuzzy' };
          }
        }
      }

      // Collect all potential matches for suggestions
      const allMatches: { company_id: string; company_name: string; score: number }[] = [];
      for (const [_, company] of companyLookup) {
        const score = similarityScore(invoiceContactNormalized, company.normalized);
        if (score >= 0.5) {
          allMatches.push({ company_id: company.id, company_name: company.name, score });
        }
      }
      allMatches.sort((a, b) => b.score - a.score);

      if (bestMatch && bestMatch.score >= threshold) {
        // Auto-match if score is above threshold
        if (action === 'auto-reconcile') {
          const { error: updateError } = await supabase
            .from('moneybird_sales_invoices')
            .update({
              company_id: bestMatch.company.id,
              reconciliation_status: 'matched',
              reconciliation_notes: `Auto-matched (${bestMatch.method}, score: ${bestMatch.score.toFixed(2)})`,
            })
            .eq('id', invoice.id);

          if (!updateError) {
            autoMatched.push(invoice.id);
          }
        }

        results.push({
          invoice_id: invoice.id,
          moneybird_id: invoice.moneybird_id,
          contact_name: invoice.contact_name || '',
          matched_company_id: bestMatch.company.id,
          matched_company_name: bestMatch.company.name,
          match_score: bestMatch.score,
          match_method: bestMatch.method,
          status: 'matched',
        });
      } else if (allMatches.length > 0) {
        // Store suggestions for manual review
        results.push({
          invoice_id: invoice.id,
          moneybird_id: invoice.moneybird_id,
          contact_name: invoice.contact_name || '',
          matched_company_id: allMatches[0].company_id,
          matched_company_name: allMatches[0].company_name,
          match_score: allMatches[0].score,
          match_method: 'suggested',
          status: 'suggested',
        });

        suggestions.push({
          invoice_id: invoice.id,
          suggestions: allMatches.slice(0, 5),
        });
      } else {
        results.push({
          invoice_id: invoice.id,
          moneybird_id: invoice.moneybird_id,
          contact_name: invoice.contact_name || '',
          matched_company_id: null,
          matched_company_name: null,
          match_score: 0,
          match_method: 'none',
          status: 'unmatched',
        });
      }
    }

    // Trigger company revenue sync for all matched companies
    if (autoMatched.length > 0) {
      const matchedCompanyIds = new Set(
        results
          .filter(r => r.status === 'matched' && r.matched_company_id)
          .map(r => r.matched_company_id!)
      );

      console.log(`[Reconcile Invoices] Triggering revenue sync for ${matchedCompanyIds.size} companies`);
      
      // Sync revenue for matched companies (in background)
      for (const companyId of matchedCompanyIds) {
        supabase.functions.invoke('sync-company-revenue', {
          body: { company_id: companyId }
        }).catch(err => console.error('Revenue sync error:', err));
      }
    }

    // Summary stats
    const stats = {
      total_pending: pendingInvoices?.length || 0,
      auto_matched: autoMatched.length,
      suggested: results.filter(r => r.status === 'suggested').length,
      unmatched: results.filter(r => r.status === 'unmatched').length,
      threshold_used: threshold,
    };

    console.log(`[Reconcile Invoices] Stats:`, stats);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats,
        results,
        suggestions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Reconcile Invoices] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
