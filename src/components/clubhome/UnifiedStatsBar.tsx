import { MetricCard } from "@/components/admin/shared/MetricCard";
import { MetricCardSkeleton } from "@/components/admin/shared/MetricCardSkeleton";
import { Users, Briefcase, Calendar, MessageSquare, Target, TrendingUp, Building2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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
    <motion.div
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
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
          {/* Subtle hover glow for premium feel */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
          
          <div className="relative">
            <MetricCard
              icon={stat.icon}
              iconColor={stat.iconColor}
              title={stat.titleFallback}
              primaryMetric={stat.value}
              secondaryText={stat.secondaryFallback}
              className="glass-subtle hover:glass transition-all duration-300 border-border/50 hover:border-primary/30"
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};