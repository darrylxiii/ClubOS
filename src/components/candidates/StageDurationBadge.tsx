import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

interface StageDurationBadgeProps {
  stageEnteredAt: string | Date;
  warningThresholdDays?: number;
  criticalThresholdDays?: number;
  showIcon?: boolean;
  size?: "sm" | "default";
}

export function StageDurationBadge({
  stageEnteredAt,
  warningThresholdDays = 5,
  criticalThresholdDays = 10,
  showIcon = true,
  size = "default",
}: StageDurationBadgeProps) {
  const enteredDate = typeof stageEnteredAt === "string" ? parseISO(stageEnteredAt) : stageEnteredAt;
  const daysInStage = differenceInDays(new Date(), enteredDate);

  const isCritical = daysInStage >= criticalThresholdDays;
  const isWarning = daysInStage >= warningThresholdDays;

  const getVariant = () => {
    if (isCritical) return "destructive";
    if (isWarning) return "secondary";
    return "outline";
  };

  const getClassName = () => {
    if (isCritical) return "bg-destructive/10 text-destructive border-destructive/30";
    if (isWarning) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "";
  };

  const Icon = isCritical || isWarning ? AlertTriangle : Clock;
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "";

  return (
    <Badge variant={getVariant()} className={`gap-1 ${getClassName()} ${sizeClass}`}>
      {showIcon && <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      {daysInStage}d
    </Badge>
  );
}
