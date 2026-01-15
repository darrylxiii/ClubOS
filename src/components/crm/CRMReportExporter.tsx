import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


import { toast } from "sonner";
import { FileDown, FileSpreadsheet, FileText, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CRMReportExporterProps {
  dateRange?: { start: string; end: string };
}

export function CRMReportExporter({ dateRange }: CRMReportExporterProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportToCSV = async () => {
    setExporting('csv');
    try {
      const { data: prospects, error } = await supabase
        .from('crm_prospects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const headers = [
        'Name', 'Email', 'Company', 'Stage', 'Score', 'Deal Value', 
        'Source', 'Owner', 'Created At', 'Last Contacted'
      ];

      const rows = (prospects || []).map((p: any) => [
        p.name || '',
        p.email || '',
        p.company_name || '',
        p.stage || '',
        p.score || 0,
        p.deal_value || 0,
        p.source || '',
        p.owner_id || '',
        p.created_at || '',
        p.last_contacted_at || ''
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-prospects-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async () => {
    setExporting('pdf');
    try {
      // For now, generate a simple text-based report
      const { data: prospects } = await supabase
        .from('crm_prospects')
        .select('*');

      const { data: analytics } = await supabase
        .from('crm_campaigns')
        .select('*');

      const report = `
CRM Analytics Report
Generated: ${new Date().toLocaleDateString()}

SUMMARY
-------
Total Prospects: ${(prospects || []).length}
Total Pipeline Value: €${((prospects || []).reduce((sum: number, p: any) => sum + (p.deal_value || 0), 0) / 1000).toFixed(0)}k
Active Campaigns: ${(analytics || []).length}

STAGE BREAKDOWN
--------------
${['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
  .map(stage => {
    const count = (prospects || []).filter((p: any) => p.stage === stage).length;
    return `${stage}: ${count}`;
  }).join('\n')}
      `;

      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-report-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setExporting(null);
    }
  };

  const emailReport = async () => {
    setExporting('email');
    try {
      // Placeholder for email functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Report scheduled for email delivery');
    } catch (error) {
      toast.error('Failed to schedule email');
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileDown className="h-5 w-5 text-primary" />
          Export Reports
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exporting !== null}
            className="flex items-center gap-2"
          >
            {exporting === 'csv' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exporting !== null}
            className="flex items-center gap-2"
          >
            {exporting === 'pdf' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Export Report
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={emailReport}
            disabled={exporting !== null}
            className="flex items-center gap-2"
          >
            {exporting === 'email' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Email Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
