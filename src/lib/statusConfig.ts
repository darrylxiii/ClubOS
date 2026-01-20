/**
 * Unified Status Configuration System
 * Centralizes all status definitions across domains for consistent styling and behavior
 */

import { 
  CheckCircle, XCircle, Clock, AlertCircle, Archive, 
  FileEdit, Loader2, CloudOff, Ban, ShieldAlert, Eye,
  Send, Users, ThumbsUp, ThumbsDown, Briefcase, Star,
  Package, DollarSign, Mail, Phone, Video
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============= Status Domain Types =============

export type StatusDomain = 
  | "application" 
  | "job" 
  | "sync" 
  | "account" 
  | "asset" 
  | "invoice"
  | "booking"
  | "referral";

export interface StatusConfig {
  label: string;
  labelKey?: string; // i18n key
  icon: LucideIcon;
  className: string;
  description?: string;
  animation?: string;
}

// ============= Application Status =============

export type ApplicationStatus = 
  | "applied" 
  | "screening" 
  | "interview" 
  | "offer" 
  | "rejected" 
  | "hired"
  | "withdrawn";

export const applicationStatusConfig: Record<ApplicationStatus, StatusConfig> = {
  applied: {
    label: "Applied",
    labelKey: "common:applications.status.applied",
    icon: Send,
    className: "bg-secondary text-secondary-foreground",
  },
  screening: {
    label: "Screening",
    labelKey: "common:applications.status.screening",
    icon: Eye,
    className: "bg-warning/10 text-warning border border-warning/20",
  },
  interview: {
    label: "Interview",
    labelKey: "common:applications.status.interview",
    icon: Video,
    className: "bg-accent/10 text-accent border border-accent/20",
  },
  offer: {
    label: "Offer",
    labelKey: "common:applications.status.offer",
    icon: Star,
    className: "bg-success/10 text-success border border-success/20",
  },
  rejected: {
    label: "Rejected",
    labelKey: "common:applications.status.rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border border-destructive/20",
  },
  hired: {
    label: "Hired",
    icon: CheckCircle,
    className: "bg-success/10 text-success border border-success/20",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: Archive,
    className: "bg-muted text-muted-foreground border border-border/50",
  },
};

// ============= Job Status =============

export type JobStatus = "draft" | "published" | "closed" | "archived";

export const jobStatusConfig: Record<JobStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    className: "bg-muted text-muted-foreground border-border/50",
  },
  published: {
    label: "Active",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    className: "bg-muted/50 text-muted-foreground border-border/30",
  },
};

// ============= Sync Status =============

export type SyncStatus = "syncing" | "synced" | "error" | "pending" | "offline";

export const syncStatusConfig: Record<SyncStatus, StatusConfig> = {
  syncing: {
    label: "Syncing",
    icon: Loader2,
    className: "bg-primary/10 text-primary border-primary/30",
    animation: "animate-spin",
  },
  synced: {
    label: "Synced",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/30",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  offline: {
    label: "Offline",
    icon: CloudOff,
    className: "bg-muted/50 text-muted-foreground border-border/50",
  },
};

// ============= Account Status =============

export type AccountStatus = "active" | "suspended" | "banned" | "pending_review" | "read_only";

export const accountStatusConfig: Record<AccountStatus, StatusConfig> = {
  active: {
    label: "Active",
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  suspended: {
    label: "Suspended",
    icon: ShieldAlert,
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  banned: {
    label: "Banned",
    icon: Ban,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  pending_review: {
    label: "Pending",
    icon: Eye,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  read_only: {
    label: "Read Only",
    icon: XCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
};

// ============= Asset Status =============

export type AssetStatus = "active" | "fully_depreciated" | "sold" | "written_off";

export const assetStatusConfig: Record<AssetStatus, StatusConfig> = {
  active: {
    label: "Active",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  fully_depreciated: {
    label: "Fully Depreciated",
    icon: Package,
    className: "bg-muted text-muted-foreground border-border/50",
  },
  sold: {
    label: "Sold",
    icon: DollarSign,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  written_off: {
    label: "Written Off",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

// ============= Invoice Status =============

export type InvoiceStatus = "draft" | "open" | "paid" | "late" | "cancelled";

export const invoiceStatusConfig: Record<InvoiceStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    className: "bg-muted text-muted-foreground border-border/50",
  },
  open: {
    label: "Open",
    icon: Mail,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  late: {
    label: "Overdue",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-muted/50 text-muted-foreground border-border/30",
  },
};

// ============= Booking Status =============

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export const bookingStatusConfig: Record<BookingStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  no_show: {
    label: "No Show",
    icon: AlertCircle,
    className: "bg-warning/10 text-warning border-warning/20",
  },
};

// ============= Referral Status =============

export type ReferralStatus = "pending" | "qualified" | "hired" | "paid" | "expired";

export const referralStatusConfig: Record<ReferralStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  qualified: {
    label: "Qualified",
    icon: ThumbsUp,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  hired: {
    label: "Hired",
    icon: Briefcase,
    className: "bg-success/10 text-success border-success/20",
  },
  paid: {
    label: "Paid",
    icon: DollarSign,
    className: "bg-success/10 text-success border-success/20",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    className: "bg-muted text-muted-foreground border-border/50",
  },
};

// ============= Domain Config Map =============

export const statusConfigMap: Record<StatusDomain, Record<string, StatusConfig>> = {
  application: applicationStatusConfig,
  job: jobStatusConfig,
  sync: syncStatusConfig,
  account: accountStatusConfig,
  asset: assetStatusConfig,
  invoice: invoiceStatusConfig,
  booking: bookingStatusConfig,
  referral: referralStatusConfig,
};

// ============= Helper Functions =============

/**
 * Get status configuration for a given domain and status
 */
export function getStatusConfig(domain: StatusDomain, status: string): StatusConfig | null {
  const domainConfig = statusConfigMap[domain];
  if (!domainConfig) return null;
  return domainConfig[status] || null;
}

/**
 * Derive sync status from common boolean patterns
 */
export function deriveSyncStatus(options: {
  isSyncing?: boolean;
  isConnected?: boolean;
  hasError?: boolean;
  isPending?: boolean;
}): SyncStatus {
  const { isSyncing, isConnected = true, hasError, isPending } = options;
  
  if (!isConnected) return "offline";
  if (isSyncing) return "syncing";
  if (hasError) return "error";
  if (isPending) return "pending";
  return "synced";
}

/**
 * Normalize various status strings to standard status
 */
export function normalizeApplicationStatus(status: string): ApplicationStatus {
  const normalized = status.toLowerCase().replace(/[_-]/g, "");
  
  const mapping: Record<string, ApplicationStatus> = {
    applied: "applied",
    new: "applied",
    screening: "screening",
    review: "screening",
    interview: "interview",
    interviewing: "interview",
    offer: "offer",
    offered: "offer",
    rejected: "rejected",
    declined: "rejected",
    hired: "hired",
    accepted: "hired",
    withdrawn: "withdrawn",
    cancelled: "withdrawn",
  };
  
  return mapping[normalized] || "applied";
}

export function normalizeJobStatus(status: string): JobStatus {
  const normalized = status.toLowerCase();
  
  const mapping: Record<string, JobStatus> = {
    draft: "draft",
    published: "published",
    active: "published",
    open: "published",
    closed: "closed",
    filled: "closed",
    archived: "archived",
    inactive: "archived",
  };
  
  return mapping[normalized] || "draft";
}
