import { Card, CardContent } from "@/components/ui/card";
import { Euro, TrendingUp, Briefcase, Target } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { ReferralStats } from "@/hooks/useReferralSystem";
import { motion } from "framer-motion";

interface ReferralEarningsOverviewProps {
  stats: ReferralStats;
  loading?: boolean;
}

export function ReferralEarningsOverview({ stats, loading }: ReferralEarningsOverviewProps) {
  const cards = [
    {
      title: "Total Revenue Generated",
      value: formatCurrency(stats.totalRevenueGenerated),
      icon: Euro,
      description: "Placement fees from your referrals",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Your Earnings",
      value: formatCurrency(stats.yourEarnings),
      icon: TrendingUp,
      description: "Realized earnings (paid + pending)",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Projected Earnings",
      value: formatCurrency(stats.projectedEarnings),
      icon: Target,
      description: "Based on pipeline probabilities",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Active Pipelines",
      value: stats.activePipelines.toString(),
      icon: Briefcase,
      description: `${stats.companiesCount} companies, ${stats.jobsCount} jobs`,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted/50 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="glass-card hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
