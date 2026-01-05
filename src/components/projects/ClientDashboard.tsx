import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export function ClientDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch real project stats
  const { data: projectStats, isLoading: statsLoading } = useQuery({
    queryKey: ["client-project-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data: projects, error } = await (supabase as any)
        .from("marketplace_projects")
        .select("id, status")
        .eq("client_id", user.id);
      
      if (error) throw error;
      
      const active = projects?.filter((p: any) => p.status === "open" || p.status === "active").length || 0;
      const inProgress = projects?.filter((p: any) => p.status === "active").length || 0;
      const completed = projects?.filter((p: any) => p.status === "completed").length || 0;
      
      return { active, inProgress, completed, total: projects?.length || 0 };
    },
    enabled: !!user?.id,
  });

  // Fetch pending proposals count
  const { data: proposalCount } = useQuery({
    queryKey: ["client-pending-proposals", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      
      // Get all project IDs for this client
      const { data: projects } = await (supabase as any)
        .from("marketplace_projects")
        .select("id")
        .eq("client_id", user.id);
      
      if (!projects?.length) return 0;
      
      const projectIds = projects.map((p: any) => p.id);
      
      const { count, error } = await (supabase as any)
        .from("project_proposals")
        .select("*", { count: "exact", head: true })
        .in("project_id", projectIds)
        .eq("status", "submitted");
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch recent projects
  const { data: recentProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ["client-recent-projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from("marketplace_projects")
        .select("id, title, status, created_at, budget_min, budget_max")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const stats = [
    {
      label: "Active Projects",
      value: statsLoading ? "-" : String(projectStats?.active || 0),
      icon: Briefcase,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Pending Proposals",
      value: String(proposalCount || 0),
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      label: "In Progress",
      value: statsLoading ? "-" : String(projectStats?.inProgress || 0),
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      label: "Completed",
      value: statsLoading ? "-" : String(projectStats?.completed || 0),
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "text-blue-500 bg-blue-500/10";
      case "active": return "text-yellow-500 bg-yellow-500/10";
      case "completed": return "text-green-500 bg-green-500/10";
      case "cancelled": return "text-red-500 bg-red-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Projects</h3>
          {recentProjects && recentProjects.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects/my-projects")}>
              View All
            </Button>
          )}
        </div>
        
        {projectsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recentProjects && recentProjects.length > 0 ? (
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{project.title}</p>
                  <p className="text-sm text-muted-foreground">
                    €{project.budget_min?.toLocaleString()} - €{project.budget_max?.toLocaleString()} • 
                    Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No projects yet. Create your first project to get started!</p>
          </div>
        )}
      </Card>
    </div>
  );
}
