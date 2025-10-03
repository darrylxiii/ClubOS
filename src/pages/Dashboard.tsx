import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { PipelineStage } from "@/components/PipelineStage";
import { JobCard } from "@/components/JobCard";
import { StagePreparation } from "@/components/StagePreparation";
import { AIChat } from "@/components/AIChat";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { TalentStrategist } from "@/components/TalentStrategist";
import { PendingFeedbackTasks } from "@/components/PendingFeedbackTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  Briefcase, 
  Building2, 
  Users, 
  Gift,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Clock,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationItems = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Jobs", icon: Briefcase, path: "/jobs" },
  { name: "Applications", icon: FileText, path: "/applications" },
  { name: "Companies", icon: Building2, path: "/companies" },
  { name: "Referrals", icon: Gift, path: "/referrals" },
];

const Dashboard = () => {
  const [selectedApplication, setSelectedApplication] = useState<number>(1);
  const [firstName, setFirstName] = useState<string>("");
  const [strategists, setStrategists] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (data?.full_name) {
        const name = data.full_name.split(' ')[0];
        setFirstName(name);
      }
    };

    const fetchStrategists = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('talent_strategists')
          .select('*')
          .order('full_name');

        if (error) throw error;
        if (data) setStrategists(data);
      } catch (error) {
        console.error('Error fetching strategists:', error);
      }
    };

    fetchProfile();
    fetchStrategists();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

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
      strategistName: "Darryl Mehilal",
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
      strategistName: "Jasper Biezepol",
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
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <span className="font-black text-lg">TQC</span>
        <div className="w-10" />
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-border">
          <span className="font-black text-2xl">qc</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 px-3"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {firstName ? firstName[0].toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{firstName || "User"}</p>
                  <p className="text-xs text-muted-foreground">View profile</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 lg:py-12 mt-16 lg:mt-0">
          {/* Header */}
          <div className="space-y-4 mb-12">
            <p className="text-caps text-muted-foreground">Welcome back{firstName ? `, ${firstName}` : ''}</p>
            <h1 className="text-hero">
              Your Elite
              <br />
              Pipeline
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              "Success is a luxury reserved for those who turn ambition into action"
            </p>
          </div>

          {/* Profile Completion, Feedback Tasks and Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            {/* Left column - Profile Completion & Feedback Tasks */}
            <div className="lg:col-span-1 space-y-6">
              <ProfileCompletion />
              <PendingFeedbackTasks />
            </div>
            
            {/* Stats Grid - Takes 2 columns on desktop */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="border-2 border-foreground p-8 hover:bg-foreground hover:text-background transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-caps">{stat.title}</p>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-5xl font-black mb-2">{stat.value}</div>
                    <p className="text-sm font-bold">{stat.trend}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Applications */}
          <div className="space-y-6 mb-12">
            <div className="flex items-center justify-between border-b-2 border-foreground pb-4">
              <h2 className="text-3xl font-black uppercase">Elite Opportunities Pipeline</h2>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Click stages for guides</span>
            </div>
            
            {activeApplications.map((app) => {
              const strategist = strategists.find(s => s.full_name === app.strategistName);
              
              return (
                <div key={app.id} className="space-y-4">
                  {/* Pipeline Visualization */}
                  <Card className="border-2 border-foreground bg-background">
                    <CardHeader>
                      <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                        <div className="w-1 h-6 bg-foreground"></div>
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

                  {/* Dedicated Talent Strategist */}
                  {strategist && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Dedicated Talent Strategist</h3>
                      <TalentStrategist strategist={strategist} compact />
                    </div>
                  )}

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
              );
            })}
          </div>

          {/* AI Chat Section */}
          <div className="border-t-2 border-foreground pt-12">
            <h2 className="text-3xl font-black uppercase mb-6">AI Assistant</h2>
            <AIChat />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 flex items-center justify-around">
        {navigationItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
