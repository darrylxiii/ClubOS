import { motion } from 'framer-motion';
import { Users, TrendingUp, AlertTriangle, Clock, MessageSquare, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Stats {
  totalCandidates: number;
  healthyRelationships: number;
  atRiskRelationships: number;
  avgResponseRate: number;
  avgEngagement: number;
}

interface PartnerRelationshipStatsProps {
  stats: Stats;
  loading?: boolean;
}

export function PartnerRelationshipStats({ stats, loading }: PartnerRelationshipStatsProps) {
  const statCards = [
    {
      label: 'Total Candidates',
      value: stats.totalCandidates,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'Healthy Relationships',
      value: stats.healthyRelationships,
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      label: 'At Risk',
      value: stats.atRiskRelationships,
      icon: AlertTriangle,
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    {
      label: 'Avg Response Rate',
      value: `${stats.avgResponseRate}%`,
      icon: MessageSquare,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
    {
      label: 'Avg Engagement',
      value: `${stats.avgEngagement}/10`,
      icon: Target,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-10 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <Icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
