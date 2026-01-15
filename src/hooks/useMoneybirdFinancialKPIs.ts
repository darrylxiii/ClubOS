import { useMoneybirdFinancials, usePaymentAging } from "./useMoneybirdFinancials";
import { useInvoiceStatusCounts } from "./useMoneybirdInvoices";

export interface FinancialKPI {
  id: string;
  name: string;
  displayName: string;
  value: number;
  previousValue?: number;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  status: 'success' | 'warning' | 'critical' | 'neutral';
  format: 'currency' | 'number' | 'percent' | 'days';
  unit?: string;
  lowerIsBetter?: boolean;
  category: string;
}

export function useMoneybirdFinancialKPIs(year?: number) {
  const { data: metrics, isLoading: metricsLoading } = useMoneybirdFinancials(year);
  const statusCounts = useInvoiceStatusCounts(year);
  const paymentAging = usePaymentAging(year);

  const kpis: FinancialKPI[] = [];

  if (metrics) {
    // YTD Revenue (excluding drafts)
    kpis.push({
      id: 'ytd_revenue',
      name: 'ytd_revenue',
      displayName: 'YTD Revenue',
      value: metrics.total_revenue,
      status: metrics.total_revenue > 0 ? 'success' : 'neutral',
      format: 'currency',
      unit: '€',
      category: 'revenue',
    });

    // Total Paid
    kpis.push({
      id: 'total_paid',
      name: 'total_paid',
      displayName: 'Total Collected',
      value: metrics.total_paid,
      status: metrics.total_paid > 0 ? 'success' : 'neutral',
      format: 'currency',
      unit: '€',
      category: 'revenue',
    });

    // Outstanding AR
    kpis.push({
      id: 'total_outstanding',
      name: 'total_outstanding',
      displayName: 'Outstanding AR',
      value: metrics.total_outstanding,
      warningThreshold: 50000,
      criticalThreshold: 100000,
      status: metrics.total_outstanding > 100000 ? 'critical' : 
              metrics.total_outstanding > 50000 ? 'warning' : 'success',
      format: 'currency',
      unit: '€',
      lowerIsBetter: true,
      category: 'revenue',
    });

    // Collection Rate
    const collectionRate = metrics.total_revenue > 0 
      ? (metrics.total_paid / metrics.total_revenue) * 100 
      : 0;
    kpis.push({
      id: 'collection_rate',
      name: 'collection_rate',
      displayName: 'Collection Rate',
      value: Math.round(collectionRate * 10) / 10,
      targetValue: 80,
      warningThreshold: 60,
      criticalThreshold: 40,
      status: collectionRate >= 80 ? 'success' : collectionRate >= 60 ? 'warning' : 'critical',
      format: 'percent',
      unit: '%',
      category: 'efficiency',
    });

    // Invoice Counts
    kpis.push({
      id: 'invoices_paid',
      name: 'invoices_paid',
      displayName: 'Paid Invoices',
      value: metrics.invoice_count_paid,
      status: 'success',
      format: 'number',
      category: 'invoices',
    });

    kpis.push({
      id: 'invoices_open',
      name: 'invoices_open',
      displayName: 'Open Invoices',
      value: metrics.invoice_count_open,
      warningThreshold: 10,
      criticalThreshold: 20,
      status: metrics.invoice_count_open > 20 ? 'warning' : 'neutral',
      format: 'number',
      category: 'invoices',
    });

    kpis.push({
      id: 'invoices_late',
      name: 'invoices_late',
      displayName: 'Overdue Invoices',
      value: metrics.invoice_count_late,
      warningThreshold: 3,
      criticalThreshold: 5,
      status: metrics.invoice_count_late >= 5 ? 'critical' : 
              metrics.invoice_count_late >= 3 ? 'warning' : 'success',
      format: 'number',
      lowerIsBetter: true,
      category: 'invoices',
    });

    // Draft Pipeline
    const draftCount = statusCounts['draft']?.count || 0;
    const draftAmount = statusCounts['draft']?.amount || 0;
    kpis.push({
      id: 'draft_pipeline',
      name: 'draft_pipeline',
      displayName: 'Draft Pipeline',
      value: draftAmount,
      status: 'neutral',
      format: 'currency',
      unit: '€',
      category: 'pipeline',
    });

    // Payment Aging - Overdue
    const totalOverdue = paymentAging.overdue_30 + paymentAging.overdue_60 + 
                         paymentAging.overdue_90 + paymentAging.overdue_90_plus;
    kpis.push({
      id: 'ar_overdue',
      name: 'ar_overdue',
      displayName: 'AR Overdue (>30d)',
      value: totalOverdue,
      warningThreshold: 20000,
      criticalThreshold: 50000,
      status: totalOverdue > 50000 ? 'critical' : totalOverdue > 20000 ? 'warning' : 'success',
      format: 'currency',
      unit: '€',
      lowerIsBetter: true,
      category: 'aging',
    });

    // Critical AR (90+ days)
    kpis.push({
      id: 'ar_critical',
      name: 'ar_critical',
      displayName: 'AR Critical (90+ days)',
      value: paymentAging.overdue_90_plus,
      warningThreshold: 5000,
      criticalThreshold: 15000,
      status: paymentAging.overdue_90_plus > 15000 ? 'critical' : 
              paymentAging.overdue_90_plus > 5000 ? 'warning' : 'success',
      format: 'currency',
      unit: '€',
      lowerIsBetter: true,
      category: 'aging',
    });
  }

  return {
    kpis,
    isLoading: metricsLoading,
    metrics,
    statusCounts,
    paymentAging,
  };
}
