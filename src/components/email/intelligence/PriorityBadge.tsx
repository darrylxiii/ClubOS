import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, AlertTriangle, Info, Minus } from "lucide-react";

interface PriorityBadgeProps {
  score: number;
  reason?: string | null;
  size?: "sm" | "md";
}

export function PriorityBadge({ score, reason, size = "md" }: PriorityBadgeProps) {
  const getPriorityConfig = (score: number) => {
    if (score >= 80) {
      return {
        label: "Urgent",
        icon: AlertCircle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/20",
      };
    } else if (score >= 60) {
      return {
        label: "High",
        icon: AlertTriangle,
        color: "text-warning",
        bgColor: "bg-warning/10",
        borderColor: "border-warning/20",
      };
    } else if (score >= 40) {
      return {
        label: "Normal",
        icon: Info,
        color: "text-primary",
        bgColor: "bg-primary/10",
        borderColor: "border-primary/20",
      };
    } else {
      return {
        label: "Low",
        icon: Minus,
        color: "text-muted-foreground",
        bgColor: "bg-muted/50",
        borderColor: "border-muted",
      };
    }
  };

  const config = getPriorityConfig(score);
  const IconComponent = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.borderColor} ${config.color} gap-1 ${
        size === "sm" ? "text-xs py-0 px-1.5 h-5" : "text-xs py-0.5 px-2"
      }`}
    >
      <IconComponent className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {config.label}
    </Badge>
  );

  if (!reason) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-medium mb-1">Why this priority?</p>
          <p className="text-xs text-muted-foreground">{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
