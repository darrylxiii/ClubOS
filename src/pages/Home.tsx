import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FeaturedJobs } from "@/components/jobs/FeaturedJobs";
import { NextBestActionCard } from "@/components/clubhome/NextBestActionCard";
import { ApplicationStatusTracker } from "@/components/candidate/ApplicationStatusTracker";
import { CandidateQuickActions } from "@/components/candidate/CandidateQuickActions";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useAnimatedText } from "@/hooks/useAnimatedText";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { trackPageLoad } from "@/utils/performanceMonitoring";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const { user } = useAuth();
  const { t } = useTranslation('common');

  useEffect(() => {
    trackPageLoad('home');
  }, []);

  useEffect(() => {
    if (!loading && profile?.user_type === "admin") {
      navigate("/admin");
    }
  }, [profile, loading, navigate]);

  // Fetch dashboard stats for quick actions
  const { data: dashboardStats } = useQuery({
    queryKey: ['candidate-dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [applications, interviews] = await Promise.all([
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('candidate_id', user.id)
          .in('status', ['active', 'interview', 'pending']),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('scheduled_start', new Date().toISOString())
      ]);

      return {
        pendingApplications: applications.count || 0,
        newMatches: 0, // Will be calculated from AI matching when available
        upcomingInterviews: interviews.count || 0,
        profileCompletion: 85 // Could be calculated from profile fields
      };
    },
    enabled: !!user
  });

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider">
          {animatedGreeting}
          <span className={cn(
            "inline-block w-[2px] h-[1em] bg-foreground ml-0.5 align-baseline transition-opacity duration-500",
            isComplete ? "opacity-0" : "animate-pulse opacity-100"
          )} />
        </h1>
        <p className="text-muted-foreground">{t('home.personalizedDashboard')}</p>
      </div>

      {/* QUIN Next Best Action */}
      <NextBestActionCard />

      {/* Pipeline & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user && <ApplicationStatusTracker userId={user.id} />}
        <CandidateQuickActions
          profileCompletion={dashboardStats?.profileCompletion || 85}
          newMatches={dashboardStats?.newMatches || 0}
          pendingApplications={dashboardStats?.pendingApplications || 0}
          upcomingInterviews={dashboardStats?.upcomingInterviews || 0}
        />
      </div>

      {/* Featured Jobs */}
      <FeaturedJobs />
    </div>
  );
};

export default Home;