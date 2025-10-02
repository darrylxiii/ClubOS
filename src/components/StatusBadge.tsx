import { cn } from "@/lib/utils";

type StatusType = "applied" | "screening" | "interview" | "offer" | "rejected";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  applied: {
    label: "Applied",
    className: "bg-secondary text-secondary-foreground",
  },
  screening: {
    label: "Screening",
    className: "bg-warning/10 text-warning border border-warning/20",
  },
  interview: {
    label: "Interview",
    className: "bg-accent/10 text-accent border border-accent/20",
  },
  offer: {
    label: "Offer",
    className: "bg-success/10 text-success border border-success/20",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border border-destructive/20",
  },
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};
