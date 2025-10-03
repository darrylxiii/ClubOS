import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PipelineStage } from "@/components/PipelineStage";
import { JobCard } from "@/components/JobCard";
import { StagePreparation } from "@/components/StagePreparation";
import { AIChat } from "@/components/AIChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Briefcase, Clock, Award } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const [selectedApplication, setSelectedApplication] = useState<number>(1);

  // Mock data for active applications
  const activeApplications = [
    {
      id: 1,
      title: "Chief Technology Officer",
      company: "Stealth Startup",
      location: "Undisclosed",
      type: "Executive",
      postedDate: "3 days ago",
      status: "interview" as const,
      currentStage: 2,
      tags: ["Leadership", "AI/ML", "Strategy"],
      matchScore: 94,
    },
    {
      id: 2,
      title: "VP of Product",
      company: "Elite Tech Fund",
      location: "Remote",
      type: "Executive",
      postedDate: "1 week ago",
      status: "screening" as const,
      currentStage: 1,
      tags: ["Product Strategy", "Growth", "Innovation"],
      matchScore: 87,
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
      title: "Elite Opportunities",
      value: "5",
      icon: Briefcase,
      trend: "+2 exclusive roles",
    },
    {
      title: "Executive Interviews",
      value: "3",
      icon: Clock,
      trend: "Next: Tomorrow 2PM",
    },
    {
      title: "Success Rate",
      value: "92%",
      icon: Award,
      trend: "Top 5% of candidates",
    },
  ];

  const handleStageClick = (appId: number, stageIndex: number) => {
    setSelectedApplication(appId);
    toast.success("Stage Information", {
      description: "Viewing preparation materials for this stage.",
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-accent blur-3xl opacity-20 rounded-full"></div>
          <h1 className="text-4xl font-bold mb-2 relative">
            Welcome back, <span className="text-accent">Alex</span>
          </h1>
          <p className="text-muted-foreground italic">
            "Success is a luxury reserved for those who turn ambition into action"
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border border-accent/20 bg-gradient-card shadow-glow hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.title}
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-accent/10">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1 bg-gradient-accent bg-clip-text text-transparent">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.trend}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Active Applications */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Elite Opportunities Pipeline</h2>
            <span className="text-xs text-muted-foreground italic">Click stages for preparation guides</span>
          </div>
          
          {activeApplications.map((app) => (
            <div key={app.id} className="space-y-4">
              {/* Pipeline Visualization */}
              <Card className="border border-accent/20 bg-gradient-card shadow-glow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-accent rounded-full"></div>
                    Application Progress - {app.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between px-4 mb-6">
                    {stages.map((stage, index) => (
                      <PipelineStage
                        key={stage.title}
                        title={stage.title}
                        isActive={stage.stage === app.currentStage}
                        isCompleted={stage.stage < app.currentStage}
                        isLast={index === stages.length - 1}
                        onClick={() => handleStageClick(app.id, stage.stage)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Stage Preparation - Show for current stage */}
              {selectedApplication === app.id && (
                <StagePreparation stage={app.status} />
              )}

              {/* Job Details */}
              <JobCard
                title={app.title}
                company={app.company}
                location={app.location}
                type={app.type}
                postedDate={app.postedDate}
                status={app.status}
                tags={app.tags}
                matchScore={app.matchScore}
              />
            </div>
          ))}
        </div>

        {/* AI Chat Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">AI Assistant</h2>
          <AIChat />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
