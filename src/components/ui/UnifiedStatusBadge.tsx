/**
 * Unified Status Badge Component
 * Config-driven badge that supports all status domains
 */

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import {
  StatusDomain,
  getStatusConfig,
  StatusConfig,
  ApplicationStatus,
  JobStatus,
  SyncStatus,
  AccountStatus,
  AssetStatus,
  InvoiceStatus,
  BookingStatus,
  ReferralStatus,
} from "@/lib/statusConfig";

// ============= Type Helpers =============

type StatusByDomain = {
  application: ApplicationStatus;
  job: JobStatus;
  sync: SyncStatus;
  account: AccountStatus;
  asset: AssetStatus;
  invoice: InvoiceStatus;
  booking: BookingStatus;
  referral: ReferralStatus;
};

// ============= Props =============

interface UnifiedStatusBadgeProps<D extends StatusDomain> {
  /** The domain of the status (e.g., 'application', 'job', 'sync') */
  domain: D;
  /** The status value within that domain */
  status: StatusByDomain[D] | string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Custom label override */
  label?: string;
  /** Whether to show tooltip with description */
  showTooltip?: boolean;
  /** Tooltip content override */
  tooltipContent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Optional animation override */
  animate?: boolean;
  /** Click handler */
  onClick?: () => void;
}

// ============= Size Classes =============

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
};

const iconSizes = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
};

// ============= Component =============

function UnifiedStatusBadgeInner<D extends StatusDomain>({
  domain,
  status,
  size = "md",
  showIcon = true,
  label,
  showTooltip = false,
  tooltipContent,
  className,
  animate,
  onClick,
}: UnifiedStatusBadgeProps<D>) {
  const { t } = useTranslation();
  
  const config = getStatusConfig(domain, status as string);
  
  if (!config) {
    // Fallback for unknown status
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medium border gap-1.5 inline-flex items-center",
          "bg-muted text-muted-foreground border-border/50",
          sizeClasses[size],
          className
        )}
      >
        {label || status}
      </Badge>
    );
  }

  const Icon = config.icon;
  const displayLabel = label || (config.labelKey ? t(config.labelKey) : config.label);
  const shouldAnimate = animate ?? !!config.animation;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1.5 inline-flex items-center transition-all",
        config.className,
        sizeClasses[size],
        onClick && "cursor-pointer hover:opacity-80",
        className
      )}
      onClick={onClick}
    >
      {showIcon && (
        <Icon 
          className={cn(
            iconSizes[size],
            shouldAnimate && config.animation
          )} 
        />
      )}
      {displayLabel}
    </Badge>
  );

  if (!showTooltip || (!config.description && !tooltipContent)) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent || <p className="text-sm">{config.description}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const UnifiedStatusBadge = memo(UnifiedStatusBadgeInner) as typeof UnifiedStatusBadgeInner & { displayName: string };

(UnifiedStatusBadge as { displayName: string }).displayName = "UnifiedStatusBadge";

// ============= Domain-Specific Convenience Components =============

export const ApplicationStatusBadge = memo(({
  status,
  ...props
}: Omit<UnifiedStatusBadgeProps<"application">, "domain">) => (
  <UnifiedStatusBadge domain="application" status={status} {...props} />
));
(ApplicationStatusBadge as { displayName: string }).displayName = "ApplicationStatusBadge";

export const JobStatusBadge = memo(({
  status,
  ...props
}: Omit<UnifiedStatusBadgeProps<"job">, "domain">) => (
  <UnifiedStatusBadge domain="job" status={status} {...props} />
));
(JobStatusBadge as { displayName: string }).displayName = "JobStatusBadge";

export const SyncStatusBadge = memo(({
  status,
  ...props
}: Omit<UnifiedStatusBadgeProps<"sync">, "domain">) => (
  <UnifiedStatusBadge domain="sync" status={status} {...props} />
));
(SyncStatusBadge as { displayName: string }).displayName = "SyncStatusBadge";

export const AccountStatusBadge = memo(({
  status,
  ...props
}: Omit<UnifiedStatusBadgeProps<"account">, "domain">) => (
  <UnifiedStatusBadge domain="account" status={status} {...props} />
));
(AccountStatusBadge as { displayName: string }).displayName = "AccountStatusBadge";

export const AssetStatusBadge = memo(({
  status,
  ...props
}: Omit<UnifiedStatusBadgeProps<"asset">, "domain">) => (
  <UnifiedStatusBadge domain="asset" status={status} {...props} />
));
(AssetStatusBadge as { displayName: string }).displayName = "AssetStatusBadge";

export const InvoiceStatusBadge = memo(({
  status,
  ...props
}: Omit<UnifiedStatusBadgeProps<"invoice">, "domain">) => (
  <UnifiedStatusBadge domain="invoice" status={status} {...props} />
));
(InvoiceStatusBadge as { displayName: string }).displayName = "InvoiceStatusBadge";

export const BookingStatusBadge = memo(({
  status,
  ...props
}: Omit<UnifiedStatusBadgeProps<"booking">, "domain">) => (
  <UnifiedStatusBadge domain="booking" status={status} {...props} />
));
(BookingStatusBadge as { displayName: string }).displayName = "BookingStatusBadge";

export const ReferralStatusBadge = memo(({
  status,
  ...props
}: Omit<UnifiedStatusBadgeProps<"referral">, "domain">) => (
  <UnifiedStatusBadge domain="referral" status={status} {...props} />
));
(ReferralStatusBadge as { displayName: string }).displayName = "ReferralStatusBadge";

export default UnifiedStatusBadge;
