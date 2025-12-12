/**
 * Export utility functions for CRM data
 */

export interface ExportOptions {
  filename: string;
  format: 'csv' | 'json';
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: keyof T; label: string }[],
  filename: string
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headerRow = headers.map(h => h.label).join(',');
  const rows = data.map(item => 
    headers.map(h => {
      const value = item[h.key];
      // Handle different types
      if (value === null || value === undefined) return '""';
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csvContent = [headerRow, ...rows].join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToJSON<T>(data: T[], filename: string): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Campaign export headers
export const CAMPAIGN_EXPORT_HEADERS = [
  { key: 'name' as const, label: 'Campaign Name' },
  { key: 'status' as const, label: 'Status' },
  { key: 'total_sent' as const, label: 'Emails Sent' },
  { key: 'total_opens' as const, label: 'Opens' },
  { key: 'total_replies' as const, label: 'Replies' },
  { key: 'total_bounces' as const, label: 'Bounces' },
  { key: 'open_rate' as const, label: 'Open Rate (%)' },
  { key: 'reply_rate' as const, label: 'Reply Rate (%)' },
  { key: 'start_date' as const, label: 'Start Date' },
  { key: 'created_at' as const, label: 'Created At' },
];

// Prospect export headers
export const PROSPECT_EXPORT_HEADERS = [
  { key: 'full_name' as const, label: 'Name' },
  { key: 'email' as const, label: 'Email' },
  { key: 'company_name' as const, label: 'Company' },
  { key: 'job_title' as const, label: 'Job Title' },
  { key: 'stage' as const, label: 'Stage' },
  { key: 'lead_score' as const, label: 'Lead Score' },
  { key: 'emails_sent' as const, label: 'Emails Sent' },
  { key: 'emails_opened' as const, label: 'Emails Opened' },
  { key: 'emails_replied' as const, label: 'Emails Replied' },
  { key: 'last_contacted_at' as const, label: 'Last Contacted' },
  { key: 'created_at' as const, label: 'Created At' },
];

// Reply export headers
export const REPLY_EXPORT_HEADERS = [
  { key: 'from_name' as const, label: 'From Name' },
  { key: 'from_email' as const, label: 'From Email' },
  { key: 'subject' as const, label: 'Subject' },
  { key: 'classification' as const, label: 'Classification' },
  { key: 'sentiment_score' as const, label: 'Sentiment Score' },
  { key: 'urgency' as const, label: 'Urgency' },
  { key: 'is_actioned' as const, label: 'Actioned' },
  { key: 'received_at' as const, label: 'Received At' },
];
