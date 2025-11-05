import { Card } from "@/components/ui/card";
import { Users, Clock, CheckCircle, XCircle, TrendingUp, Timer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ApplicationStatsProps {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  lastSubmission?: string;
}

export function ApplicationStats({ 
  total, 
  pending, 
  approved, 
  rejected, 
  lastSubmission 
}: ApplicationStatsProps) {
  const conversionRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0';
  
  const stats = [
    {
      label: "Total Applications",
      value: total,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
    {
      label: "Pending Review",
      value: pending,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      highlight: pending > 0
    },
    {
      label: "Approved",
      value: approved,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    {
      label: "Rejected",
      value: rejected,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30"
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30"
    },
    {
      label: "Last Submission",
      value: lastSubmission ? formatDistanceToNow(new Date(lastSubmission), { addSuffix: true }) : 'None',
      icon: Timer,
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-900/30"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card 
          key={stat.label} 
          className={`p-4 ${stat.highlight ? 'ring-2 ring-orange-500/50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-2xl font-bold mt-1">
                {stat.value}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
