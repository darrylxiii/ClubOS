import { MetricCard } from "@/components/admin/shared/MetricCard";
import { MetricCardSkeleton } from "@/components/admin/shared/MetricCardSkeleton";
import { Users, Briefcase, Calendar, MessageSquare, Target, TrendingUp, Building2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface StatConfig {
  icon: typeof Users;
  iconColor: 'success' | 'warning' | 'critical' | 'info' | 'neutral';
  titleKey: string;
  titleFallback: string;
  value: number;
  secondaryKey: string;
  secondaryFallback: string;
  link?: string;
  ariaLabel?: string;
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

// Animated counter component
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }
    
    let startTime: number;
    let animationId: number;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(eased * value));
      
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [value, duration]);
  
  return <>{displayValue}</>;
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
            link: '/admin/users',
            ariaLabel: `${stats.totalUsers || 0} total users. Click to view all users.`,
          },
          {
            icon: Building2,
            iconColor: 'info',
            titleKey: 'common:branding.name',
            titleFallback: 'Companies',
            value: stats.totalCompanies || 0,
            secondaryKey: 'common:branding.tagline',
            secondaryFallback: 'Registered',
            link: '/admin/companies',
            ariaLabel: `${stats.totalCompanies || 0} registered companies. Click to view all companies.`,
          },
          {
            icon: Briefcase,
            iconColor: 'success',
            titleKey: 'common:home.stats.activeJobs',
            titleFallback: 'Active Jobs',
            value: stats.totalJobs || 0,
            secondaryKey: 'common:jobs.posted',
            secondaryFallback: 'Posted',
            link: '/admin/jobs',
            ariaLabel: `${stats.totalJobs || 0} active jobs. Click to view all jobs.`,
          },
          {
            icon: AlertCircle,
            iconColor: 'warning',
            titleKey: 'common:home.stats.pendingReviews',
            titleFallback: 'Pending',
            value: stats.pendingReviews || 0,
            secondaryKey: 'common:status.pending',
            secondaryFallback: 'Reviews',
            link: '/admin/reviews',
            ariaLabel: `${stats.pendingReviews || 0} pending reviews. Click to view pending items.`,
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
            link: '/jobs?filter=company',
            ariaLabel: `${stats.activeJobs || 0} active jobs. Click to view your jobs.`,
          },
          {
            icon: Users,
            iconColor: 'success',
            titleKey: 'common:home.stats.applications',
            titleFallback: 'Applications',
            value: stats.totalApplications || 0,
            secondaryKey: 'common:applications.status.applied',
            secondaryFallback: 'Applied',
            link: '/applications',
            ariaLabel: `${stats.totalApplications || 0} applications received. Click to view all applications.`,
          },
          {
            icon: Calendar,
            iconColor: 'info',
            titleKey: 'common:home.stats.interviews',
            titleFallback: 'Interviews',
            value: stats.interviews || 0,
            secondaryKey: 'common:actions.scheduleInterview',
            secondaryFallback: 'Scheduled',
            link: '/meetings',
            ariaLabel: `${stats.interviews || 0} interviews scheduled. Click to view meetings.`,
          },
          {
            icon: TrendingUp,
            iconColor: 'success',
            titleKey: 'common:branding.tagline',
            titleFallback: 'Followers',
            value: stats.followers || 0,
            secondaryKey: 'common:status.active',
            secondaryFallback: 'Following',
            link: '/company/followers',
            ariaLabel: `${stats.followers || 0} followers. Click to view company followers.`,
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
            link: '/applications',
            ariaLabel: `${stats.applications || 0} active applications. Click to view your applications.`,
          },
          {
            icon: Target,
            iconColor: 'success',
            titleKey: 'common:home.stats.matches',
            titleFallback: 'Matches',
            value: stats.matches || 0,
            secondaryKey: 'common:jobs.matchScore',
            secondaryFallback: 'Match Score',
            link: '/jobs?filter=matches',
            ariaLabel: `${stats.matches || 0} job matches. Click to view matching jobs.`,
          },
          {
            icon: Calendar,
            iconColor: 'info',
            titleKey: 'common:home.stats.interviews',
            titleFallback: 'Interviews',
            value: stats.interviews || 0,
            secondaryKey: 'common:actions.scheduleInterview',
            secondaryFallback: 'Scheduled',
            link: '/meetings',
            ariaLabel: `${stats.interviews || 0} interviews scheduled. Click to view your meetings.`,
          },
          {
            icon: MessageSquare,
            iconColor: 'neutral',
            titleKey: 'common:home.stats.messages',
            titleFallback: 'Messages',
            value: stats.messages || 0,
            secondaryKey: 'common:notifications.unread',
            secondaryFallback: 'Unread',
            link: '/messages',
            ariaLabel: `${stats.messages || 0} unread messages. Click to view your messages.`,
          },
        ];
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" role="status" aria-label="Loading statistics">
        {[...Array(4)].map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const statsConfig = getStatsConfig();

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      role="region"
      aria-label="Dashboard statistics"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
          },
        },
      }}
    >
      {statsConfig.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: index * 0.08,
            duration: 0.4,
            ease: "easeOut"
          }}
          whileHover={{ 
            scale: 1.02, 
            transition: { duration: 0.2 } 
          }}
          className="relative group"
        >
          <Link 
            to={stat.link || '#'} 
            className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-xl"
            aria-label={stat.ariaLabel}
          >
            <MetricCard
              icon={stat.icon}
              iconColor={stat.iconColor}
              title={stat.titleFallback}
              primaryMetric={stat.value}
              secondaryText={stat.secondaryFallback}
              className="glass-subtle hover:glass transition-all duration-300 border-border/50 hover:border-primary/30 cursor-pointer"
            />
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};
