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
import { EmptyState } from "@/components/EmptyState";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import { LivePulse } from "@/components/LivePulse";
import { ProfileViewers } from "@/components/ProfileViewers";
import { Link } from "react-router-dom";

export const CandidateHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    messages: 0,
    matches: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidateStats();
  }, [user]);

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
        interviews: 0, // Would fetch from interviews table
        messages: 0, // Would fetch from messages
        matches: matchesRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Completion */}
      <ProfileCompletion />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.applications}</div>
            <p className="text-xs text-muted-foreground mt-1">Active applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.matches}</div>
            <p className="text-xs text-muted-foreground mt-1">High-fit roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviews}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messages}</div>
            <p className="text-xs text-muted-foreground mt-1">Unread</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Next Steps
            </CardTitle>
            <CardDescription>Recommended actions to boost your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-border/20 rounded-lg bg-card/20 backdrop-blur-[var(--blur-glass-subtle)]">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Upload your resume</span>
              </div>
              <Button size="sm" variant="glass">Add</Button>
            </div>
            <div className="flex items-center justify-between p-3 border border-border/20 rounded-lg bg-card/20 backdrop-blur-[var(--blur-glass-subtle)]">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Connect calendar</span>
              </div>
              <Button size="sm" variant="glass">Connect</Button>
            </div>
            <div className="flex items-center justify-between p-3 border border-border/20 rounded-lg bg-card/20 backdrop-blur-[var(--blur-glass-subtle)]">
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Apply to matched jobs</span>
              </div>
              <Button size="sm" variant="glass" asChild>
                <Link to="/jobs">View</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Top Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top Job Matches
            </CardTitle>
            <CardDescription>Roles that fit your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.matches === 0 ? (
              <EmptyState
                icon={Target}
                title="No matches yet"
                description="Complete your profile to get personalized job recommendations"
                action={{
                  label: "Complete Profile",
                  onClick: () => window.location.href = "/settings",
                  variant: "default"
                }}
              />
            ) : (
              <div className="space-y-3">
                <div className="p-3 border border-border/20 rounded-lg bg-card/20 backdrop-blur-[var(--blur-glass-subtle)]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-sm">Senior Developer</h4>
                      <p className="text-xs text-muted-foreground">Tech Corp</p>
                    </div>
                    <Badge variant="secondary">85% Match</Badge>
                  </div>
                  <Button size="sm" variant="glass" className="w-full mt-2" asChild>
                    <Link to="/jobs">View Details</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Pulse & Profile Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LivePulse />
        <ProfileViewers />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center py-8">
              Your recent applications and interactions will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
