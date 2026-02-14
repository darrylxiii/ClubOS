import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportToCSV } from '@/utils/analyticsExport';

interface ExportableData {
  label: string;
  getData: () => Promise<Record<string, unknown>[]> | Record<string, unknown>[];
  filename: string;
}

interface FinancialExportMenuProps {
  datasets: ExportableData[];
  /** Optional: structured P&L summary for PDF */
  plSummary?: {
    netRevenue: number;
    grossRevenue: number;
    vatCollected: number;
    totalCommissions: number;
    totalPayouts: number;
    totalSubscriptionCosts: number;
    totalOtherExpenses: number;
    grossMargin: number;
    netProfit: number;
    grossMarginPercent: number;
    netMarginPercent: number;
  };
  year?: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export function FinancialExportMenu({ datasets, plSummary, year }: FinancialExportMenuProps) {
  const [exporting, setExporting] = useState(false);

  const handleCSV = async (ds: ExportableData) => {
    setExporting(true);
    try {
      const rows = await ds.getData();
      if (!rows || rows.length === 0) {
        toast.info('No data to export');
        return;
      }
      exportToCSV(rows as any[], ds.filename);
      toast.success(`Exported ${ds.label} as CSV`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePLPdf = () => {
    if (!plSummary) return;
    const doc = new jsPDF();
    const y = year || new Date().getFullYear();

    doc.setFontSize(18);
    doc.text('The Quantum Club', 14, 20);
    doc.setFontSize(12);
    doc.text(`Profit & Loss Statement — ${y} YTD`, 14, 30);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString('nl-NL')}`, 14, 36);

    const rows = [
      ['Gross Revenue (incl. VAT)', fmt(plSummary.grossRevenue)],
      ['VAT Collected', fmt(plSummary.vatCollected)],
      ['Net Revenue (excl. VAT)', fmt(plSummary.netRevenue)],
      ['', ''],
      ['Recruiter Commissions', `-${fmt(plSummary.totalCommissions)}`],
      ['Referral Payouts', `-${fmt(plSummary.totalPayouts)}`],
      ['Gross Margin', fmt(plSummary.grossMargin)],
      ['  Gross Margin %', `${plSummary.grossMarginPercent.toFixed(1)}%`],
      ['', ''],
      ['SaaS & Subscriptions', `-${fmt(plSummary.totalSubscriptionCosts)}`],
      ['Other Operating Expenses', `-${fmt(plSummary.totalOtherExpenses)}`],
      ['', ''],
      ['Net Profit', fmt(plSummary.netProfit)],
      ['  Net Margin %', `${plSummary.netMarginPercent.toFixed(1)}%`],
    ];

    autoTable(doc, {
      startY: 42,
      head: [['Item', 'Amount']],
      body: rows,
      theme: 'plain',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [14, 14, 16], textColor: [245, 244, 239] },
      didParseCell: (data) => {
        // Bold the summary rows
        const text = String(data.cell.raw);
        if (['Gross Margin', 'Net Profit', 'Net Revenue (excl. VAT)'].includes(text)) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    doc.save(`PnL-${y}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('P&L exported as PDF');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {plSummary && (
          <>
            <DropdownMenuItem onClick={handlePLPdf}>
              <FileText className="h-4 w-4 mr-2" />
              P&L Statement (PDF)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {datasets.map((ds) => (
          <DropdownMenuItem key={ds.filename} onClick={() => handleCSV(ds)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {ds.label} (CSV)
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
