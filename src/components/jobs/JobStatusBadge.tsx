import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileEdit, CheckCircle, XCircle, Archive } from "lucide-react";

export type JobStatus = "draft" | "published" | "closed" | "archived";

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<JobStatus, { 
  label: string; 
  displayLabel: string;
  className: string; 
  icon: React.ComponentType<{ className?: string }>;
}> = {
  draft: {
    label: "Draft",
    displayLabel: "Draft",
    className: "bg-muted text-muted-foreground border-border/50",
    icon: FileEdit,
  },
  published: {
    label: "Published",
    displayLabel: "Active", // Show "Active" to users for clarity
    className: "bg-success/10 text-success border-success/20",
    icon: CheckCircle,
  },
  closed: {
    label: "Closed",
    displayLabel: "Closed",
    className: "bg-warning/10 text-warning border-warning/20",
    icon: XCircle,
  },
  archived: {
    label: "Archived",
    displayLabel: "Archived",
    className: "bg-muted/50 text-muted-foreground border-border/30",
    icon: Archive,
  },
};

export const JobStatusBadge = memo(({ 
  status, 
  className,
  showIcon = true,
  size = "md"
}: JobStatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1.5 inline-flex items-center",
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(
        size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"
      )} />}
      {config.displayLabel}
    </Badge>
  );
});

JobStatusBadge.displayName = "JobStatusBadge";

// Helper function to get status info for other components
export const getJobStatusInfo = (status: JobStatus) => statusConfig[status] || statusConfig.draft;
