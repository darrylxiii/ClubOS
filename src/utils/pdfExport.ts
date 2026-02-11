// Dynamic imports for jsPDF to reduce build memory pressure
type JsPDFType = import('jspdf').jsPDF;

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  includeTimestamp?: boolean;
}

// TQC Brand Colors (converted to RGB for PDF)
const BRAND_COLORS = {
  primary: [201, 162, 78] as [number, number, number], // Gold #C9A24E
  dark: [14, 14, 16] as [number, number, number], // Eclipse #0E0E10
  light: [245, 244, 239] as [number, number, number], // Ivory #F5F4EF
  accent: [139, 92, 246] as [number, number, number], // Purple accent
};

/**
 * Generate a branded PDF header
 */
function addHeader(doc: JsPDFType, options: PDFExportOptions) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header background
  doc.setFillColor(...BRAND_COLORS.dark);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo text (The Quantum Club)
  doc.setTextColor(...BRAND_COLORS.primary);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('The Quantum Club', 20, 25);
  
  // Title
  doc.setTextColor(...BRAND_COLORS.light);
  doc.setFontSize(12);
  doc.text(options.title, pageWidth - 20, 20, { align: 'right' });
  
  // Subtitle or timestamp
  if (options.subtitle || options.includeTimestamp) {
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    const text = options.subtitle || `Generated: ${new Date().toLocaleString()}`;
    doc.text(text, pageWidth - 20, 30, { align: 'right' });
  }
  
  return 50; // Return Y position after header
}

/**
 * Add page footer with page numbers
 */
function addFooter(doc: JsPDFType) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      '© The Quantum Club - Confidential',
      20,
      pageHeight - 10
    );
  }
}

/**
 * Export data to a branded PDF with tables
 */
export async function exportTableToPDF(
  data: Record<string, unknown>[],
  columns: { header: string; key: string }[],
  filename: string,
  options: PDFExportOptions
) {
  // Dynamic import to reduce build memory
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const startY = addHeader(doc, options);

  // Prepare table data
  const headers = columns.map(col => col.header);
  const rows = data.map(row => columns.map(col => {
    const value = row[col.key];
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date) return value.toLocaleDateString();
    return String(value);
  }));

  // Generate table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY,
    theme: 'striped',
    headStyles: {
      fillColor: BRAND_COLORS.primary,
      textColor: BRAND_COLORS.dark,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    alternateRowStyles: {
      fillColor: [250, 250, 248],
    },
    margin: { left: 15, right: 15 },
  });

  addFooter(doc);

  // Download
  doc.save(`${filename}-${formatDateForFilename()}.pdf`);
}

/**
 * Export a detailed report to PDF
 */
export async function exportReportToPDF(
  reportData: {
    sections: Array<{
      title: string;
      content: string | Record<string, unknown>[];
      type: 'text' | 'table' | 'metrics';
    }>;
  },
  filename: string,
  options: PDFExportOptions
) {
  // Dynamic import to reduce build memory
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let currentY = addHeader(doc, options);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  reportData.sections.forEach((section, index) => {
    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    // Section title
    doc.setFontSize(14);
    doc.setTextColor(...BRAND_COLORS.dark);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, currentY);
    currentY += 8;

    // Underline
    doc.setDrawColor(...BRAND_COLORS.primary);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, margin + 40, currentY);
    currentY += 8;

    if (section.type === 'text' && typeof section.content === 'string') {
      // Text content
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      const lines = doc.splitTextToSize(section.content, contentWidth);
      doc.text(lines, margin, currentY);
      currentY += lines.length * 5 + 10;
      
    } else if (section.type === 'metrics' && Array.isArray(section.content)) {
      // Metrics grid
      const metrics = section.content as Array<{ label: string; value: string | number }>;
      const colWidth = contentWidth / 3;
      
      metrics.forEach((metric, idx) => {
        const x = margin + (idx % 3) * colWidth;
        const y = currentY + Math.floor(idx / 3) * 25;
        
        // Metric box
        doc.setFillColor(250, 249, 245);
        doc.roundedRect(x, y, colWidth - 5, 20, 2, 2, 'F');
        
        // Value
        doc.setFontSize(14);
        doc.setTextColor(...BRAND_COLORS.dark);
        doc.setFont('helvetica', 'bold');
        doc.text(String(metric.value), x + 5, y + 10);
        
        // Label
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(metric.label, x + 5, y + 16);
      });
      
      currentY += Math.ceil(metrics.length / 3) * 25 + 10;
      
    } else if (section.type === 'table' && Array.isArray(section.content)) {
      // Table content
      const tableData = section.content as Record<string, unknown>[];
      if (tableData.length > 0) {
        const columns = Object.keys(tableData[0]).map(key => ({
          header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
          key
        }));
        
        autoTable(doc, {
          head: [columns.map(c => c.header)],
          body: tableData.map(row => columns.map(c => String(row[c.key] ?? ''))),
          startY: currentY,
          theme: 'grid',
          headStyles: {
            fillColor: BRAND_COLORS.primary,
            textColor: BRAND_COLORS.dark,
            fontSize: 9,
          },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin },
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 15;
      }
    }
    
    currentY += 5;
  });

  addFooter(doc);
  doc.save(`${filename}-${formatDateForFilename()}.pdf`);
}

/**
 * Export candidate list to PDF
 */
export async function exportCandidatesToPDF(
  candidates: Array<{
    name: string;
    email: string;
    title?: string;
    company?: string;
    status?: string;
    score?: number;
  }>,
  filename: string,
  jobTitle?: string
) {
  await exportTableToPDF(
    candidates,
    [
      { header: 'Name', key: 'name' },
      { header: 'Email', key: 'email' },
      { header: 'Title', key: 'title' },
      { header: 'Company', key: 'company' },
      { header: 'Status', key: 'status' },
      { header: 'Score', key: 'score' },
    ],
    filename,
    {
      title: jobTitle ? `Candidates - ${jobTitle}` : 'Candidate Export',
      includeTimestamp: true,
      orientation: 'landscape',
    }
  );
}

/**
 * Export KPI data to PDF
 */
export async function exportKPIsToPDF(
  kpis: Array<{
    name: string;
    value: string | number;
    target?: string | number;
    status?: 'on_track' | 'warning' | 'critical';
    trend?: string;
  }>,
  filename: string,
  title: string
) {
  await exportTableToPDF(
    kpis.map(kpi => ({
      ...kpi,
      status: kpi.status === 'on_track' ? '✓ On Track' : 
              kpi.status === 'warning' ? '⚠ Warning' : 
              kpi.status === 'critical' ? '✗ Critical' : '-',
    })),
    [
      { header: 'KPI Name', key: 'name' },
      { header: 'Current Value', key: 'value' },
      { header: 'Target', key: 'target' },
      { header: 'Status', key: 'status' },
      { header: 'Trend', key: 'trend' },
    ],
    filename,
    {
      title,
      includeTimestamp: true,
    }
  );
}

/**
 * Export meeting transcript/notes to PDF
 */
export async function exportMeetingToPDF(
  meeting: {
    title: string;
    date: string;
    participants: string[];
    summary?: string;
    actionItems?: Array<{ task: string; owner: string; deadline?: string }>;
    transcript?: string;
  },
  filename: string
) {
  const sections: Array<{
    title: string;
    content: string | Record<string, unknown>[];
    type: 'text' | 'table' | 'metrics';
  }> = [
    {
      title: 'Meeting Details',
      type: 'metrics',
      content: [
        { label: 'Date', value: meeting.date },
        { label: 'Participants', value: meeting.participants.length },
        { label: 'Duration', value: 'N/A' },
      ],
    },
    {
      title: 'Participants',
      type: 'text',
      content: meeting.participants.join(', '),
    },
  ];

  if (meeting.summary) {
    sections.push({
      title: 'Summary',
      type: 'text',
      content: meeting.summary,
    });
  }

  if (meeting.actionItems && meeting.actionItems.length > 0) {
    sections.push({
      title: 'Action Items',
      type: 'table',
      content: meeting.actionItems.map(item => ({
        task: item.task,
        owner: item.owner,
        deadline: item.deadline || 'TBD',
      })),
    });
  }

  if (meeting.transcript) {
    sections.push({
      title: 'Transcript',
      type: 'text',
      content: meeting.transcript,
    });
  }

  await exportReportToPDF(
    { sections },
    filename,
    { title: meeting.title, subtitle: meeting.date }
  );
}

function formatDateForFilename(): string {
  return new Date().toISOString().split('T')[0];
}
