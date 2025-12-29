import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InvestorReportExportProps {
  metrics: any;
  historicalData: any[] | undefined;
}

export function InvestorReportExport({ metrics, historicalData }: InvestorReportExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const exportToCSV = () => {
    if (!historicalData || historicalData.length === 0) {
      toast.error("No data available to export");
      return;
    }

    setIsExporting(true);
    try {
      const headers = [
        'Date',
        'MRR (€)',
        'ARR (€)',
        'New MRR (€)',
        'Expansion MRR (€)',
        'Contraction MRR (€)',
        'Churn MRR (€)',
        'Active Subscriptions',
        'Churn Rate (%)',
        'NRR (%)',
        'ARPU (€)',
        'LTV (€)',
      ];

      const rows = historicalData.map(row => [
        row.metric_date,
        (row.mrr / 100).toFixed(2),
        (row.arr / 100).toFixed(2),
        (row.new_mrr / 100).toFixed(2),
        (row.expansion_mrr / 100).toFixed(2),
        (row.contraction_mrr / 100).toFixed(2),
        (row.churn_mrr / 100).toFixed(2),
        row.active_subscriptions,
        row.churn_rate?.toFixed(2) || '0',
        row.net_revenue_retention?.toFixed(2) || '100',
        (row.average_revenue_per_user / 100).toFixed(2),
        (row.customer_lifetime_value / 100).toFixed(2),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `TQC_Revenue_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();

      toast.success("CSV report exported successfully");
    } catch (error) {
      toast.error("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    if (!metrics) {
      toast.error("No data available to export");
      return;
    }

    setIsExporting(true);
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        company: "The Quantum Club",
        period: format(new Date(), 'MMMM yyyy'),
        summary: {
          arr: formatCurrency(metrics.arr || 0),
          mrr: formatCurrency(metrics.mrr || 0),
          activeCustomers: metrics.active_subscriptions || 0,
          churnRate: `${(metrics.churn_rate || 0).toFixed(2)}%`,
          netRevenueRetention: `${(metrics.net_revenue_retention || 100).toFixed(0)}%`,
          arpu: formatCurrency(metrics.average_revenue_per_user || 0),
          ltv: formatCurrency(metrics.customer_lifetime_value || 0),
        },
        mrrMovement: {
          newMRR: formatCurrency(metrics.new_mrr || 0),
          expansionMRR: formatCurrency(metrics.expansion_mrr || 0),
          contractionMRR: formatCurrency(metrics.contraction_mrr || 0),
          churnedMRR: formatCurrency(metrics.churn_mrr || 0),
          netChange: formatCurrency(
            (metrics.new_mrr || 0) + 
            (metrics.expansion_mrr || 0) - 
            (metrics.contraction_mrr || 0) - 
            (metrics.churn_mrr || 0)
          ),
        },
        historicalData: historicalData?.map(row => ({
          date: row.metric_date,
          mrr: row.mrr / 100,
          arr: row.arr / 100,
          activeSubscriptions: row.active_subscriptions,
          churnRate: row.churn_rate,
        })) || [],
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `TQC_Investor_Report_${format(new Date(), 'yyyy-MM-dd')}.json`;
      link.click();

      toast.success("JSON report exported successfully");
    } catch (error) {
      toast.error("Failed to export JSON");
    } finally {
      setIsExporting(false);
    }
  };

  const generateExecutiveSummary = () => {
    if (!metrics) {
      toast.error("No data available");
      return;
    }

    setIsExporting(true);
    try {
      const ltvCac = metrics.customer_lifetime_value && metrics.average_revenue_per_user 
        ? (metrics.customer_lifetime_value / (metrics.average_revenue_per_user * 3)).toFixed(1)
        : 'N/A';

      const summary = `
THE QUANTUM CLUB - INVESTOR EXECUTIVE SUMMARY
Generated: ${format(new Date(), 'MMMM d, yyyy')}

═══════════════════════════════════════════════════════

KEY METRICS

Annual Recurring Revenue (ARR): ${formatCurrency(metrics.arr || 0)}
Monthly Recurring Revenue (MRR): ${formatCurrency(metrics.mrr || 0)}
Active Customers: ${metrics.active_subscriptions || 0}

═══════════════════════════════════════════════════════

UNIT ECONOMICS

LTV/CAC Ratio: ${ltvCac}x
Customer Lifetime Value: ${formatCurrency(metrics.customer_lifetime_value || 0)}
Average Revenue Per User: ${formatCurrency(metrics.average_revenue_per_user || 0)}/month

═══════════════════════════════════════════════════════

RETENTION & GROWTH

Net Revenue Retention: ${(metrics.net_revenue_retention || 100).toFixed(0)}%
Monthly Churn Rate: ${(metrics.churn_rate || 0).toFixed(2)}%

MRR Movement:
  + New MRR: ${formatCurrency(metrics.new_mrr || 0)}
  + Expansion: ${formatCurrency(metrics.expansion_mrr || 0)}
  - Contraction: ${formatCurrency(metrics.contraction_mrr || 0)}
  - Churn: ${formatCurrency(metrics.churn_mrr || 0)}
  ─────────────────
  = Net Change: ${formatCurrency(
    (metrics.new_mrr || 0) + (metrics.expansion_mrr || 0) - 
    (metrics.contraction_mrr || 0) - (metrics.churn_mrr || 0)
  )}

═══════════════════════════════════════════════════════

PLATFORM OVERVIEW

The Quantum Club is a premium talent marketplace connecting 
exceptional professionals with leading organizations. Our 
AI-powered matching and white-glove service differentiates 
us from traditional recruiting platforms.

═══════════════════════════════════════════════════════

For questions, contact: investors@thequantumclub.com
      `.trim();

      const blob = new Blob([summary], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `TQC_Executive_Summary_${format(new Date(), 'yyyy-MM-dd')}.txt`;
      link.click();

      toast.success("Executive summary generated");
    } catch (error) {
      toast.error("Failed to generate summary");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateExecutiveSummary}>
          <FileText className="w-4 h-4 mr-2" />
          Executive Summary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
