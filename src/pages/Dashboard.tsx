import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase, 
  Clock, 
  Award, 
  TrendingUp, 
  Users, 
  Calendar,
  ArrowRight,
  CheckCircle2,
  Circle
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const [firstName, setFirstName] = useState<string>("");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, email')
        .eq('id', user.id)
        .single();

      if (data?.full_name) {
        setFirstName(data.full_name.split(' ')[0]);
        
        // Calculate profile completion
        let completion = 0;
        if (data.avatar_url) completion += 25;
        if (data.full_name) completion += 25;
        if (data.email) completion += 25;
        // Add more checks as needed
        setProfileCompletion(completion);
      }
    };

    fetchProfile();
  }, [user]);

  const quickActions = [
    { label: "Browse Elite Roles", icon: Briefcase, link: "/jobs", color: "from-primary to-accent" },
    { label: "Schedule Meeting", icon: Calendar, link: "/scheduling", color: "from-accent to-primary" },
    { label: "View Strategist", icon: Users, link: "/messages", color: "from-primary/80 to-accent/80" },
  ];

  const stats = [
    { title: "Active Applications", value: "3", trend: "+1 this week", icon: Briefcase },
    { title: "Interviews Scheduled", value: "2", trend: "Next: Tomorrow 2PM", icon: Calendar },
    { title: "Profile Views", value: "24", trend: "+8 this week", icon: TrendingUp },
  ];

  const nextSteps = [
    { label: "Complete your profile", completed: profileCompletion >= 100, link: "/profile" },
    { label: "Connect your calendar", completed: false, link: "/scheduling" },
    { label: "Browse opportunities", completed: false, link: "/jobs" },
    { label: "Schedule intro call", completed: false, link: "/scheduling" },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 lg:py-12 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 glass-strong shadow-glass-xl">
          <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
          <div className="relative z-10 space-y-4">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider">
              Welcome back{firstName ? `, ${firstName}` : ''}
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-accent bg-clip-text text-transparent">
              Your Elite Journey
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Success is a luxury reserved for those who turn ambition into action
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.link}>
                <Card className="glass hover-lift cursor-pointer group border-0 shadow-glass-md hover:shadow-glass-lg transition-all">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-glow`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{action.label}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="glass-strong border-0 shadow-glass-lg hover-lift">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {stat.title}
                    </p>
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-4xl font-black text-foreground">{stat.value}</div>
                    <p className="text-sm font-medium text-success">{stat.trend}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Completion */}
          <Card className="lg:col-span-2 glass-strong border-0 shadow-glass-lg">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Profile Strength</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Complete your profile to unlock premium opportunities
                  </p>
                </div>
                <div className="text-4xl font-black text-primary">{profileCompletion}%</div>
              </div>
              
              <Progress value={profileCompletion} className="h-3" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nextSteps.map((step) => (
                  <Link
                    key={step.label}
                    to={step.link}
                    className="flex items-center gap-3 p-4 rounded-xl glass-subtle hover:bg-card/80 transition-all group"
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium flex-1 ${step.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {step.label}
                    </span>
                    {!step.completed && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="glass-strong border-0 shadow-glass-lg">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Upcoming</h2>
                <p className="text-sm text-muted-foreground mt-1">Your schedule this week</p>
              </div>
              
              <div className="space-y-3">
                <div className="p-4 rounded-xl glass-subtle space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <p className="text-sm font-semibold text-foreground">Interview - CTO Role</p>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">Tomorrow, 2:00 PM</p>
                </div>
                
                <div className="p-4 rounded-xl glass-subtle space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <p className="text-sm font-semibold text-foreground">Strategy Call</p>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">Thursday, 10:00 AM</p>
                </div>
              </div>
              
              <Link to="/scheduling">
                <Button variant="outline" className="w-full">
                  View Full Calendar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="glass-strong border-0 shadow-glass-lg">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            
            <div className="space-y-3">
              {[
                { type: "application", text: "You applied to Chief Technology Officer at Stealth Startup", time: "2 hours ago" },
                { type: "view", text: "Your profile was viewed by Elite Tech Fund", time: "5 hours ago" },
                { type: "message", text: "New message from your talent strategist", time: "1 day ago" },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 rounded-xl glass-subtle">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
