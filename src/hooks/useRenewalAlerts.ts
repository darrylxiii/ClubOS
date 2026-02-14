import { useMemo } from 'react';
import { useVendorSubscriptions } from './useVendorSubscriptions';
import { useSubscriptionBudgets } from './useSubscriptionBudgets';
import { useSubscriptionMetrics } from './useVendorSubscriptions';

export interface RenewalAlert {
  id: string;
  type: 'renewal' | 'budget' | 'underutilized';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  actionLabel?: string;
  relatedId?: string;
}

/**
 * Aggregates financial alerts:
 * - Contract renewals within cancellation_notice_days
 * - Budget categories exceeding 90%
 * - Underutilized subscriptions (<50% seat usage)
 */
export function useFinancialAlerts() {
  const { data: subscriptions } = useVendorSubscriptions('active');
  const { data: budgets } = useSubscriptionBudgets();
  const metrics = useSubscriptionMetrics();

  const alerts = useMemo(() => {
    const result: RenewalAlert[] = [];
    const now = new Date();

    // 1. Renewal alerts — flag when within cancellation_notice_days
    subscriptions?.forEach((sub) => {
      if (!sub.next_renewal_date) return;
      const renewalDate = new Date(sub.next_renewal_date);
      const noticeDays = sub.cancellation_notice_days || 30;
      const noticeDeadline = new Date(renewalDate);
      noticeDeadline.setDate(noticeDeadline.getDate() - noticeDays);

      if (now >= noticeDeadline && now <= renewalDate) {
        const daysUntilRenewal = Math.ceil(
          (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysUntilNoticeExpires = Math.ceil(
          (noticeDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const isPastNotice = daysUntilNoticeExpires <= 0;

        result.push({
          id: `renewal-${sub.id}`,
          type: 'renewal',
          severity: isPastNotice ? 'critical' : daysUntilRenewal <= 14 ? 'warning' : 'info',
          title: `${sub.vendor_name} renews in ${daysUntilRenewal} days`,
          description: isPastNotice
            ? `Cancellation notice period has passed. Auto-renews on ${renewalDate.toLocaleDateString()}.`
            : `${noticeDays}-day notice required. Deadline: ${noticeDeadline.toLocaleDateString()}.`,
          actionLabel: 'Review',
          relatedId: sub.id,
        });
      }
    });

    // 2. Budget alerts — categories at or above 90%
    budgets?.forEach((budget) => {
      const actualSpend = metrics.byCategory[budget.category]?.mrc || 0;
      const percent = budget.budget_amount > 0 ? (actualSpend / budget.budget_amount) * 100 : 0;

      if (percent >= 100) {
        result.push({
          id: `budget-over-${budget.id}`,
          type: 'budget',
          severity: 'critical',
          title: `${budget.category} over budget`,
          description: `Spending €${actualSpend.toFixed(0)}/mo against €${budget.budget_amount.toFixed(0)} budget (${percent.toFixed(0)}%).`,
        });
      } else if (percent >= 90) {
        result.push({
          id: `budget-warn-${budget.id}`,
          type: 'budget',
          severity: 'warning',
          title: `${budget.category} nearing budget limit`,
          description: `At ${percent.toFixed(0)}% of monthly budget (€${actualSpend.toFixed(0)} / €${budget.budget_amount.toFixed(0)}).`,
        });
      }
    });

    // 3. Underutilized subscriptions
    subscriptions?.forEach((sub) => {
      if (sub.seats_licensed && sub.seats_used) {
        const util = (sub.seats_used / sub.seats_licensed) * 100;
        if (util < 50) {
          result.push({
            id: `underutil-${sub.id}`,
            type: 'underutilized',
            severity: 'warning',
            title: `${sub.vendor_name} underutilized`,
            description: `Only ${sub.seats_used}/${sub.seats_licensed} seats in use (${util.toFixed(0)}%). Consider downgrading.`,
            actionLabel: 'Review',
            relatedId: sub.id,
          });
        }
      }
    });

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 };
    result.sort((a, b) => order[a.severity] - order[b.severity]);

    return result;
  }, [subscriptions, budgets, metrics]);

  return alerts;
}
