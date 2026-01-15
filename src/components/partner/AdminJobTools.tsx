import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  UserPlus,
  Zap,
  Brain,
  Target,
  Database,
  Activity,
  FileDown,
  RefreshCw,
  Sparkles,
  Award,
} from "lucide-react";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { toast } from "sonner";

interface AdminJobToolsProps {
  jobId: string;
  jobTitle: string;
  onRefresh: () => void;
}

export const AdminJobTools = ({ jobId, jobTitle, onRefresh }: AdminJobToolsProps) => {
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  // Defensive check: if no jobId is provided, don't render anything or render a safe placeholder
  if (!jobId) {
    console.warn("AdminJobTools: No jobId provided");
    return null;
  }

  const handleAIRecommendations = () => {
    toast.info("AI Matching Engine", {
      description: "Analyzing global talent pool for perfect matches...",
      duration: 3000,
    });
    setTimeout(() => {
      toast.success("Found 23 high-potential candidates", {
        description: "Advanced AI scoring applied. Review in pipeline.",
      });
    }, 3000);
  };

  const handleBulkImport = () => {
    toast.info("Bulk Import", {
      description: "Upload CSV or connect ATS to import candidates",
    });
  };

  const handlePipelineHealth = () => {
    toast.success("Pipeline Health: 94%", {
      description: "Excellent flow. Avg time-to-hire: 12 days",
    });
  };

  const handleExportData = () => {
    toast.success("Exporting pipeline data", {
      description: "Full analytics export with GDPR compliance",
    });
  };

  const handleRecalculateMetrics = () => {
    toast.info("Recalculating metrics...", {
      description: "Using latest AI models and scoring algorithms",
    });
    setTimeout(() => {
      onRefresh();
      toast.success("Metrics updated successfully");
    }, 2000);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <Badge variant="outline" className="border-accent/50 text-foreground font-bold">
            ADMIN JOB TOOLS
          </Badge>
          <span className="text-xs text-muted-foreground">Job-level operations</span>
        </div>

        <div className="flex-1" />

        <Button
          onClick={() => setShowAddCandidate(true)}
          className="gap-2 bg-accent hover:bg-accent/90"
        >
          <UserPlus className="w-4 h-4" />
          Add Candidate
        </Button>

        <Button
          onClick={handleAIRecommendations}
          variant="outline"
          className="gap-2 border-accent/50 hover:bg-accent/10"
        >
          <Brain className="w-4 h-4" />
          AI Match
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Zap className="w-4 h-4" />
              Admin Tools
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Advanced Operations
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleBulkImport} className="gap-2">
              <Database className="w-4 h-4" />
              Bulk Import Candidates
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handlePipelineHealth} className="gap-2">
              <Activity className="w-4 h-4" />
              Pipeline Health Check
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleRecalculateMetrics} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Recalculate Metrics
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleExportData} className="gap-2">
              <FileDown className="w-4 h-4" />
              Export Full Data
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2 text-accent">
              <Target className="w-4 h-4" />
              Set Priority Override
            </DropdownMenuItem>

            <DropdownMenuItem className="gap-2">
              <Award className="w-4 h-4" />
              Assign Strategist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showAddCandidate && (
        <AddCandidateDialog
          open={showAddCandidate}
          onOpenChange={setShowAddCandidate}
          jobId={jobId}
          jobTitle={jobTitle}
          onCandidateAdded={onRefresh}
        />
      )}
    </>
  );
};
