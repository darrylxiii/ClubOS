import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users, Clock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ClientDashboard() {
  const navigate = useNavigate();

  const stats = [
    {
      label: "Active Projects",
      value: "3",
      icon: Briefcase,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Pending Proposals",
      value: "12",
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      label: "In Progress",
      value: "2",
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      label: "Completed",
      value: "8",
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Ready to hire top talent?</h3>
            <p className="text-sm text-muted-foreground">
              Post a project and get matched with qualified freelancers in minutes
            </p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => navigate("/projects/new")}>
            <Plus className="h-4 w-4" />
            Post New Project
          </Button>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Projects</h3>
        <div className="text-center py-12 text-muted-foreground">
          <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No projects yet. Create your first project to get started!</p>
        </div>
      </Card>
    </div>
  );
}
