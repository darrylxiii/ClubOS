import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FeaturedJobs } from "@/components/jobs/FeaturedJobs";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { trackPageLoad } from "@/utils/performanceMonitoring";

const Home = () => {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();

  useEffect(() => {
    trackPageLoad('home');
  }, []);

  useEffect(() => {
    if (!loading && profile?.user_type === "admin") {
      navigate("/admin");
    }
  }, [profile, loading, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Welcome back, {profile?.full_name}</h1>
        <p className="text-muted-foreground">Here's your personalized dashboard</p>
      </div>

      <QuickStats />
      <FeaturedJobs />
    </div>
  );
};

export default Home;
