import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type StatusType = "applied" | "screening" | "interview" | "offer" | "rejected";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const { t } = useTranslation();
  
  const statusConfig: Record<StatusType, { labelKey: string; className: string }> = {
    applied: {
      labelKey: "common:applications.status.applied",
      className: "bg-secondary text-secondary-foreground",
    },
    screening: {
      labelKey: "common:applications.status.screening",
      className: "bg-warning/10 text-warning border border-warning/20",
    },
    interview: {
      labelKey: "common:applications.status.interview",
      className: "bg-accent/10 text-accent border border-accent/20",
    },
    offer: {
      labelKey: "common:applications.status.offer",
      className: "bg-success/10 text-success border border-success/20",
    },
    rejected: {
      labelKey: "common:applications.status.rejected",
      className: "bg-destructive/10 text-destructive border border-destructive/20",
    },
  };

  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {t(config.labelKey)}
    </span>
  );
};
