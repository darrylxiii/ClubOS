import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

interface Milestone {
  id: string;
  label: string;
  completed: boolean;
  count?: number;
  target?: number;
}

interface CareerProgress {
  currentRole: string;
  targetRole: string;
  progressPercent: number;
  milestones: Milestone[];
  velocity: 'fast' | 'average' | 'slow';
  daysActive: number;
}

export function CareerProgressWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<CareerProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCareerProgress();
    }
  }, [user]);

  const fetchCareerProgress = async () => {
    if (!user) return;

    try {
      // Fetch profile, applications, and interviews in parallel
      const [profileRes, applicationsRes, interviewsRes, offersRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('current_title, created_at')
          .eq('id', user.id)
          .single(),
        supabase
          .from('applications')
          .select('id, status')
          .eq('candidate_id', user.id),
        supabase
          .from('bookings')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'confirmed'),
        supabase
          .from('applications')
          .select('id')
          .eq('candidate_id', user.id)
          .eq('status', 'offer')
      ]);

      const profile = profileRes.data;
      const applications = applicationsRes.data || [];
      const interviews = interviewsRes.data || [];
      const offers = offersRes.data || [];

      // Calculate days active
      const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
      const daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Define milestones
      const milestones: Milestone[] = [
        {
          id: 'applications',
          label: 'Submit 5 applications',
          completed: applications.length >= 5,
          count: applications.length,
          target: 5
        },
        {
          id: 'interviews',
          label: 'Complete 3 interviews',
          completed: interviews.length >= 3,
          count: interviews.length,
          target: 3
        },
        {
          id: 'offers',
          label: 'Receive an offer',
          completed: offers.length > 0,
          count: offers.length,
          target: 1
        }
      ];

      // Calculate overall progress
      const completedMilestones = milestones.filter(m => m.completed).length;
      const progressPercent = Math.round((completedMilestones / milestones.length) * 100);

      // Determine velocity based on activity
      let velocity: CareerProgress['velocity'] = 'average';
      if (daysActive > 0) {
        const actionsPerDay = applications.length / daysActive;
        if (actionsPerDay > 0.5) velocity = 'fast';
        else if (actionsPerDay < 0.1) velocity = 'slow';
      }

      setProgress({
        currentRole: profile?.current_title || 'Your Current Role',
        targetRole: 'Your Dream Role',
        progressPercent,
        milestones,
        velocity,
        daysActive
      });
    } catch (error) {
      console.error('Error fetching career progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVelocityBadge = () => {
    if (!progress) return null;
    
    switch (progress.velocity) {
      case 'fast':
        return (
          <Badge className="gap-1 bg-success/10 text-success border-success/30 text-xs">
            <Sparkles className="w-3 h-3" />
            Fast Mover
          </Badge>
        );
      case 'slow':
        return (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Just Getting Started
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            On Track
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return null;
  }

  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            <Target className="w-5 h-5" />
            Career Journey
          </CardTitle>
          {getVelocityBadge()}
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground truncate max-w-[45%]">
              {progress.currentRole}
            </span>
            <span className="font-medium truncate max-w-[45%] text-right">
              {progress.targetRole}
            </span>
          </div>
          <Progress value={progress.progressPercent} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {progress.progressPercent}% of milestones completed
          </p>
        </div>

        {/* Milestones */}
        <div className="space-y-2">
          {progress.milestones.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                milestone.completed 
                  ? 'bg-success/5 border border-success/20' 
                  : 'bg-background/30'
              }`}
            >
              {milestone.completed ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {milestone.label}
                </span>
              </div>
              {milestone.count !== undefined && milestone.target !== undefined && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {milestone.count}/{milestone.target}
                </Badge>
              )}
            </motion.div>
          ))}
        </div>

        {/* Days Active */}
        <div className="pt-2 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            {progress.daysActive} days on your job search journey
          </p>
        </div>

        {/* CTA */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-primary hover:text-primary"
          onClick={() => navigate('/applications')}
        >
          <span>View All Progress</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
