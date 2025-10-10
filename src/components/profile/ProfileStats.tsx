import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Briefcase, Award, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileStatsProps {
  stats: {
    profileViews: number;
    connections: number;
    applicationsActive: number;
    achievementsUnlocked: number;
    engagementRate?: number;
  };
  className?: string;
}

export function ProfileStats({ stats, className }: ProfileStatsProps) {
  const statItems = [
    {
      icon: Eye,
      label: "Profile Views",
      value: stats.profileViews,
      color: "text-blue-500"
    },
    {
      icon: Users,
      label: "Connections",
      value: stats.connections,
      color: "text-green-500"
    },
    {
      icon: Briefcase,
      label: "Active Applications",
      value: stats.applicationsActive,
      color: "text-purple-500"
    },
    {
      icon: Award,
      label: "Achievements",
      value: stats.achievementsUnlocked,
      color: "text-yellow-500"
    },
  ];

  if (stats.engagementRate !== undefined) {
    statItems.push({
      icon: TrendingUp,
      label: "Engagement Rate",
      value: stats.engagementRate,
      color: "text-primary"
    });
  }

  return (
    <Card className={cn("glass-card", className)}>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((item, index) => (
            <div 
              key={index}
              className="glass-subtle rounded-xl p-4 hover:glass transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={cn("p-2 rounded-lg bg-background/50", item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
                {item.label === "Engagement Rate" && (
                  <Badge variant="secondary" className="text-xs">
                    {item.value}%
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {item.label !== "Engagement Rate" && (
                  <p className="text-2xl font-bold">{item.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
