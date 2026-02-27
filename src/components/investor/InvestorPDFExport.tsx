import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { grossToNet } from '@/lib/vatRates';
import { useAuth } from '@/contexts/AuthContext';

export function InvestorPDFExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();

  const { data: reportData } = useQuery({
    queryKey: ['investor-pdf-data'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 2, currentYear - 1, currentYear];
      const yearData: Record<number, {
        revenue: number; commissions: number; payouts: number; opex: number; clients: number;
      }> = {};

      for (const yr of years) {
        const { data: invs } = await supabase
          .from('moneybird_sales_invoices')
          .select('total_amount, net_amount, contact_id')
          .gte('invoice_date', `${yr}-01-01`)
          .lt('invoice_date', `${yr + 1}-01-01`);

        const revenue = (invs || []).reduce((s, i) =>
          s + (Number(i.net_amount) || grossToNet(Number(i.total_amount) || 0)), 0);
        const clients = new Set((invs || []).map((i) => i.contact_id).filter(Boolean)).size;

        const { data: comms } = await supabase
          .from('employee_commissions')
          .select('gross_amount')
          .gte('created_at', `${yr}-01-01`)
          .lt('created_at', `${yr + 1}-01-01`);
        const commissions = (comms || []).reduce((s, c) => s + (c.gross_amount || 0), 0);

        const { data: pays } = await supabase
          .from('referral_payouts')
          .select('payout_amount')
          .gte('created_at', `${yr}-01-01`)
          .lt('created_at', `${yr + 1}-01-01`);
        const payouts = (pays || []).reduce((s, p) => s + (p.payout_amount || 0), 0);

        const { data: exps } = await supabase
          .from('operating_expenses')
          .select('amount, amount_eur')
          .gte('expense_date', `${yr}-01-01`)
          .lt('expense_date', `${yr + 1}-01-01`);
        const opex = (exps || []).reduce((s, e) => s + (Number(e.amount_eur ?? e.amount) || 0), 0);

        yearData[yr] = { revenue, commissions, payouts, opex, clients };
      }

      // Platform metrics
      const { count: totalCandidates } = await supabase
        .from('candidate_profiles')
        .select('id', { count: 'exact', head: true });

      const { count: totalPlacements } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'hired');

      const { count: totalCompanies } = await supabase
        .from('companies')
        .select('id', { count: 'exact', head: true });

      return { yearData, years, totalCandidates, totalPlacements, totalCompanies };
    },
    staleTime: 10 * 60 * 1000,
  });

  const generatePDF = () => {
    if (!reportData) {
      toast.error('Report data not loaded yet');
      return;
    }

    setIsExporting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const now = new Date();
      const viewerEmail = user?.email || 'authorized viewer';

      // Watermark function
      const addWatermark = () => {
        doc.setTextColor(230, 230, 230);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        const wmText = `CONFIDENTIAL · ${viewerEmail} · ${format(now, 'dd MMM yyyy HH:mm')}`;
        doc.text(wmText, pageWidth / 2, pageHeight - 8, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      };

      // ─── Cover Page ───
      doc.setFillColor(14, 14, 16); // bg-eclipse
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setTextColor(201, 162, 78); // accent-gold
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('THE QUANTUM CLUB', pageWidth / 2, 80, { align: 'center' });

      doc.setFontSize(14);
      doc.setTextColor(245, 244, 239); // text-ivory
      doc.text('Confidential Investor Report', pageWidth / 2, 95, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      doc.text(`Prepared: ${format(now, 'MMMM d, yyyy')}`, pageWidth / 2, 115, { align: 'center' });
      doc.text(`For: ${viewerEmail}`, pageWidth / 2, 122, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'This document is strictly confidential and intended solely for the named recipient.',
        pageWidth / 2, 200, { align: 'center' }
      );

      // ─── Page 2: Executive Summary ───
      doc.addPage();
      doc.setTextColor(0, 0, 0);
      addWatermark();

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', margin, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const currentYr = reportData.years[2];
      const curData = reportData.yearData[currentYr];
      const prevData = reportData.yearData[reportData.years[1]];
      const growthRate = prevData.revenue > 0
        ? ((curData.revenue / prevData.revenue - 1) * 100).toFixed(0)
        : 'N/A';

      const summaryLines = [
        `The Quantum Club is a premium talent marketplace connecting exceptional professionals`,
        `with leading organizations through AI-powered matching and white-glove service.`,
        ``,
        `• YTD Net Revenue: €${(curData.revenue / 1000).toFixed(0)}K (${growthRate}% YoY growth)`,
        `• Active Client Relationships: ${curData.clients}`,
        `• Platform Candidates: ${(reportData.totalCandidates || 0).toLocaleString()}`,
        `• Successful Placements: ${reportData.totalPlacements || 0}`,
        `• Partner Companies: ${reportData.totalCompanies || 0}`,
      ];
      let yPos = 40;
      summaryLines.forEach((line) => {
        doc.text(line, margin, yPos);
        yPos += 6;
      });

      // ─── Page 3: Multi-Year P&L ───
      doc.addPage();
      addWatermark();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Multi-Year Financial Summary', margin, 25);

      const fmtK = (v: number) => `€${(v / 1000).toFixed(1)}K`;
      const years = reportData.years;
      const tableRows = years.map((yr) => {
        const d = reportData.yearData[yr];
        const cogs = d.commissions + d.payouts;
        const gm = d.revenue - cogs;
        const ebitda = gm - d.opex;
        return [
          yr.toString(),
          fmtK(d.revenue),
          fmtK(cogs),
          fmtK(gm),
          d.revenue > 0 ? `${((gm / d.revenue) * 100).toFixed(1)}%` : '—',
          fmtK(d.opex),
          fmtK(ebitda),
          d.revenue > 0 ? `${((ebitda / d.revenue) * 100).toFixed(1)}%` : '—',
        ];
      });

      autoTable(doc, {
        startY: 35,
        head: [['Year', 'Revenue', 'COGS', 'Gross Profit', 'GM%', 'OpEx', 'EBITDA', 'EBITDA%']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [14, 14, 16], textColor: [201, 162, 78], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        styles: { cellPadding: 3 },
      });

      // YoY growth row
      if (years.length >= 2) {
        const growths = years.slice(1).map((yr, i) => {
          const cur = reportData.yearData[yr].revenue;
          const prev = reportData.yearData[years[i]].revenue;
          return prev > 0 ? `${((cur / prev - 1) * 100).toFixed(0)}%` : '—';
        });

        let growthY = (doc as any).lastAutoTable?.finalY + 10 || 90;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Year-over-Year Revenue Growth:', margin, growthY);
        doc.setFont('helvetica', 'normal');
        growths.forEach((g, i) => {
          doc.text(`${years[i]} → ${years[i + 1]}: ${g}`, margin + 5, growthY + 7 + i * 6);
        });
      }

      // ─── Footer on all pages ───
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`The Quantum Club · Confidential · Page ${i}/${totalPages}`, pageWidth / 2, pageHeight - 3, { align: 'center' });
      }

      doc.save(`TQC_Investor_Report_${format(now, 'yyyy-MM-dd')}.pdf`);
      toast.success('Branded investor PDF exported');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={generatePDF} disabled={isExporting || !reportData} variant="outline">
      {isExporting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <FileText className="w-4 h-4 mr-2" />
      )}
      Export Investor PDF
    </Button>
  );
}
