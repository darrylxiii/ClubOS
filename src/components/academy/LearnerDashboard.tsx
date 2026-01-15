import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { JobMatchesCard } from "@/components/academy/JobMatchesCard";
import { Link } from "react-router-dom";
import { 
  Trophy, TrendingUp, Clock, Target, Award, Flame,
  BookOpen, CheckCircle2, Download
} from "lucide-react";

interface Analytics {
  totalModulesCompleted: number;
  totalTimeSpent: number;
  currentStreak: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  badges: number;
}

export function LearnerDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics>({
    totalModulesCompleted: 0,
    totalTimeSpent: 0,
    currentStreak: 0,
    coursesEnrolled: 0,
    coursesCompleted: 0,
    badges: 0,
  });
  const [certificates, setCertificates] = useState<any[]>([]);
  const [weeklyGoal] = useState(300); // 5 hours per week

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      const { data: analyticsData } = await supabase
        .from('learning_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(7);

      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);

      const { data: enrollmentsData } = await supabase
        .from('path_enrollments')
        .select('*')
        .eq('user_id', user.id);

      const { data: certificatesData } = await supabase
        .from('certificates' as any)
        .select('*, courses(title, slug)')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false })
        .limit(3);

      setCertificates(certificatesData || []);

      if (analyticsData && analyticsData.length > 0) {
        const latest = analyticsData[0];
        const weeklyTime = analyticsData.reduce((sum, day) => sum + (day.time_spent_minutes || 0), 0);
        
        setAnalytics({
          totalModulesCompleted: latest.modules_completed || 0,
          totalTimeSpent: weeklyTime,
          currentStreak: latest.streak_days || 0,
          coursesEnrolled: enrollmentsData?.length || 0,
          coursesCompleted: latest.courses_completed || 0,
          badges: badgesData?.length || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const weeklyProgress = Math.min((analytics.totalTimeSpent / weeklyGoal) * 100, 100);

  const stats = [
    {
      label: "Modules Completed",
      value: analytics.totalModulesCompleted,
      icon: CheckCircle2,
      color: "text-success bg-success/10"
    },
    {
      label: "Current Streak",
      value: `${analytics.currentStreak} days`,
      icon: Flame,
      color: "text-warning bg-warning/10"
    },
    {
      label: "Badges Earned",
      value: analytics.badges,
      icon: Award,
      color: "text-primary bg-primary/10"
    },
    {
      label: "Time This Week",
      value: `${Math.round(analytics.totalTimeSpent / 60)}h`,
      icon: Clock,
      color: "text-blue-500 bg-blue-500/10"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 squircle hover-lift">
            <div className={`inline-flex p-2 squircle-sm ${stat.color} mb-3`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Weekly Goal Progress */}
      <Card className="p-6 squircle">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Weekly Learning Goal</h3>
              <p className="text-sm text-muted-foreground">
                {Math.round(analytics.totalTimeSpent / 60)}h / {weeklyGoal / 60}h completed
              </p>
            </div>
          </div>
          <Badge variant="outline" className="squircle-sm">
            {Math.round(weeklyProgress)}%
          </Badge>
        </div>
        <Progress value={weeklyProgress} className="h-3" />
      </Card>

      {/* Learning Path Progress */}
      <Card className="p-6 squircle">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Your Learning Journey</h3>
            <p className="text-sm text-muted-foreground">
              {analytics.coursesEnrolled} courses enrolled • {analytics.coursesCompleted} completed
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-medium">
              {analytics.coursesEnrolled > 0 
                ? Math.round((analytics.coursesCompleted / analytics.coursesEnrolled) * 100)
                : 0}%
            </span>
          </div>
          <Progress 
            value={analytics.coursesEnrolled > 0 
              ? (analytics.coursesCompleted / analytics.coursesEnrolled) * 100 
              : 0
            } 
            className="h-2" 
          />
        </div>
      </Card>

      {/* Recent Certificates */}
      {certificates.length > 0 && (
        <Card className="p-6 squircle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Recent Certificates</h3>
                <p className="text-sm text-muted-foreground">Your achievements</p>
              </div>
            </div>
            <Link to="/academy/my-skills">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {certificates.map((cert: any) => (
              <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-accent transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Award className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cert.courses?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Job Matches */}
      <JobMatchesCard />

      {/* Quick Actions */}
      <Card className="p-6 squircle">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/academy/my-skills">
            <Button variant="outline" className="w-full">
              <Trophy className="h-4 w-4 mr-2" />
              My Skills
            </Button>
          </Link>
          <Link to="/academy/leaderboard">
            <Button variant="outline" className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              Leaderboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
