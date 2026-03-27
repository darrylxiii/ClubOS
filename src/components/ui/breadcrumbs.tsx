import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Auto-generate breadcrumbs from route path if no items provided
function generateFromPath(pathname: string, t: (key: string, fallback: string) => string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Map known route segments to translation keys
  const labelMap: Record<string, { key: string; fallback: string }> = {
    jobs: { key: "breadcrumbs.jobs", fallback: "Jobs" },
    applications: { key: "breadcrumbs.applications", fallback: "Applications" },
    companies: { key: "breadcrumbs.companies", fallback: "Companies" },
    referrals: { key: "breadcrumbs.referrals", fallback: "Referrals" },
    assessments: { key: "breadcrumbs.assessments", fallback: "Assessments" },
    offers: { key: "breadcrumbs.offerComparison", fallback: "Offer Comparison" },
    "cover-letter-builder": { key: "breadcrumbs.coverLetterBuilder", fallback: "Cover Letter Builder" },
    "interview-prep": { key: "breadcrumbs.interviewPrep", fallback: "Interview Prep" },
    profile: { key: "breadcrumbs.profile", fallback: "Profile" },
    settings: { key: "breadcrumbs.settings", fallback: "Settings" },
    messages: { key: "breadcrumbs.messages", fallback: "Messages" },
    meetings: { key: "breadcrumbs.meetings", fallback: "Meetings" },
    analytics: { key: "breadcrumbs.analytics", fallback: "Analytics" },
    admin: { key: "breadcrumbs.admin", fallback: "Admin" },
  };

  let accPath = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    accPath += `/${seg}`;

    // UUID segments = detail pages, use "Details" label
    const isUuid = /^[0-9a-f]{8}-/.test(seg);
    const mapped = labelMap[seg];
    const label = isUuid
      ? t("breadcrumbs.details", "Details")
      : mapped
      ? t(mapped.key, mapped.fallback)
      : seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");

    items.push({
      label,
      href: i < segments.length - 1 ? accPath : undefined, // Last item has no link
    });
  }

  return items;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const crumbs = items || generateFromPath(location.pathname, t);

  if (crumbs.length <= 1) return null; // Don't show for top-level pages

  return (
    <nav aria-label={t("breadcrumb", "Breadcrumb")} className={cn("flex items-center gap-1 text-xs text-muted-foreground mb-4", className)}>
      <Link
        to="/home"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3 w-3" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          {crumb.href ? (
            <Link
              to={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

