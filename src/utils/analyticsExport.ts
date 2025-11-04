// Phase 5: Enhanced Analytics Export Utilities
import { supabase } from '@/integrations/supabase/client';

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

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  // For now, export as CSV (can be enhanced with xlsx library)
  exportToCSV(data, filename);
  logExport('excel', filename);
}

export function exportToPDF(data: any, filename: string, title: string) {
  // Basic HTML-to-PDF export (can be enhanced with jspdf library)
  const htmlContent = generateHTMLReport(data, title);
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  downloadBlob(blob, `${filename}-${new Date().toISOString().split('T')[0]}.html`);
  
  logExport('pdf', filename);
}

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

export function formatDateForExport(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

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
  } catch (error) {
    console.error('Failed to log export:', error);
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

// Schedule email report (placeholder - requires email service)
export async function scheduleEmailReport(
  frequency: 'daily' | 'weekly' | 'monthly',
  reportType: string,
  email: string
) {
  // This would integrate with an email service
  console.log(`Scheduling ${frequency} ${reportType} report to ${email}`);
  // TODO: Implement email scheduling via Edge Function
}

