import { memo } from "react";
import { JobStatusBadge as UnifiedJobStatusBadge } from "@/components/ui/UnifiedStatusBadge";
import { getStatusConfig } from "@/lib/statusConfig";

export type JobStatus = "draft" | "published" | "closed" | "archived";

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Job status badge - delegates to unified system
 * Maintains backward compatibility with existing API
 */
export const JobStatusBadge = memo(({ 
  status, 
  className,
  showIcon = true,
  size = "md"
}: JobStatusBadgeProps) => {
  return (
    <UnifiedJobStatusBadge 
      status={status} 
      showIcon={showIcon}
      size={size}
      className={className}
    />
  );
});

JobStatusBadge.displayName = "JobStatusBadge";

// Helper function to get status info for other components
export const getJobStatusInfo = (status: JobStatus) => {
  const config = getStatusConfig('job', status);
  return config || {
    label: "Draft",
    displayLabel: "Draft",
    className: "bg-muted text-muted-foreground border-border/50",
    icon: null,
  };
};
