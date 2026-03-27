import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Clock, AlertTriangle, Building2, Shield, CheckCircle, Flame, Snowflake, TrendingUp, Zap, Eye } from "lucide-react";
import { usePredictiveSignals } from "@/hooks/usePredictiveSignals";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const signalIcons: Record<string, typeof Flame> = {
  heating_up: Flame,
  cooling_off: Snowflake,
  hiring_intent: TrendingUp,
  relationship_risk: AlertTriangle,
  opportunity_window: Zap,
  re_engagement: Eye,
};

export function AttentionRequiredStrip() {
  const { t } = useTranslation('common');
  const { data: cmdData, isLoading: cmdLoading } = useQuery({
    queryKey: ["admin-command-strip"],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const [pendingRes, overdueRes, alertsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).is("onboarding_completed_at", null),
        supabase.from("applications").select("id", { count: "exact", head: true }).in("status", ["applied", "screening", "interview"]).lt("updated_at", sevenDaysAgo.toISOString()),
        supabase.from("security_events").select("id", { count: "exact", head: true }).gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()).in("severity", ["critical", "high"]),
      ]);
      return { pending: pendingRes.count || 0, overdue: overdueRes.count || 0, alerts: alertsRes.count || 0 };
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });

  const { data: signals, isLoading: sigLoading } = usePredictiveSignals();

  if (cmdLoading || sigLoading) {
    return <Skeleton className="h-14 w-full rounded-xl" />;
  }

  const urgencyItems = [
    { label: t('dashboard.attention.pending', 'Pending'), count: cmdData?.pending || 0, icon: Clock, href: "/admin?tab=users", color: "text-amber-500" },
    { label: t('dashboard.attention.overdue', 'Overdue'), count: cmdData?.overdue || 0, icon: AlertTriangle, href: "/applications?filter=overdue", color: "text-red-500" },
    { label: t('dashboard.attention.alerts', 'Alerts'), count: cmdData?.alerts || 0, icon: Shield, href: "/admin/anti-hacking", color: "text-red-500" },
  ];

  const topSignals = (signals || []).slice(0, 3);

  return (
    <div className="flex flex-wrap gap-2">
      {/* Urgency badges */}
      {urgencyItems.map((item) => {
        const Icon = item.icon;
        const isZero = item.count === 0;
        return (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
              "hover:scale-[1.02] active:scale-[0.98]",
              isZero
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-border/30 bg-card/80"
            )}
          >
            {isZero ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Icon className={cn("h-3.5 w-3.5", item.color)} />
            )}
            <span className={cn("text-lg font-bold leading-none", isZero ? "text-emerald-500" : item.color)}>
              {item.count}
            </span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </Link>
        );
      })}

      {/* Predictive signal badges */}
      {topSignals.map((sig) => {
        const Icon = signalIcons[sig.signal_type] || AlertTriangle;
        const isStrong = sig.signal_strength >= 0.8;
        return (
          <div
            key={sig.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
              isStrong
                ? "border-amber-500/40 bg-amber-500/10 animate-pulse"
                : "border-border/20 bg-card/60"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", isStrong ? "text-amber-500" : "text-muted-foreground")} />
            <span className="text-xs font-medium truncate max-w-[80px]">
              {sig.signal_type.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {Math.round(sig.signal_strength * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
