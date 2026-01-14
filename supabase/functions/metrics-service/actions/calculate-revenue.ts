/**
 * Revenue calculation action handler
 * Handles revenue milestones, payment metrics, commissions
 */

import type { MetricsContext, ActionResult } from "../index.ts";

interface RevenuePayload {
  type?: "milestones" | "payments" | "commissions" | "referrals" | "all";
  period?: "month" | "quarter" | "year";
  user_id?: string;
  company_id?: string;
}

interface RevenueMetric {
  metric_name: string;
  value: number;
  currency: string;
  period: string;
  breakdown?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export async function calculateRevenueAction(ctx: MetricsContext): Promise<ActionResult> {
  const payload = ctx.payload as unknown as RevenuePayload;
  const type = payload.type || "all";
  
  try {
    const metrics: RevenueMetric[] = [];
    const now = new Date();
    
    // Calculate period boundaries
    const periodStart = getPeriodStart(payload.period || "month", now);
    const periodEnd = now.toISOString();

    if (type === "all" || type === "milestones") {
      const milestones = await calculateRevenueMilestones(ctx, periodStart, periodEnd);
      metrics.push(...milestones);
    }

    if (type === "all" || type === "payments") {
      const payments = await calculatePaymentMetrics(ctx, periodStart, periodEnd);
      metrics.push(...payments);
    }

    if (type === "all" || type === "commissions") {
      const commissions = await calculateCommissions(ctx, periodStart, periodEnd, payload.user_id);
      metrics.push(...commissions);
    }

    if (type === "all" || type === "referrals") {
      const referrals = await calculateReferralEarnings(ctx, periodStart, periodEnd);
      metrics.push(...referrals);
    }

    return {
      success: true,
      data: {
        metrics,
        period: { start: periodStart, end: periodEnd },
        calculated_at: now.toISOString(),
      },
    };

  } catch (error) {
    console.error("[calculate-revenue] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate revenue",
    };
  }
}

function getPeriodStart(period: string, now: Date): string {
  const start = new Date(now);
  switch (period) {
    case "month":
      start.setDate(1);
      break;
    case "quarter":
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      break;
    case "year":
      start.setMonth(0, 1);
      break;
  }
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

async function calculateRevenueMilestones(
  ctx: MetricsContext,
  startDate: string,
  endDate: string
): Promise<RevenueMetric[]> {
  const metrics: RevenueMetric[] = [];

  // Get placement fees
  const { data: placements } = await ctx.supabase
    .from("placement_fees")
    .select("fee_amount, status, paid_at")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  const totalRevenue = placements?.reduce((sum, p) => sum + (Number(p.fee_amount) || 0), 0) || 0;
  const paidRevenue = placements?.filter(p => p.status === "paid")
    .reduce((sum, p) => sum + (Number(p.fee_amount) || 0), 0) || 0;
  const pendingRevenue = totalRevenue - paidRevenue;

  metrics.push({
    metric_name: "total_revenue",
    value: totalRevenue,
    currency: "EUR",
    period: `${startDate.split("T")[0]} to ${endDate.split("T")[0]}`,
    breakdown: {
      paid: paidRevenue,
      pending: pendingRevenue,
    },
    metadata: { placement_count: placements?.length || 0 },
  });

  // Revenue by company
  const { data: byCompany } = await ctx.supabase
    .from("placement_fees")
    .select("company_id, fee_amount, companies(name)")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  const companyBreakdown: Record<string, number> = {};
  for (const fee of byCompany || []) {
    const companyName = (fee.companies as any)?.name || fee.company_id;
    companyBreakdown[companyName] = (companyBreakdown[companyName] || 0) + (Number(fee.fee_amount) || 0);
  }

  metrics.push({
    metric_name: "revenue_by_company",
    value: Object.values(companyBreakdown).reduce((a, b) => a + b, 0),
    currency: "EUR",
    period: `${startDate.split("T")[0]} to ${endDate.split("T")[0]}`,
    breakdown: companyBreakdown,
  });

  return metrics;
}

async function calculatePaymentMetrics(
  ctx: MetricsContext,
  startDate: string,
  endDate: string
): Promise<RevenueMetric[]> {
  const metrics: RevenueMetric[] = [];

  // Get invoice data from Moneybird sync
  const { data: invoices } = await ctx.supabase
    .from("moneybird_sales_invoices")
    .select("total_price_incl_tax_base, state, paid_at, due_date")
    .gte("invoice_date", startDate.split("T")[0])
    .lte("invoice_date", endDate.split("T")[0]);

  const totalInvoiced = invoices?.reduce((sum, i) => sum + (Number(i.total_price_incl_tax_base) || 0), 0) || 0;
  const paidInvoices = invoices?.filter(i => i.state === "paid") || [];
  const totalPaid = paidInvoices.reduce((sum, i) => sum + (Number(i.total_price_incl_tax_base) || 0), 0);
  const overdueInvoices = invoices?.filter(i => 
    i.state !== "paid" && i.due_date && new Date(i.due_date) < new Date()
  ) || [];
  const overdueAmount = overdueInvoices.reduce((sum, i) => sum + (Number(i.total_price_incl_tax_base) || 0), 0);

  metrics.push({
    metric_name: "invoiced_amount",
    value: totalInvoiced,
    currency: "EUR",
    period: `${startDate.split("T")[0]} to ${endDate.split("T")[0]}`,
    breakdown: {
      paid: totalPaid,
      outstanding: totalInvoiced - totalPaid,
      overdue: overdueAmount,
    },
    metadata: {
      invoice_count: invoices?.length || 0,
      paid_count: paidInvoices.length,
      overdue_count: overdueInvoices.length,
    },
  });

  // Calculate DSO (Days Sales Outstanding)
  let totalDaysToPay = 0;
  let paymentCount = 0;
  for (const invoice of paidInvoices) {
    if (invoice.paid_at && invoice.due_date) {
      const dueDate = new Date(invoice.due_date);
      const paidDate = new Date(invoice.paid_at);
      const daysDiff = (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);
      totalDaysToPay += daysDiff;
      paymentCount++;
    }
  }
  const avgDaysToPay = paymentCount > 0 ? totalDaysToPay / paymentCount : 0;

  metrics.push({
    metric_name: "days_sales_outstanding",
    value: Math.round(avgDaysToPay),
    currency: "EUR",
    period: `${startDate.split("T")[0]} to ${endDate.split("T")[0]}`,
    metadata: { sample_size: paymentCount },
  });

  return metrics;
}

async function calculateCommissions(
  ctx: MetricsContext,
  startDate: string,
  endDate: string,
  userId?: string
): Promise<RevenueMetric[]> {
  const metrics: RevenueMetric[] = [];

  // Get commissions
  let query = ctx.supabase
    .from("recruiter_commissions")
    .select("recruiter_id, amount, status, profiles(full_name)")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (userId) {
    query = query.eq("recruiter_id", userId);
  }

  const { data: commissions } = await query;

  const totalCommissions = commissions?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;
  const paidCommissions = commissions?.filter(c => c.status === "paid")
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;

  const recruiterBreakdown: Record<string, number> = {};
  for (const commission of commissions || []) {
    const name = (commission.profiles as any)?.full_name || commission.recruiter_id;
    recruiterBreakdown[name] = (recruiterBreakdown[name] || 0) + (Number(commission.amount) || 0);
  }

  metrics.push({
    metric_name: "recruiter_commissions",
    value: totalCommissions,
    currency: "EUR",
    period: `${startDate.split("T")[0]} to ${endDate.split("T")[0]}`,
    breakdown: {
      paid: paidCommissions,
      pending: totalCommissions - paidCommissions,
      by_recruiter: recruiterBreakdown,
    },
    metadata: { commission_count: commissions?.length || 0 },
  });

  return metrics;
}

async function calculateReferralEarnings(
  ctx: MetricsContext,
  startDate: string,
  endDate: string
): Promise<RevenueMetric[]> {
  const metrics: RevenueMetric[] = [];

  // Get referral payouts
  const { data: referrals } = await ctx.supabase
    .from("referral_payouts")
    .select("referrer_id, amount, status, payout_type")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  const totalReferrals = referrals?.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;
  const paidReferrals = referrals?.filter(r => r.status === "paid")
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0) || 0;

  const typeBreakdown: Record<string, number> = {};
  for (const referral of referrals || []) {
    const type = referral.payout_type || "standard";
    typeBreakdown[type] = (typeBreakdown[type] || 0) + (Number(referral.amount) || 0);
  }

  metrics.push({
    metric_name: "referral_earnings",
    value: totalReferrals,
    currency: "EUR",
    period: `${startDate.split("T")[0]} to ${endDate.split("T")[0]}`,
    breakdown: {
      paid: paidReferrals,
      pending: totalReferrals - paidReferrals,
      by_type: typeBreakdown,
    },
    metadata: { referral_count: referrals?.length || 0 },
  });

  return metrics;
}
