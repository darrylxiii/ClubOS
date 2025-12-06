import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

export function exportToCSV(kpis: UnifiedKPI[], filename: string = 'kpi-export') {
  const headers = [
    'Name',
    'Value',
    'Target',
    'Status',
    'Domain',
    'Category',
    'Trend',
    'Trend %',
    'Format',
  ];

  const formatValue = (kpi: UnifiedKPI) => {
    switch (kpi.format) {
      case 'percent':
        return `${kpi.value.toFixed(1)}%`;
      case 'currency':
        return `€${kpi.value.toFixed(0)}`;
      case 'hours':
        return `${kpi.value.toFixed(1)}h`;
      case 'days':
        return `${kpi.value.toFixed(1)}d`;
      case 'minutes':
        return `${kpi.value.toFixed(0)}min`;
      default:
        return kpi.value.toFixed(1);
    }
  };

  const rows = kpis.map(kpi => [
    kpi.displayName,
    formatValue(kpi),
    kpi.targetValue !== undefined ? formatValue({ ...kpi, value: kpi.targetValue }) : 'N/A',
    kpi.status,
    kpi.domain,
    kpi.category,
    kpi.trendDirection || 'stable',
    kpi.trendPercentage?.toFixed(1) || '0',
    kpi.format || 'number',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF(kpis: UnifiedKPI[], filename: string = 'kpi-export') {
  // For now, create a printable HTML that opens in new tab
  const formatValue = (kpi: UnifiedKPI) => {
    switch (kpi.format) {
      case 'percent':
        return `${kpi.value.toFixed(1)}%`;
      case 'currency':
        return `€${kpi.value.toFixed(0)}`;
      case 'hours':
        return `${kpi.value.toFixed(1)}h`;
      case 'days':
        return `${kpi.value.toFixed(1)}d`;
      default:
        return kpi.value.toFixed(1);
    }
  };

  const statusColors: Record<string, string> = {
    success: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444',
    neutral: '#6b7280',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>KPI Report - ${new Date().toLocaleDateString()}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
        h1 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; }
        .stats { display: flex; gap: 24px; margin-bottom: 32px; }
        .stat { padding: 16px; background: #f9fafb; border-radius: 8px; }
        .stat-value { font-size: 24px; font-weight: bold; }
        .stat-label { color: #6b7280; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>KPI Command Center Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${kpis.length}</div>
          <div class="stat-label">Total KPIs</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #10b981">${kpis.filter(k => k.status === 'success').length}</div>
          <div class="stat-label">On Target</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #f59e0b">${kpis.filter(k => k.status === 'warning').length}</div>
          <div class="stat-label">Warnings</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: #ef4444">${kpis.filter(k => k.status === 'critical').length}</div>
          <div class="stat-label">Critical</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>KPI</th>
            <th>Value</th>
            <th>Target</th>
            <th>Status</th>
            <th>Trend</th>
            <th>Domain</th>
          </tr>
        </thead>
        <tbody>
          ${kpis.map(kpi => `
            <tr>
              <td>${kpi.displayName}</td>
              <td><strong>${formatValue(kpi)}</strong></td>
              <td>${kpi.targetValue !== undefined ? formatValue({ ...kpi, value: kpi.targetValue }) : '—'}</td>
              <td><span class="status" style="background: ${statusColors[kpi.status]}20; color: ${statusColors[kpi.status]}">${kpi.status}</span></td>
              <td>${kpi.trendDirection === 'up' ? '↑' : kpi.trendDirection === 'down' ? '↓' : '→'} ${kpi.trendPercentage?.toFixed(1) || 0}%</td>
              <td>${kpi.domain}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <script>window.print();</script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
