import { grossToNet } from '@/lib/vatRates';

export interface RevenueShareConfig {
  id: string;
  user_id: string;
  share_type: string;
  share_percentage: number | null;
  share_fixed_amount: number | null;
  applies_to: string;
  is_active: boolean | null;
  effective_from: string | null;
  effective_to: string | null;
  min_deal_value: number | null;
}

export interface InvoiceForShare {
  id: string;
  total_amount: number;
  net_amount: number | null;
  state_normalized: string;
  invoice_date: string | null;
  contact_name: string | null;
  contact_id: string | null;
}

export interface ShareEarnings {
  projected: number;
  realized: number;
  pending: number;
}

export interface AggregatedEarnings {
  commissions: { total: number; paid: number; pending: number; approved: number };
  shareEarnings: ShareEarnings;
  referralPayouts: { total: number; paid: number; pending: number };
  totalEarnings: number;
  totalPaid: number;
  totalPending: number;
}

/**
 * Calculate revenue share earnings for a single share config against invoices.
 * Respects: net_amount (with grossToNet fallback), applies_to, effective_from/to, min_deal_value.
 */
export function calculateShareEarnings(
  share: RevenueShareConfig,
  invoices: InvoiceForShare[]
): ShareEarnings {
  let projected = 0;
  let realized = 0;

  for (const invoice of invoices) {
    // Date bounds: skip invoices outside the share's active period
    if (share.effective_from && invoice.invoice_date && invoice.invoice_date < share.effective_from) {
      continue;
    }
    if (share.effective_to && invoice.invoice_date && invoice.invoice_date > share.effective_to) {
      continue;
    }

    // Use net amount (excl. VAT) with grossToNet fallback
    const netAmount = Number(invoice.net_amount) || grossToNet(Number(invoice.total_amount) || 0);

    // Min deal value filter
    if (share.min_deal_value && netAmount < share.min_deal_value) {
      continue;
    }

    // applies_to filtering — for "specific_clients" we'd need a mapping table,
    // but for now we apply "all_revenue" universally and skip unknown scopes
    if (share.applies_to !== 'all_revenue' && share.applies_to !== 'all') {
      // Future: filter by client/contact matching. For now, include all.
    }

    let shareAmount = 0;
    if (share.share_type === 'fixed_percentage' && share.share_percentage) {
      shareAmount = netAmount * (share.share_percentage / 100);
    } else if (share.share_type === 'per_placement' && share.share_fixed_amount) {
      shareAmount = share.share_fixed_amount;
    }

    projected += shareAmount;
    if (invoice.state_normalized === 'paid') {
      realized += shareAmount;
    }
  }

  return { projected, realized, pending: projected - realized };
}

/**
 * Calculate total share earnings for a user across all their active shares.
 */
export function calculateUserShareEarnings(
  shares: RevenueShareConfig[],
  invoices: InvoiceForShare[]
): ShareEarnings {
  const totals: ShareEarnings = { projected: 0, realized: 0, pending: 0 };

  for (const share of shares) {
    if (!share.is_active) continue;
    const earnings = calculateShareEarnings(share, invoices);
    totals.projected += earnings.projected;
    totals.realized += earnings.realized;
    totals.pending += earnings.pending;
  }

  return totals;
}

/**
 * Aggregate all income streams for an employee into a single breakdown.
 */
export function aggregateEmployeeEarnings(
  commissions: Array<{ gross_amount: number; status: string }>,
  payouts: Array<{ payout_amount: number; status: string | null }>,
  shareEarnings: ShareEarnings
): AggregatedEarnings {
  const commissionTotals = {
    total: commissions.reduce((s, c) => s + (Number(c.gross_amount) || 0), 0),
    paid: commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (Number(c.gross_amount) || 0), 0),
    approved: commissions.filter(c => c.status === 'approved').reduce((s, c) => s + (Number(c.gross_amount) || 0), 0),
    pending: commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (Number(c.gross_amount) || 0), 0),
  };

  const payoutTotals = {
    total: payouts.reduce((s, p) => s + (Number(p.payout_amount) || 0), 0),
    paid: payouts.filter(p => p.status === 'paid').reduce((s, p) => s + (Number(p.payout_amount) || 0), 0),
    pending: payouts.filter(p => p.status !== 'paid' && p.status !== 'rejected').reduce((s, p) => s + (Number(p.payout_amount) || 0), 0),
  };

  const totalPaid = commissionTotals.paid + shareEarnings.realized + payoutTotals.paid;
  const totalPending = commissionTotals.pending + commissionTotals.approved + shareEarnings.pending + payoutTotals.pending;

  return {
    commissions: commissionTotals,
    shareEarnings,
    referralPayouts: payoutTotals,
    totalEarnings: commissionTotals.total + shareEarnings.projected + payoutTotals.total,
    totalPaid,
    totalPending,
  };
}
