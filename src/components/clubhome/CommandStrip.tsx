import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Clock, AlertTriangle, Building2, Shield, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CommandItem {
  label: string;
  count: number;
  icon: typeof Clock;
  href: string;
  colorClass: string;
  bgClass: string;
}

export const CommandStrip = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-command-strip'],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const [pendingRes, overdueRes, atRiskRes, alertsRes] = await Promise.all([
        // Pending approvals: profiles without completed onboarding
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .is('onboarding_completed_at', null),
        // Overdue: applications stuck > 7 days without update
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .in('status', ['applied', 'screening', 'interview'])
          .lt('updated_at', sevenDaysAgo.toISOString()),
        // At-risk partners: count partner roles as baseline
        supabase
          .from('user_roles')
          .select('user_id', { count: 'exact', head: true })
          .eq('role', 'partner'),
        // System alerts from security events (last 24h)
        supabase
          .from('security_events')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .in('severity', ['critical', 'high']),
      ]);

      return {
        pending: pendingRes.count || 0,
        overdue: overdueRes.count || 0,
        atRisk: 0, // Will use partner engagement data
        alerts: alertsRes.count || 0,
      };
    },
    staleTime: 60000,
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-14 min-w-[140px] flex-1 rounded-xl" />
        ))}
      </div>
    );
  }

  const items: CommandItem[] = [
    {
      label: "Pending",
      count: data?.pending || 0,
      icon: Clock,
      href: "/admin?tab=users",
      colorClass: data?.pending ? "text-amber-500" : "text-emerald-500",
      bgClass: data?.pending ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Overdue",
      count: data?.overdue || 0,
      icon: AlertTriangle,
      href: "/applications?filter=overdue",
      colorClass: data?.overdue ? "text-red-500" : "text-emerald-500",
      bgClass: data?.overdue ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "At Risk",
      count: data?.atRisk || 0,
      icon: Building2,
      href: "/admin?tab=companies",
      colorClass: data?.atRisk ? "text-orange-500" : "text-emerald-500",
      bgClass: data?.atRisk ? "bg-orange-500/10 border-orange-500/20" : "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Alerts",
      count: data?.alerts || 0,
      icon: Shield,
      href: "/admin/anti-hacking",
      colorClass: data?.alerts ? "text-red-500" : "text-emerald-500",
      bgClass: data?.alerts ? "bg-red-500/10 border-red-500/20" : "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {items.map((item) => {
        const Icon = item.icon;
        const isZero = item.count === 0;
        return (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex items-center gap-3 min-w-[140px] flex-1 px-4 py-3 rounded-xl border transition-all",
              "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
              item.bgClass,
            )}
          >
            {isZero ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <Icon className={cn("h-4 w-4 shrink-0", item.colorClass)} />
            )}
            <div className="min-w-0">
              <div className={cn("text-xl font-bold leading-none", item.colorClass)}>
                {item.count}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {item.label}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
