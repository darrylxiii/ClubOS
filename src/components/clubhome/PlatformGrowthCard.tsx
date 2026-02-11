import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Building2, Briefcase, FileText } from "lucide-react";
import { usePlatformGrowth } from "@/hooks/usePlatformGrowth";
import { Skeleton } from "@/components/ui/skeleton";

export function PlatformGrowthCard() {
  const { data: metrics, isLoading } = usePlatformGrowth();

  if (isLoading) {
    return (
      <div className="glass-subtle rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="h-5 w-5" />
            Platform Growth
          </h3>
          <p className="text-sm text-muted-foreground mt-1">30-day performance trends</p>
        </div>
        <div className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="glass-subtle rounded-2xl p-6">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <TrendingUp className="h-5 w-5" />
          Platform Growth
        </h3>
        <p className="text-sm text-muted-foreground mt-1">30-day performance trends</p>
      </div>
        <div className="space-y-6">
          
          {/* User Growth */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">User Growth</span>
              </div>
              <Badge variant={metrics.userGrowth30d > 0 ? "default" : "secondary"}>
                {metrics.userGrowth30d > 0 ? '+' : ''}{metrics.userGrowth30d}%
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics.totalUsers}</span>
              <span className="text-xs text-muted-foreground">
                +{metrics.newUsers7d} in last 7 days
              </span>
            </div>
          </div>

          {/* Company Growth */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Company Growth</span>
              </div>
              <Badge variant={metrics.companyGrowth30d > 0 ? "default" : "secondary"}>
                {metrics.companyGrowth30d > 0 ? '+' : ''}{metrics.companyGrowth30d}%
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics.totalCompanies}</span>
              <span className="text-xs text-muted-foreground">
                +{metrics.newCompanies7d} in last 7 days
              </span>
            </div>
          </div>

          {/* Job Growth */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active Jobs</span>
              </div>
              <Badge variant={metrics.activeJobs > 0 ? "default" : "destructive"}>
                {metrics.activeJobs} open
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics.totalJobs}</span>
              <span className="text-xs text-muted-foreground">
                +{metrics.newJobs30d} in last 30 days
              </span>
            </div>
          </div>

          {/* Application Volume */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Application Volume</span>
              </div>
              <Badge variant="secondary">
                {metrics.newApps30d} in 30 days
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics.totalApplications}</span>
              <span className="text-xs text-muted-foreground">
                +{metrics.newApps7d} in last 7 days
              </span>
            </div>
          </div>

          {/* Active Users */}
          <div className="pt-4 border-t">
            <span className="text-sm font-medium mb-3 block">Active Users</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-green-500/10">
                <p className="text-lg font-bold text-green-500">{metrics.onlineUsers}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-500/10">
                <p className="text-lg font-bold text-blue-500">{metrics.active24h}</p>
                <p className="text-xs text-muted-foreground">24h</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-purple-500/10">
                <p className="text-lg font-bold text-purple-500">{metrics.active7d}</p>
                <p className="text-xs text-muted-foreground">7d</p>
              </div>
            </div>
          </div>

        </div>
    </div>
  );
}
