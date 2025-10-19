import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Euro, Award, TrendingUp } from "lucide-react";

interface ReferralStatsProps {
  totalReferrals: number;
  activeReferrals: number;
  successfulHires: number;
  totalEarnings: number;
  potentialEarnings: number;
}

export const ReferralStats = ({
  totalReferrals,
  activeReferrals,
  successfulHires,
  totalEarnings,
  potentialEarnings,
}: ReferralStatsProps) => {
  const successRate = totalReferrals > 0 
    ? Math.round((successfulHires / totalReferrals) * 100) 
    : 0;

  const stats = [
    {
      title: "Total Referrals",
      value: totalReferrals.toString(),
      icon: Users,
      description: `${activeReferrals} active pipelines`,
      trend: activeReferrals > 0 ? '+' : '',
    },
    {
      title: "Earnings",
      value: `€${totalEarnings.toLocaleString()}`,
      icon: Euro,
      description: `€${potentialEarnings.toLocaleString()} potential`,
      trend: potentialEarnings > 0 ? '+' : '',
    },
    {
      title: "Success Rate",
      value: `${successRate}%`,
      icon: Award,
      description: `${successfulHires} successful hires`,
      trend: successfulHires > 0 ? '+' : '',
    },
    {
      title: "Impact",
      value: `${successfulHires * 2}`,
      icon: TrendingUp,
      description: "Lives impacted",
      trend: successfulHires > 0 ? '+' : '',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="glass-card hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-1">
                <div className="text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
                {stat.trend && (
                  <span className="text-sm text-success font-medium">{stat.trend}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
