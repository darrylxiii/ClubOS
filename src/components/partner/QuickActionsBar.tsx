import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Mail, FileText, Share2, Settings } from "lucide-react";
import { toast } from "sonner";
import { BulkEmailDialog } from "./BulkEmailDialog";
import { exportCandidatesToPDF } from "@/utils/pdfExport";
import { exportToCSV } from "@/utils/analyticsExport";
import { supabase } from "@/integrations/supabase/client";

interface QuickActionsBarProps {
  jobId: string;
  jobTitle: string;
  candidateCount: number;
  candidateIds?: string[];
}

export function QuickActionsBar({ jobId, jobTitle, candidateCount, candidateIds = [] }: QuickActionsBarProps) {
  const { t } = useTranslation('common');
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (candidateIds.length === 0) {
      toast.error(t("no_candidates_to_export", "No candidates to export"));
      return;
    }
    
    setExporting(true);
    try {
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('full_name, email, current_title, current_company')
        .in('id', candidateIds);

      if (candidates && candidates.length > 0) {
        exportToCSV(
          candidates.map(c => ({
            name: c.full_name,
            email: c.email,
            title: c.current_title,
            company: c.current_company
          })),
          `candidates-${jobTitle}`
        );
        toast.success(t("candidates_exported_successfully", "Candidates exported successfully"));
      }
    } catch (error) {
      toast.error(t("failed_to_export_candidates", "Failed to export candidates"));
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (candidateIds.length === 0) {
      toast.error(t("no_candidates_for_report", "No candidates for report"));
      return;
    }

    try {
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('full_name, email, current_title, current_company')
        .in('id', candidateIds);

      if (candidates) {
        exportCandidatesToPDF(
          candidates.map(c => ({
            name: c.full_name || '',
            email: c.email || '',
            title: c.current_title || '',
            company: c.current_company || '',
          })),
          `hiring-report-${jobTitle}`,
          jobTitle
        );
        toast.success(t("report_generated_successfully", "Report generated successfully"));
      }
    } catch (error) {
      toast.error(t("failed_to_generate_report", "Failed to generate report"));
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/jobs/${jobId}`;
    navigator.clipboard.writeText(url);
    toast.success(t("job_link_copied_to", "Job link copied to clipboard"));
  };

  const handleSettings = () => {
    toast.info(t("pipeline_settings_opening", "Pipeline settings opening..."));
  };

  return (
    <>
      <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl shadow-[var(--shadow-glass-md)] hover:shadow-[var(--shadow-glass-lg)] transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">{t("quick_actions", "Quick Actions")}</span>
              <span className="text-xs text-muted-foreground/60">({candidateCount} candidates)</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="gap-2 border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkEmail(true)}
                className="gap-2 border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all"
              >
                <Mail className="w-4 h-4" />
                Bulk Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateReport}
                className="gap-2 border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-2 border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share Job
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSettings}
                className="gap-2 border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BulkEmailDialog
        open={showBulkEmail}
        onOpenChange={setShowBulkEmail}
        candidateIds={candidateIds}
        candidateCount={candidateCount}
        jobTitle={jobTitle}
      />
    </>
  );
}
