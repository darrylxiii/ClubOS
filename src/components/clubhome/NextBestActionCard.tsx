import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserCircle, 
  Search, 
  Calendar, 
  RefreshCw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { T } from "@/components/T";
import { motion } from "framer-motion";

interface SimpleBooking {
  id: string;
  scheduled_start: string;
}

interface NextAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  priority: 'high' | 'medium' | 'low';
  color: string;
}

export const NextBestActionCard = () => {
  const { user } = useAuth();

  const { data: nextAction, isLoading } = useQuery({
    queryKey: ['next-best-action', user?.id],
    queryFn: async (): Promise<NextAction | null> => {
      if (!user) return null;

      // Check profile completion
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, current_title, bio, avatar_url')
        .eq('id', user.id)
        .single();

      const profileFields = profile ? Object.values(profile).filter(v => v).length : 0;
      const profileComplete = profileFields >= 4;

      if (!profileComplete) {
        return {
          id: 'complete-profile',
          title: 'Complete Your Profile',
          description: 'A complete profile gets 3x more views from recruiters',
          icon: UserCircle,
          link: '/settings?tab=profile',
          priority: 'high',
          color: 'text-orange-500',
        };
      }

      // Check for upcoming interviews
      const { data } = await supabase
        .from('bookings')
        .select('id, scheduled_start')
        .eq('user_id', user.id)
        .gte('scheduled_start', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(1);
      
      const upcomingMeetings = data as SimpleBooking[] | null;

      if (upcomingMeetings && upcomingMeetings.length > 0) {
        return {
          id: 'prepare-interview',
          title: 'Prepare for Your Interview',
          description: 'Review the job details and practice with QUIN',
          icon: Calendar,
          link: '/meetings',
          priority: 'high',
          color: 'text-blue-500',
        };
      }

      // Check application count
      const { count: applicationCount } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!applicationCount || applicationCount === 0) {
        return {
          id: 'browse-jobs',
          title: 'Explore Matching Jobs',
          description: 'QUIN has found roles that match your skills',
          icon: Search,
          link: '/jobs',
          priority: 'medium',
          color: 'text-primary',
        };
      }

      // Check for CV
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('resume_url')
        .eq('user_id', user.id)
        .single();

      if (!candidateProfile?.resume_url) {
        return {
          id: 'upload-cv',
          title: 'Upload Your CV',
          description: 'Let QUIN analyze and enhance your profile',
          icon: FileText,
          link: '/settings?tab=documents',
          priority: 'medium',
          color: 'text-purple-500',
        };
      }

      // All good - user has done the basics
      return {
        id: 'all-set',
        title: 'You\'re All Set!',
        description: 'Your profile is optimized. Keep exploring opportunities.',
        icon: CheckCircle2,
        link: '/jobs',
        priority: 'low',
        color: 'text-green-500',
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <Card className="glass-strong border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextAction) return null;

  const IconComponent = nextAction.icon;
  
  // Safety check for icon component
  if (!IconComponent || typeof IconComponent !== 'function') {
    console.error('[NextBestActionCard] Invalid icon component:', IconComponent);
    return null;
  }
  
  const priorityColors = {
    high: 'border-orange-500/30 bg-orange-500/5',
    medium: 'border-primary/30 bg-primary/5',
    low: 'border-green-500/30 bg-green-500/5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`glass-strong border-2 ${priorityColors[nextAction.priority]} overflow-hidden`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={`p-3 rounded-xl bg-background/50 ${nextAction.color}`}>
              <IconComponent className="h-6 w-6" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  <T k="common:quin.nextStep" fallback="Powered by QUIN" />
                </span>
              </div>
              <h3 className="font-semibold text-sm sm:text-base truncate">
                {nextAction.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {nextAction.description}
              </p>
            </div>

            {/* Action */}
            <Button asChild size="sm" className="shrink-0">
              <Link to={nextAction.link}>
                <span className="hidden sm:inline"><T k="common:actions.go" fallback="Go" /></span>
                <ArrowRight className="h-4 w-4 sm:ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
