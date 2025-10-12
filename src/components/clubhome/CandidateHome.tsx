import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  Target, 
  TrendingUp,
  FileText,
  Clock
} from "lucide-react";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { LivePulse } from "@/components/LivePulse";
import { ProfileViewers } from "@/components/ProfileViewers";
import { Link } from "react-router-dom";

export const CandidateHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    profileViews: 0,
    matches: 0
  });
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string>("");
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    fetchCandidateStats();
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', user.id)
      .single();

    if (data?.full_name) {
      setFirstName(data.full_name.split(' ')[0]);
      
      let completion = 0;
      if (data.avatar_url) completion += 25;
      if (data.full_name) completion += 25;
      if (data.email) completion += 25;
      setProfileCompletion(completion);
    }
  };

  const fetchCandidateStats = async () => {
    if (!user) return;

    try {
      const [appsRes, matchesRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase
          .from('match_scores')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('overall_score', 70)
      ]);

      setStats({
        applications: appsRes.count || 0,
        interviews: 0,
        profileViews: 24,
        matches: matchesRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSteps = [
    { label: "Complete your profile", completed: profileCompletion >= 100, link: "/profile" },
    { label: "Connect your calendar", completed: false, link: "/scheduling" },
    { label: "Browse opportunities", completed: false, link: "/jobs" },
    { label: "Schedule intro call", completed: false, link: "/scheduling" },
  ];

  const quickActions = [
    { label: "Browse Elite Roles", icon: Briefcase, link: "/jobs", color: "from-primary to-accent" },
    { label: "Schedule Meeting", icon: Calendar, link: "/scheduling", color: "from-accent to-primary" },
    { label: "View Strategist", icon: MessageSquare, link: "/messages", color: "from-primary/80 to-accent/80" },
  ];

  return (
    <div className="space-y-6">
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
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-strong border-0 shadow-glass-lg hover-lift">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Active Applications
              </p>
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-black text-foreground">{stats.applications}</div>
              <p className="text-sm font-medium text-success">+1 this week</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-0 shadow-glass-lg hover-lift">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Interviews Scheduled
              </p>
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-black text-foreground">{stats.interviews}</div>
              <p className="text-sm font-medium text-success">Next: Tomorrow 2PM</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-strong border-0 shadow-glass-lg hover-lift">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Profile Views
              </p>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-4xl font-black text-foreground">{stats.profileViews}</div>
              <p className="text-sm font-medium text-success">+8 this week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Strength */}
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
                    <FileText className="w-5 h-5 text-success flex-shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium flex-1 ${step.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {step.label}
                  </span>
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
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Live Pulse & Profile Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LivePulse />
        <ProfileViewers />
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
  );
};
