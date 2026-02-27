import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { year, quarter } = await req.json();
    const currentYear = year || new Date().getFullYear();
    const currentQuarter = quarter || `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Gather financial data
    const prevYear = currentYear - 1;

    const fetchYearRevenue = async (yr: number) => {
      const { data } = await supabase
        .from("moneybird_sales_invoices")
        .select("total_amount, net_amount, contact_id, contact_name")
        .gte("invoice_date", `${yr}-01-01`)
        .lt("invoice_date", `${yr + 1}-01-01`);
      const revenue = (data || []).reduce((s: number, i: any) => s + (Number(i.net_amount) || Number(i.total_amount) * 0.83 || 0), 0);
      const clients = new Set((data || []).map((i: any) => i.contact_id).filter(Boolean)).size;
      return { revenue, clients, invoiceCount: data?.length || 0 };
    };

    const fetchYearExpenses = async (yr: number) => {
      const { data: exps } = await supabase
        .from("operating_expenses")
        .select("amount, amount_eur")
        .gte("expense_date", `${yr}-01-01`)
        .lt("expense_date", `${yr + 1}-01-01`);
      return (exps || []).reduce((s: number, e: any) => s + (Number(e.amount_eur ?? e.amount) || 0), 0);
    };

    const fetchCommissions = async (yr: number) => {
      const { data } = await supabase
        .from("employee_commissions")
        .select("gross_amount")
        .gte("created_at", `${yr}-01-01`)
        .lt("created_at", `${yr + 1}-01-01`);
      return (data || []).reduce((s: number, c: any) => s + (c.gross_amount || 0), 0);
    };

    const [curRev, prevRev, curExp, prevExp, curComm, prevComm] = await Promise.all([
      fetchYearRevenue(currentYear),
      fetchYearRevenue(prevYear),
      fetchYearExpenses(currentYear),
      fetchYearExpenses(prevYear),
      fetchCommissions(currentYear),
      fetchCommissions(prevYear),
    ]);

    const { count: totalPlacements } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "hired");

    const { count: totalCandidates } = await supabase
      .from("candidate_profiles")
      .select("id", { count: "exact", head: true });

    const financialData = {
      currentYear,
      previousYear: prevYear,
      quarter: currentQuarter,
      currentRevenue: curRev.revenue,
      previousRevenue: prevRev.revenue,
      revenueGrowth: prevRev.revenue > 0 ? ((curRev.revenue / prevRev.revenue - 1) * 100).toFixed(1) : "N/A",
      currentClients: curRev.clients,
      previousClients: prevRev.clients,
      currentInvoices: curRev.invoiceCount,
      currentExpenses: curExp,
      previousExpenses: prevExp,
      currentCommissions: curComm,
      currentEBITDA: curRev.revenue - curComm - curExp,
      previousEBITDA: prevRev.revenue - prevComm - prevExp,
      totalPlacements: totalPlacements || 0,
      totalCandidates: totalCandidates || 0,
      month: new Date().getMonth() + 1,
    };

    // Generate commentary via AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are QUIN, The Quantum Club's AI financial analyst. Write a concise quarterly investor narrative (3-4 paragraphs) based on the financial data provided. 
            
Style guidelines:
- Professional, discreet, executive tone. No exclamation points.
- Lead with the headline number (revenue, growth rate)
- Comment on trends: revenue growth, client diversification, operational efficiency
- Note EBITDA margin and what it implies for the business model
- End with a forward-looking statement about trajectory
- Use exact numbers from the data, formatted as €XXK or €X.XM
- Keep it under 250 words
- Do not fabricate any data not provided`,
          },
          {
            role: "user",
            content: `Generate the ${currentQuarter} ${currentYear} financial narrative for The Quantum Club:\n\n${JSON.stringify(financialData, null, 2)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limited — please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const narrative = aiData.choices?.[0]?.message?.content || "Unable to generate narrative.";

    // Get auth user from request
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Store commentary
    const { error: insertError } = await supabase.from("financial_commentaries").insert({
      quarter: currentQuarter,
      year: currentYear,
      narrative,
      financial_data: financialData,
      generated_by: userId,
    });

    if (insertError) {
      console.error("Failed to store commentary:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, data: { narrative, quarter: currentQuarter, year: currentYear } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Commentary generation error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
