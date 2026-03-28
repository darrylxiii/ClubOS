import { useTranslation } from 'react-i18next';
import { Link } from "react-router-dom";
import {
  DollarSign, BarChart3, Users, Briefcase, Shield, Globe,
  UserCheck, MessageSquare, Activity, ToggleLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TILES = [
  { icon: DollarSign, labelKey: "quickLaunch.finance", fallback: "Finance", href: "/admin/finance" },
  { icon: BarChart3, labelKey: "quickLaunch.kpiCenter", fallback: "KPI Center", href: "/admin/kpi-command-center" },
  { icon: Users, labelKey: "quickLaunch.talentPool", fallback: "Talent Pool", href: "/admin?tab=users" },
  { icon: Briefcase, labelKey: "quickLaunch.jobApprovals", fallback: "Job Approvals", href: "/jobs" },
  { icon: Shield, labelKey: "quickLaunch.security", fallback: "Security", href: "/admin/anti-hacking" },
  { icon: Globe, labelKey: "quickLaunch.analytics", fallback: "Analytics", href: "/admin/global-analytics" },
  { icon: UserCheck, labelKey: "quickLaunch.employees", fallback: "Employees", href: "/admin/employee" },
  { icon: MessageSquare, labelKey: "quickLaunch.whatsapp", fallback: "WhatsApp", href: "/admin/whatsapp" },
  { icon: Activity, labelKey: "quickLaunch.systemHealth", fallback: "System Health", href: "/admin/system-health" },
  { icon: ToggleLeft, labelKey: "quickLaunch.features", fallback: "Features", href: "/admin/feature-control" },
] as const;

export function QuickLaunchGrid() {
  const { t } = useTranslation('common');
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">{t("quick_launch", "Quick Launch")}</h3>
      <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-2">
        {TILES.map(({ icon: Icon, labelKey, fallback, href }) => (
          <Link
            key={href}
            to={href}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl",
              "border border-border/20 bg-card/60",
              "hover:bg-card/90 hover:shadow-md transition-all hover:scale-[1.03] active:scale-[0.97]"
            )}
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{t(labelKey, fallback)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
