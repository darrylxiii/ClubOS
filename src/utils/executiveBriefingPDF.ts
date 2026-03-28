import type { BriefingSectionId } from '@/components/partner/briefing/BriefingSectionSelector';
import type { PartnerBriefingData } from '@/hooks/usePartnerBriefingData';

// ── Helpers ────────────────────────────────────────────────────────
function fmt(val: number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined) return 'N/A';
  return `${val}${suffix}`;
}

function fmtPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'N/A';
  return `${Math.round(val)}%`;
}

// Brand colours
const BRAND_PRIMARY = [30, 64, 175]; // blue-700
const HEADER_BG = [241, 245, 249]; // slate-100
const TEXT_DARK = [15, 23, 42]; // slate-900
const TEXT_MUTED = [100, 116, 139]; // slate-500

// ── Public API ─────────────────────────────────────────────────────

/**
 * Generates a professional PDF of the executive hiring briefing.
 * Uses dynamic imports so jspdf is only loaded when the user clicks "Generate PDF".
 */
export async function generateExecutiveBriefingPDF(
  data: PartnerBriefingData,
  selectedSections: Set<BriefingSectionId>,
): Promise<Blob> {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default ?? jsPDFModule.jsPDF;
  await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Header ─────────────────────────────────────────────────────
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 0, pageWidth, 72, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Hiring Briefing', margin, 35);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Prepared ${dateStr}  |  ClubOS Partner Intelligence`, margin, 55);

  y = 92;

  // ── Helper: section title ──────────────────────────────────────
  const sectionTitle = (title: string) => {
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }
    doc.setFillColor(...HEADER_BG);
    doc.roundedRect(margin, y, contentWidth, 28, 3, 3, 'F');
    doc.setTextColor(...TEXT_DARK);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 10, y + 18);
    y += 38;
  };

  // ── Helper: metric row ─────────────────────────────────────────
  const metricRow = (label: string, value: string) => {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(label, margin + 8, y);
    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, pageWidth - margin - 8, y, { align: 'right' });
    y += 18;
  };

  const { currentMetrics: m, quarterlyTrends, pipelineSummary, openRoles } = data;

  // ── 1. Hiring Progress ─────────────────────────────────────────
  if (selectedSections.has('hiring-progress')) {
    sectionTitle('Hiring Progress');
    metricRow('Total Applications', String(m.totalApplications));
    metricRow('Total Hires', String(m.totalHires));
    metricRow('Active Jobs', String(m.activeJobs));
    y += 8;
  }

  // ── 2. Time & Cost Metrics ─────────────────────────────────────
  if (selectedSections.has('time-cost')) {
    sectionTitle('Time & Cost Metrics');
    metricRow('Average Time to Hire', fmt(m.avgTimeToHire, ' days'));
    metricRow('Offer Acceptance Rate', fmtPct(m.offerAcceptanceRate));
    y += 8;
  }

  // ── 3. Pipeline Health ─────────────────────────────────────────
  if (selectedSections.has('pipeline-health')) {
    sectionTitle('Pipeline Health');
    if (pipelineSummary.length > 0) {
      (doc as any).autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Stage', 'Count']],
        body: pipelineSummary.map((s) => [
          s.stage.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          String(s.count),
        ]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: {
          fillColor: BRAND_PRIMARY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 16;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_MUTED);
      doc.text('No pipeline data available.', margin + 8, y);
      y += 20;
    }
  }

  // ── 4. Benchmarks ──────────────────────────────────────────────
  if (selectedSections.has('benchmarks')) {
    sectionTitle('Benchmarks vs Network');
    metricRow('Network Avg Time-to-Fill', fmt(m.benchmarkTimeToFill, ' days'));
    metricRow('Network Offer Acceptance', fmtPct(m.benchmarkOfferAcceptance));
    metricRow('Avg Candidates / Role', fmt(m.benchmarkCandidatesPerRole));
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text('Benchmarks are anonymized averages across the ClubOS partner network.', margin + 8, y + 4);
    y += 22;
  }

  // ── 5. Quarterly Trends ────────────────────────────────────────
  if (selectedSections.has('quarterly-trends')) {
    sectionTitle('Quarterly Trends');
    if (quarterlyTrends.length > 0) {
      (doc as any).autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Quarter', 'Applications', 'Hires', 'TTF (days)', 'Offer %']],
        body: quarterlyTrends.map((q) => [
          q.quarter,
          String(q.totalApplications),
          String(q.totalHires),
          fmt(q.avgTimeToHire),
          fmtPct(q.offerAcceptanceRate),
        ]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: {
          fillColor: BRAND_PRIMARY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 16;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_MUTED);
      doc.text('No quarterly trend data available yet.', margin + 8, y);
      y += 20;
    }
  }

  // ── 6. Open Roles ──────────────────────────────────────────────
  if (selectedSections.has('open-roles')) {
    sectionTitle('Open Roles Summary');
    if (openRoles.length > 0) {
      (doc as any).autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Role', 'Applicants', 'Days Open']],
        body: openRoles.map((r) => [
          r.title,
          String(r.applicationCount),
          String(r.daysSincePosted),
        ]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: {
          fillColor: BRAND_PRIMARY,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
      });
      y = (doc as any).lastAutoTable.finalY + 16;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_MUTED);
      doc.text('No open roles at this time.', margin + 8, y);
      y += 20;
    }
  }

  // ── Footer ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(
      `ClubOS Executive Briefing  |  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageH - 20,
      { align: 'center' },
    );
  }

  return doc.output('blob');
}
