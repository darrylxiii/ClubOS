import { Badge } from "@/components/ui/badge";
import { Gift, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { cn } from "@/lib/utils";

interface JobReferralBadgeProps {
  potentialEarnings: number;
  referralPercentage?: number;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function JobReferralBadge({ 
  potentialEarnings, 
  referralPercentage = 10,
  showPercentage = false,
  size = "md",
  className 
}: JobReferralBadgeProps) {
  if (potentialEarnings <= 0) return null;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-gradient-to-r from-success/10 to-accent/10 border-success/30 text-success font-medium gap-1.5",
        sizeClasses[size],
        className
      )}
    >
      <Gift className={iconSizes[size]} />
      <span>Earn up to {formatCurrency(potentialEarnings)}</span>
      {showPercentage && (
        <span className="text-muted-foreground ml-1">
          ({referralPercentage}%)
        </span>
      )}
    </Badge>
  );
}

interface JobReferralChipProps {
  salaryMax?: number;
  salaryMin?: number;
  feePercentage?: number;
  referralPercentage?: number;
  showReferralBonus?: boolean;
  className?: string;
}

export function JobReferralChip({
  salaryMax,
  salaryMin,
  feePercentage = 20,
  referralPercentage = 10,
  showReferralBonus = true,
  className,
}: JobReferralChipProps) {
  if (!showReferralBonus) return null;

  const avgSalary = salaryMax || salaryMin || 75000;
  const expectedFee = avgSalary * (feePercentage / 100);
  const potentialEarnings = expectedFee * (referralPercentage / 100);

  if (potentialEarnings <= 0) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
      "bg-gradient-to-r from-success/10 via-success/5 to-transparent",
      "border border-success/20 text-success text-xs font-medium",
      className
    )}>
      <TrendingUp className="h-3 w-3" />
      <span>Refer & Earn {formatCurrency(potentialEarnings)}</span>
    </div>
  );
}
