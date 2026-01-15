import { MetricCard } from "@/components/admin/shared/MetricCard";
import { MetricCardSkeleton } from "@/components/admin/shared/MetricCardSkeleton";
import { Users, Briefcase, Calendar, MessageSquare, Target, TrendingUp, Building2, AlertCircle } from "lucide-react";

interface StatConfig {
  icon: typeof Users;
  iconColor: 'success' | 'warning' | 'critical' | 'info' | 'neutral';
  titleKey: string;
  titleFallback: string;
  value: number;
  secondaryKey: string;
  secondaryFallback: string;
}

interface UnifiedStatsBarProps {
  role: string;
  stats: {
    totalUsers?: number;
    totalCompanies?: number;
    totalJobs?: number;
    pendingReviews?: number;
    activeJobs?: number;
    totalApplications?: number;
    interviews?: number;
    followers?: number;
    applications?: number;
    matches?: number;
    messages?: number;
  };
  loading?: boolean;
}

export const UnifiedStatsBar = ({ role, stats, loading = false }: UnifiedStatsBarProps) => {
  const getStatsConfig = (): StatConfig[] => {
    switch (role) {
      case 'admin':
        return [
          {
            icon: Users,
            iconColor: 'info',
            titleKey: 'common:home.stats.totalCandidates',
            titleFallback: 'Total Users',
            value: stats.totalUsers || 0,
            secondaryKey: 'common:status.active',
            secondaryFallback: 'Active',
          },
          {
            icon: Building2,
            iconColor: 'info',
            titleKey: 'common:branding.name',
            titleFallback: 'Companies',
            value: stats.totalCompanies || 0,
            secondaryKey: 'common:branding.tagline',
            secondaryFallback: 'Registered',
          },
          {
            icon: Briefcase,
            iconColor: 'success',
            titleKey: 'common:home.stats.activeJobs',
            titleFallback: 'Active Jobs',
            value: stats.totalJobs || 0,
            secondaryKey: 'common:jobs.posted',
            secondaryFallback: 'Posted',
          },
          {
            icon: AlertCircle,
            iconColor: 'warning',
            titleKey: 'common:home.stats.pendingReviews',
            titleFallback: 'Pending',
            value: stats.pendingReviews || 0,
            secondaryKey: 'common:status.pending',
            secondaryFallback: 'Reviews',
          },
        ];
      
      case 'partner':
        return [
          {
            icon: Briefcase,
            iconColor: 'info',
            titleKey: 'common:home.stats.activeJobs',
            titleFallback: 'Active Jobs',
            value: stats.activeJobs || 0,
            secondaryKey: 'common:jobs.posted',
            secondaryFallback: 'Posted',
          },
          {
            icon: Users,
            iconColor: 'success',
            titleKey: 'common:home.stats.applications',
            titleFallback: 'Applications',
            value: stats.totalApplications || 0,
            secondaryKey: 'common:applications.status.applied',
            secondaryFallback: 'Applied',
          },
          {
            icon: Calendar,
            iconColor: 'info',
            titleKey: 'common:home.stats.interviews',
            titleFallback: 'Interviews',
            value: stats.interviews || 0,
            secondaryKey: 'common:actions.scheduleInterview',
            secondaryFallback: 'Scheduled',
          },
          {
            icon: TrendingUp,
            iconColor: 'success',
            titleKey: 'common:branding.tagline',
            titleFallback: 'Followers',
            value: stats.followers || 0,
            secondaryKey: 'common:status.active',
            secondaryFallback: 'Following',
          },
        ];
      
      case 'user':
      case 'strategist':
      default:
        return [
          {
            icon: Briefcase,
            iconColor: 'info',
            titleKey: 'common:home.stats.applications',
            titleFallback: 'Applications',
            value: stats.applications || 0,
            secondaryKey: 'common:status.active',
            secondaryFallback: 'Active',
          },
          {
            icon: Target,
            iconColor: 'success',
            titleKey: 'common:home.stats.matches',
            titleFallback: 'Matches',
            value: stats.matches || 0,
            secondaryKey: 'common:jobs.matchScore',
            secondaryFallback: 'Match Score',
          },
          {
            icon: Calendar,
            iconColor: 'info',
            titleKey: 'common:home.stats.interviews',
            titleFallback: 'Interviews',
            value: stats.interviews || 0,
            secondaryKey: 'common:actions.scheduleInterview',
            secondaryFallback: 'Scheduled',
          },
          {
            icon: MessageSquare,
            iconColor: 'neutral',
            titleKey: 'common:home.stats.messages',
            titleFallback: 'Messages',
            value: stats.messages || 0,
            secondaryKey: 'common:notifications.unread',
            secondaryFallback: 'Unread',
          },
        ];
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const statsConfig = getStatsConfig();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statsConfig.map((stat, index) => (
        <div
          key={index}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <MetricCard
            icon={stat.icon}
            iconColor={stat.iconColor}
            title={stat.titleFallback}
            primaryMetric={stat.value}
            secondaryText={stat.secondaryFallback}
            className="glass-subtle hover:glass transition-all duration-300"
          />
        </div>
      ))}
    </div>
  );
};
