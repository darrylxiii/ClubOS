import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Users, User, Sparkles, RefreshCw, BarChart3, DollarSign, ClipboardCheck, MessageSquare, Plus } from "lucide-react";
import { UserRole } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { CEOHealthScore } from "./CEOHealthScore";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { usePartnerGreetingContext } from "@/hooks/usePartnerGreetingContext";

interface ClubHomeHeaderProps {
  role: UserRole;
}

export const ClubHomeHeader = ({ role }: ClubHomeHeaderProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, loading: profileLoading } = useProfile({
    userId: user?.id,
    autoLoad: true,
  });
  const partnerCtx = usePartnerGreetingContext(role);

  const getRoleIcon = () => {
    switch (role) {
      case "admin": return <Shield className="h-3.5 w-3.5" />;
      case "partner": return <Users className="h-3.5 w-3.5" />;
      case "strategist": return <Sparkles className="h-3.5 w-3.5" />;
      default: return <User className="h-3.5 w-3.5" />;
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "admin": return t("common:roles.admin", "Administrator");
      case "partner": return t("common:roles.partner", "Partner");
      case "strategist": return t("common:roles.strategist", "Strategist");
      default: return t("common:roles.candidate", "Candidate");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("common:home.greeting.morning", "Good morning");
    if (hour < 18) return t("common:home.greeting.afternoon", "Good afternoon");
    return t("common:home.greeting.evening", "Good evening");
  };

  const getFirstName = () => {
    if (profile?.full_name) return profile.full_name.split(" ")[0];
    if (user?.email) {
      const n = user.email.split("@")[0];
      return n.charAt(0).toUpperCase() + n.slice(1);
    }
    return "there";
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-border/20 bg-card/80 p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  const refreshKPIs = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-kpi-scorecard"] });
    queryClient.invalidateQueries({ queryKey: ["revenue-analytics"] });
  };

  return (
    <div className="rounded-2xl border border-border/20 bg-card/80 p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Greeting + role */}
        <div className="flex items-center gap-3 min-w-0">
          {profileLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <h1 className="text-base font-semibold text-foreground truncate">
              {getGreeting()}, {getFirstName()}
            </h1>
          )}
          <Badge variant="secondary" className="gap-1 hidden sm:inline-flex text-xs">
            {getRoleIcon()}
            {getRoleLabel()}
          </Badge>
        </div>

        {/* Center: Health Score (admin only) */}
        {role === "admin" && (
          <div className="hidden sm:flex">
            <CEOHealthScore />
          </div>
        )}

        {/* Center: Partner context summary */}
        {role === "partner" && !partnerCtx.loading && (
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            {partnerCtx.pendingReviews > 0 && (
              <span className="flex items-center gap-1">
                <ClipboardCheck className="h-3 w-3 text-amber-500" />
                {partnerCtx.pendingReviews} {t("common:to_review", "to review")}
              </span>
            )}
            {partnerCtx.todayInterviews > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3 text-primary" />
                {partnerCtx.todayInterviews} {t("common:interviews_today", "today")}
              </span>
            )}
            {partnerCtx.activeJobs > 0 && (
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-emerald-500" />
                {partnerCtx.activeJobs} {t("common:active_roles", "active roles")}
              </span>
            )}
          </div>
        )}

        {/* Right: Admin quick actions */}
        {role === "admin" && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshKPIs} title={t("refresh_kpis", "Refresh KPIs")}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to="/admin/finance" title={t("finance", "Finance")}>
                <DollarSign className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to="/admin/global-analytics" title={t("analytics", "Analytics")}>
                <BarChart3 className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {/* Right: Partner quick actions */}
        {role === "partner" && (
          <div className="flex items-center gap-1" role="toolbar" aria-label="Quick actions">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to="/company-jobs" title={t("post_role", "Post Role")}>
                <Plus className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to="/partner/hub?tab=analytics" title={t("analytics", "Analytics")}>
                <BarChart3 className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link to="/messages" title={t("messages", "Messages")}>
                <MessageSquare className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
