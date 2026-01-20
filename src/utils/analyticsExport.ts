// Phase 5: Enhanced Analytics Export Utilities
import { supabase } from '@/integrations/supabase/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export data to a CSV file and trigger a download.
 * @param data - The array of objects to export.
 * @param filename - The desired filename (without extension).
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  // Extract headers from first object
  const headers = Object.keys(data[0]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);

  // Log export for GDPR compliance
  logExport('csv', filename);
}

/**
 * Export data to an Excel file (currently falls back to CSV).
 * @param data - The array of objects to export.
 * @param filename - The desired filename.
 */
export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  // For now, export as CSV (can be enhanced with xlsx library)
  exportToCSV(data, filename);
  logExport('excel', filename);
}

/**
 * Export data to a proper PDF report using jsPDF.
 * @param data - The data to include in the report (array of objects or object with sections).
 * @param filename - The desired filename.
 * @param title - The title of the report.
 * @param options - Additional PDF options.
 */
export function exportToPDF(
  data: any,
  filename: string,
  title: string,
  options?: {
    subtitle?: string;
    includeTimestamp?: boolean;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter';
  }
) {
  const orientation = options?.orientation || 'portrait';
  const pageSize = options?.pageSize || 'a4';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Add header with logo placeholder and title
  doc.setFillColor(59, 130, 246); // Blue header
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 20);

  if (options?.subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(options.subtitle, margin, 26);
  }

  yPosition = 40;

  // Add timestamp
  if (options?.includeTimestamp !== false) {
    doc.setTextColor(128, 128, 128);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 10;
  }

  doc.setTextColor(0, 0, 0);

  // Handle different data formats
  if (Array.isArray(data) && data.length > 0) {
    // Single table of data
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => formatCellValue(row[h])));

    autoTable(doc, {
      head: [headers.map(h => formatHeaderName(h))],
      body: rows,
      startY: yPosition,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });
  } else if (typeof data === 'object' && data !== null) {
    // Object with multiple sections
    Object.entries(data).forEach(([sectionName, sectionData]) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      // Section header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(59, 130, 246);
      doc.text(formatHeaderName(sectionName), margin, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      if (Array.isArray(sectionData) && sectionData.length > 0) {
        const headers = Object.keys(sectionData[0]);
        const rows = sectionData.map(row => headers.map(h => formatCellValue(row[h])));

        autoTable(doc, {
          head: [headers.map(h => formatHeaderName(h))],
          body: rows,
          startY: yPosition,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [100, 116, 139],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          didDrawPage: (data) => {
            yPosition = data.cursor?.y || yPosition;
          },
        });

        // Update position after table
        yPosition = (doc as any).lastAutoTable?.finalY + 15 || yPosition + 20;
      } else if (typeof sectionData === 'object' && sectionData !== null) {
        // Key-value pairs
        Object.entries(sectionData).forEach(([key, value]) => {
          doc.setFontSize(10);
          doc.text(`${formatHeaderName(key)}: ${formatCellValue(value)}`, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 10;
      }
    });
  }

  // Add footer
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages} | The Quantum Club`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);

  logExport('pdf', filename);
}

// Helper to format header names (snake_case to Title Case)
function formatHeaderName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// Helper to format cell values for display
function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Export a DOM element to PDF (for charts and complex layouts).
 * @param element - The DOM element to capture.
 * @param filename - The desired filename.
 * @param title - The title of the report.
 */
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string,
  title: string
) {
  // Dynamically import html2canvas to avoid bundle size when not used
  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const doc = new jsPDF({
    orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [imgWidth + 40, imgHeight + 80],
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Add title
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 50, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 35);

  // Add image
  doc.addImage(imgData, 'PNG', 20, 60, imgWidth, imgHeight);

  // Add footer
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated: ${new Date().toLocaleString()} | The Quantum Club`,
    pageWidth / 2,
    imgHeight + 70,
    { align: 'center' }
  );

  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);

  logExport('pdf', filename);
}

/**
 * Export data to a JSON file.
 * @param data - The object or array to export.
 * @param filename - The desired filename.
 */
export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format a date for export usage (YYYY-MM-DD).
 * @param date - Date object or string.
 * @returns Formatted date string.
 */
export function formatDateForExport(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format a time for export usage (HH:MM:SS).
 * @param date - Date object or string.
 * @returns Formatted time string.
 */
export function formatTimeForExport(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour12: false });
}

// Helper function to trigger download
function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Log export for GDPR compliance
async function logExport(exportType: string, dataScope: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Use type casting for new table not yet in types
    await (supabase as any).from('analytics_export_log').insert({
      user_id: user.id,
      export_type: exportType,
      data_scope: dataScope,
      ip_address: null,
      user_agent: navigator.userAgent.substring(0, 200),
      metadata: { timestamp: new Date().toISOString() }
    });
  } catch (_error) {
    console.error('Failed to log export:', _error);
  }
}

// Generate HTML report for PDF export
function generateHTMLReport(data: any, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f4f4f4; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>
  `.trim();
}

/**
 * Schedule a periodic email report via an edge function.
 * @param frequency - 'daily', 'weekly', or 'monthly'.
 * @param reportType - Identifier for the report type.
 * @param email - Recipient email.
 * @param options - Additional scheduling options.
 */
export async function scheduleEmailReport(
  frequency: 'daily' | 'weekly' | 'monthly',
  reportType: string,
  email: string,
  options?: {
    timezone?: string;
    preferredTime?: string;
  }
): Promise<{ success: boolean; scheduleId?: string; nextRunAt?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('schedule-email-report', {
      body: {
        frequency,
        reportType,
        email,
        timezone: options?.timezone || 'Europe/Amsterdam',
        preferredTime: options?.preferredTime || '09:00',
      },
    });

    if (error) {
      console.error('Failed to schedule email report:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      scheduleId: data.scheduleId,
      nextRunAt: data.nextRunAt,
    };
  } catch (error: any) {
    console.error('Failed to schedule email report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a scheduled report.
 * @param reportId - ID of the report to cancel.
 * @returns Success status.
 */
export async function cancelScheduledReport(reportId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('scheduled_reports' as any)
      .update({ is_active: false })
      .eq('id', reportId);

    return !error;
  } catch (_error) {
    console.error('Failed to cancel scheduled report:', _error);
    return false;
  }
}

/**
 * Retrieve the current user's active scheduled reports.
 */
export async function getScheduledReports(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('scheduled_reports' as any)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (_error) {
    console.error('Failed to get scheduled reports:', _error);
    return [];
  }
}

