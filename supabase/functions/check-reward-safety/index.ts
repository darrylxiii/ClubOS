import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SafetyCheckRequest {
  proposalId?: string;
  estimatedCost: number;
}

interface SafetyCheckResult {
  approved: boolean;
  warnings: string[];
  errors: string[];
  financials: {
    currentCash: number;
    monthlyBurn: number;
    runwayMonths: number;
    rewardPercentage: number;
    postRewardCash: number;
    postRewardRunway: number;
  };
  rules: {
    minRunwayMonths: number;
    maxRewardPercentage: number;
    requireFinanceApprovalAbove: number;
    autoRejectIfRunwayBelow: number;
  };
  requiresFinanceApproval: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { estimatedCost, proposalId } = await req.json() as SafetyCheckRequest;

    if (!estimatedCost || estimatedCost <= 0) {
      throw new Error('Invalid estimated cost');
    }

    console.log(`🔒 Running CFO Safety Check for €${estimatedCost}...`);

    // 1. Get safety rules
    const { data: safetyRules, error: rulesError } = await supabase
      .from('reward_safety_rules')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (rulesError) {
      console.error('Error fetching safety rules:', rulesError);
    }

    const rules = safetyRules || {
      min_runway_months: 6,
      max_reward_percentage_of_cash: 15,
      require_finance_approval_above: 5000,
      auto_reject_if_runway_below: 3
    };

    // 2. Get current financial position from Moneybird metrics
    const { data: financialMetrics } = await supabase
      .from('moneybird_financial_metrics')
      .select('total_paid, total_outstanding')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get cash flow data for burn rate estimation
    const { data: recentExpenses } = await supabase
      .from('moneybird_invoices')
      .select('total_price_incl_tax')
      .eq('invoice_type', 'purchase')
      .gte('invoice_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    // Calculate monthly burn (last 3 months average)
    const totalExpenses = recentExpenses?.reduce((sum, inv) => 
      sum + (parseFloat(inv.total_price_incl_tax) || 0), 0) || 0;
    const monthlyBurn = totalExpenses / 3;

    // Estimate current cash (this would ideally come from a bank sync)
    // Using collected revenue minus expenses as proxy
    const currentCash = (financialMetrics?.total_paid || 0) * 0.3; // Simplified: assume 30% retained as cash
    
    // Calculate runway
    const runwayMonths = monthlyBurn > 0 ? currentCash / monthlyBurn : 99;
    
    // Calculate impact of reward
    const rewardPercentage = (estimatedCost / currentCash) * 100;
    const postRewardCash = currentCash - estimatedCost;
    const postRewardRunway = monthlyBurn > 0 ? postRewardCash / monthlyBurn : 99;

    console.log(`💰 Current Cash: €${currentCash.toFixed(2)}`);
    console.log(`🔥 Monthly Burn: €${monthlyBurn.toFixed(2)}`);
    console.log(`📅 Current Runway: ${runwayMonths.toFixed(1)} months`);
    console.log(`📊 Reward as % of Cash: ${rewardPercentage.toFixed(1)}%`);

    // 3. Evaluate safety rules
    const warnings: string[] = [];
    const errors: string[] = [];
    let approved = true;

    // Check auto-reject conditions
    if (postRewardRunway < rules.auto_reject_if_runway_below) {
      errors.push(`Reward would reduce runway below ${rules.auto_reject_if_runway_below} months (would be ${postRewardRunway.toFixed(1)} months)`);
      approved = false;
    }

    // Check reward percentage
    if (rewardPercentage > rules.max_reward_percentage_of_cash) {
      errors.push(`Reward exceeds ${rules.max_reward_percentage_of_cash}% of current cash (is ${rewardPercentage.toFixed(1)}%)`);
      approved = false;
    }

    // Check runway warning
    if (postRewardRunway < rules.min_runway_months) {
      warnings.push(`Reward would reduce runway below recommended ${rules.min_runway_months} months`);
    }

    // Check if finance approval required
    const requiresFinanceApproval = estimatedCost > rules.require_finance_approval_above;
    if (requiresFinanceApproval) {
      warnings.push(`Reward exceeds €${rules.require_finance_approval_above} - requires Finance approval`);
    }

    // Additional contextual warnings
    if (runwayMonths < rules.min_runway_months) {
      warnings.push(`Current runway (${runwayMonths.toFixed(1)} months) is already below recommended minimum`);
    }

    const result: SafetyCheckResult = {
      approved,
      warnings,
      errors,
      financials: {
        currentCash,
        monthlyBurn,
        runwayMonths,
        rewardPercentage,
        postRewardCash,
        postRewardRunway
      },
      rules: {
        minRunwayMonths: rules.min_runway_months,
        maxRewardPercentage: rules.max_reward_percentage_of_cash,
        requireFinanceApprovalAbove: rules.require_finance_approval_above,
        autoRejectIfRunwayBelow: rules.auto_reject_if_runway_below
      },
      requiresFinanceApproval
    };

    // Log the safety check
    if (proposalId) {
      await supabase
        .from('agent_events')
        .insert({
          event_type: 'reward.safety_check',
          event_source: 'cfo-safety-guard',
          entity_type: 'reward_proposal',
          entity_id: proposalId,
          event_data: {
            estimated_cost: estimatedCost,
            approved,
            warnings,
            errors,
            financials: result.financials
          },
          priority: approved ? 5 : 10
        });
    }

    console.log(`✅ Safety Check Complete: ${approved ? 'APPROVED' : 'BLOCKED'}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-reward-safety:', error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        approved: false,
        warnings: [],
        errors: [errorMessage]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
