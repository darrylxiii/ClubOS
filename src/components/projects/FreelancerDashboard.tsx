import { FreelanceProfile } from "@/types/projects";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Briefcase, 
  Star, 
  DollarSign,
  Clock,
  CheckCircle2
} from "lucide-react";

interface FreelancerDashboardProps {
  freelanceProfile: FreelanceProfile | null;
}

export function FreelancerDashboard({ freelanceProfile }: FreelancerDashboardProps) {
  if (!freelanceProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading your freelance dashboard...</p>
      </div>
    );
  }

  const stats = [
    {
      label: "Active Projects",
      value: freelanceProfile.active_projects_count,
      icon: Briefcase,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Completed Projects",
      value: freelanceProfile.total_completed_projects,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Average Rating",
      value: freelanceProfile.avg_project_rating?.toFixed(1) || "N/A",
      icon: Star,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      label: "Total Earnings",
      value: `€${freelanceProfile.total_project_earnings.toLocaleString()}`,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              {stat.label === "Average Rating" && stat.value !== "N/A" && (
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Top 10%
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold mb-1">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Profile Completion */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Profile Strength</h3>
            <p className="text-sm text-muted-foreground">Complete your profile to get more matches</p>
          </div>
          <Badge>85%</Badge>
        </div>
        <Progress value={85} className="mb-4" />
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Portfolio items</span>
            <span className="font-medium">{freelanceProfile.portfolio_items?.length || 0}/5</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Skills listed</span>
            <span className="font-medium">12/15</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Availability set</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        </div>
      </Card>

      {/* Performance Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Insights</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Proposal Win Rate</span>
                <span className="text-sm font-medium">42%</span>
              </div>
              <Progress value={42} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">On-Time Delivery</span>
                <span className="text-sm font-medium">95%</span>
              </div>
              <Progress value={95} className="[&>div]:bg-green-500" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Client Satisfaction</span>
                <span className="text-sm font-medium">
                  {freelanceProfile.avg_project_rating?.toFixed(1) || "N/A"}/5.0
                </span>
              </div>
              <Progress 
                value={(freelanceProfile.avg_project_rating || 0) * 20} 
                className="[&>div]:bg-yellow-500" 
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
