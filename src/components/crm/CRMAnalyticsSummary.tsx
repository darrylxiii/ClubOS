import { motion } from "framer-motion";
import { useCRMAnalytics } from "@/hooks/useCRMAnalytics";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Euro, TrendingUp, Target } from "lucide-react";

interface CRMAnalyticsSummaryProps {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
}

export function CRMAnalyticsSummary({ dateRange = 'month' }: CRMAnalyticsSummaryProps) {
  const { data, loading } = useCRMAnalytics({ dateRange });

  const stats = [
    {
      label: 'Total Prospects',
      value: data?.overview.totalProspects || 0,
      icon: Users,
      color: 'text-blue-400',
      format: (v: number) => v.toString()
    },
    {
      label: 'Total Revenue',
      value: data?.overview.totalRevenue || 0,
      icon: Euro,
      color: 'text-green-400',
      format: (v: number) => `€${(v / 1000).toFixed(0)}k`
    },
    {
      label: 'Conversion Rate',
      value: data?.overview.conversionRate || 0,
      icon: TrendingUp,
      color: 'text-amber-400',
      format: (v: number) => `${v.toFixed(1)}%`
    },
    {
      label: 'Deals Won',
      value: data?.overview.dealsWon || 0,
      icon: Target,
      color: 'text-purple-400',
      format: (v: number) => v.toString()
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.format(stat.value)}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-muted/30 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
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
