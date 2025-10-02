import { Layout } from "@/components/Layout";
import { PipelineStage } from "@/components/PipelineStage";
import { JobCard } from "@/components/JobCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Briefcase, Clock } from "lucide-react";

const Dashboard = () => {
  // Mock data for active applications
  const activeApplications = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "TechCorp",
      location: "San Francisco, CA",
      type: "Full-time",
      postedDate: "2 days ago",
      status: "interview" as const,
      currentStage: 2,
      tags: ["React", "TypeScript", "Tailwind CSS"],
    },
    {
      id: 2,
      title: "UI/UX Designer",
      company: "DesignHub",
      location: "Remote",
      type: "Full-time",
      postedDate: "1 week ago",
      status: "screening" as const,
      currentStage: 1,
      tags: ["Figma", "User Research", "Prototyping"],
    },
  ];

  const stages = [
    { title: "Applied", stage: 0 },
    { title: "Screening", stage: 1 },
    { title: "Interview", stage: 2 },
    { title: "Offer", stage: 3 },
  ];

  const stats = [
    {
      title: "Active Applications",
      value: "5",
      icon: Briefcase,
      trend: "+2 this week",
    },
    {
      title: "Interviews Scheduled",
      value: "3",
      icon: Clock,
      trend: "Next: Tomorrow",
    },
    {
      title: "Response Rate",
      value: "68%",
      icon: TrendingUp,
      trend: "+12% this month",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Welcome back, Alex!
          </h1>
          <p className="text-muted-foreground">
            Track your applications and discover new opportunities
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border border-border bg-gradient-card shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.trend}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Active Applications */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Active Applications</h2>
          
          {activeApplications.map((app) => (
            <div key={app.id} className="space-y-4">
              {/* Pipeline Visualization */}
              <Card className="border border-border bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Application Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between px-4">
                    {stages.map((stage, index) => (
                      <PipelineStage
                        key={stage.title}
                        title={stage.title}
                        isActive={stage.stage === app.currentStage}
                        isCompleted={stage.stage < app.currentStage}
                        isLast={index === stages.length - 1}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Job Details */}
              <JobCard
                title={app.title}
                company={app.company}
                location={app.location}
                type={app.type}
                postedDate={app.postedDate}
                status={app.status}
                tags={app.tags}
              />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
