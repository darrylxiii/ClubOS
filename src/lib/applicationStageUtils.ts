import { Clock, CheckCircle2, XCircle, Hourglass } from "lucide-react";

export interface StageDisplayInfo {
  label: string;
  progress: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Unified stage info utility for applications
 * Used by ApplicationStatusTracker, JobDashboard metrics, and candidate views
 */
export function getApplicationStageInfo(options: {
  currentStageIndex: number;
  stages: any[];
  status: string;
}): StageDisplayInfo {
  const { currentStageIndex, stages, status } = options;
  
  const currentStage = stages[currentStageIndex];
  const stageName = currentStage?.name || "Applied";
  const totalStages = stages.length || 5;
  const progress = ((currentStageIndex + 1) / totalStages) * 100;

  // Rejected status
  if (status === "rejected" || status === "declined") {
    return {
      label: "Not Selected",
      progress: 0,
      color: "bg-destructive/10 text-destructive border-destructive/30",
      icon: XCircle,
    };
  }

  // Hired status or offer stage
  if (status === "hired" || stageName.toLowerCase().includes("offer")) {
    return {
      label: stageName,
      progress: 100,
      color: "bg-success/10 text-success border-success/30",
      icon: CheckCircle2,
    };
  }

  // Closed status
  if (status === "closed" || status === "withdrawn") {
    return {
      label: "Closed",
      progress: 0,
      color: "bg-muted/50 text-muted-foreground border-border/30",
      icon: XCircle,
    };
  }

  // Active/in progress
  return {
    label: stageName,
    progress,
    color: "bg-primary/10 text-primary border-primary/30",
    icon: Clock,
  };
}

/**
 * Get color class for a pipeline stage based on index
 */
export function getStageColor(stageIndex: number, totalStages: number): string {
  const progress = stageIndex / totalStages;
  
  if (progress < 0.25) return "bg-blue-500";
  if (progress < 0.5) return "bg-indigo-500";
  if (progress < 0.75) return "bg-purple-500";
  return "bg-green-500";
}

/**
 * Get human-readable stage name from common stage patterns
 */
export function normalizeStageLabel(stageName: string): string {
  const normalizations: Record<string, string> = {
    applied: "Applied",
    screening: "Screening",
    phone_screen: "Phone Screen",
    interview: "Interview",
    technical: "Technical",
    onsite: "On-site",
    final: "Final Round",
    offer: "Offer",
    hired: "Hired",
    rejected: "Not Selected",
  };

  const lower = stageName.toLowerCase().replace(/[_-]/g, "_");
  return normalizations[lower] || stageName;
}
