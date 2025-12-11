import { motion } from 'framer-motion';
import { 
  Mail, 
  Users, 
  Eye, 
  MousePointer, 
  MessageSquare, 
  AlertTriangle,
  TrendingUp,
  Zap,
  Star
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InstantlyStats } from '@/hooks/useInstantlyData';

interface InstantlyStatsOverviewProps {
  stats: InstantlyStats | null;
  loading: boolean;
}

export function InstantlyStatsOverview({ stats, loading }: InstantlyStatsOverviewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Campaigns',
      value: stats.totalCampaigns,
      subValue: `${stats.activeCampaigns} active`,
      icon: Zap,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Leads',
      value: stats.totalLeads.toLocaleString(),
      subValue: `${stats.totalContacted.toLocaleString()} contacted`,
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Emails Sent',
      value: stats.totalSent.toLocaleString(),
      icon: Mail,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Open Rate',
      value: `${stats.openRate.toFixed(1)}%`,
      subValue: `${stats.totalOpened.toLocaleString()} opened`,
      icon: Eye,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Click Rate',
      value: `${stats.clickRate.toFixed(1)}%`,
      subValue: `${stats.totalClicked.toLocaleString()} clicked`,
      icon: MousePointer,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Reply Rate',
      value: `${stats.replyRate.toFixed(1)}%`,
      subValue: `${stats.totalReplied.toLocaleString()} replies`,
      icon: MessageSquare,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Bounce Rate',
      value: `${stats.bounceRate.toFixed(1)}%`,
      subValue: `${stats.totalBounced.toLocaleString()} bounced`,
      icon: AlertTriangle,
      color: stats.bounceRate > 5 ? 'text-red-500' : 'text-muted-foreground',
      bgColor: stats.bounceRate > 5 ? 'bg-red-500/10' : 'bg-muted/10',
    },
    {
      label: 'Interested',
      value: stats.totalInterested.toLocaleString(),
      subValue: `${stats.interestRate.toFixed(1)}% rate`,
      icon: Star,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Meetings',
      value: stats.totalMeetingBooked.toLocaleString(),
      subValue: `${stats.totalMeetingCompleted} completed`,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4">
      {statCards.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="p-4 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30 hover:border-border/50 transition-all">
            <div className={`inline-flex p-2 rounded-lg ${stat.bgColor} mb-2`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            {stat.subValue && (
              <div className="text-xs text-muted-foreground/70 mt-1">{stat.subValue}</div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}