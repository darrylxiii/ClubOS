import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Mail, FileText, Share2, Settings } from "lucide-react";
import { toast } from "sonner";

interface QuickActionsBarProps {
  jobId: string;
  jobTitle: string;
  candidateCount: number;
}

export function QuickActionsBar({ jobId, jobTitle, candidateCount }: QuickActionsBarProps) {
  const handleExport = () => {
    toast.success("Exporting candidate list...");
  };

  const handleBulkEmail = () => {
    toast.info("Bulk email feature coming soon");
  };

  const handleGenerateReport = () => {
    toast.success("Generating hiring report...");
  };

  const handleShare = () => {
    const url = `${window.location.origin}/jobs/${jobId}`;
    navigator.clipboard.writeText(url);
    toast.success("Job link copied to clipboard");
  };

  const handleSettings = () => {
    toast.info("Pipeline settings opening...");
  };

  return (
    <Card className="border-2 border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl shadow-[var(--shadow-glass-md)] hover:shadow-[var(--shadow-glass-lg)] transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Quick Actions</span>
            <span className="text-xs text-muted-foreground/60">({candidateCount} candidates)</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2 border-border/30 hover:border-border/50 bg-background/30 hover:bg-background/40 transition-all"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkEmail}
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
  );
}
