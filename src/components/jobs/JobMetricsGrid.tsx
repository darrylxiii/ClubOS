import { Card, CardContent } from "@/components/ui/card";
import { Users, Eye, Calendar, Clock, TrendingUp, Target } from "lucide-react";

interface JobMetricsGridProps {
  applicants: number;
  views: number;
  daysOpen: number;
  timeToHire: string;
  matchScore?: number;
}

export function JobMetricsGrid({
  applicants,
  views,
  daysOpen,
  timeToHire,
  matchScore
}: JobMetricsGridProps) {
  const metrics = [
    {
      label: "Applicants",
      value: applicants,
      icon: Users,
      color: "from-blue-500/20 to-cyan-500/20",
      border: "border-blue-500/30"
    },
    {
      label: "Days Open",
      value: daysOpen,
      icon: Calendar,
      color: "from-purple-500/20 to-violet-500/20",
      border: "border-purple-500/30"
    },
    {
      label: "Time to Hire",
      value: timeToHire,
      icon: Clock,
      color: "from-accent/20 to-primary/20",
      border: "border-accent/30"
    },
    {
      label: "Profile Views",
      value: views,
      icon: Eye,
      color: "from-green-500/20 to-emerald-500/20",
      border: "border-green-500/30"
    }
  ];

  if (matchScore) {
    metrics.push({
      label: "Match Score",
      value: `${matchScore}%`,
      icon: Target,
      color: "from-chart-2/20 to-chart-1/20",
      border: "border-chart-2/30"
    } as any);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <Card
            key={metric.label}
            className={`border-2 ${metric.border} bg-gradient-to-br ${metric.color} hover-scale`}
          >
            <CardContent className="p-4 text-center space-y-2">
              <Icon className="w-5 h-5 mx-auto text-foreground" />
              <div className="text-2xl font-black text-foreground">
                {metric.value}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {metric.label}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
