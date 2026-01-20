import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, Users, Eye, Briefcase, MessageSquare } from "lucide-react";

interface CompanyAnalyticsChartProps {
  companyId: string;
}

export const CompanyAnalyticsChart = ({ companyId }: CompanyAnalyticsChartProps) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [companyId]);

  const fetchAnalytics = async () => {
    try {
      // Get last 30 days of analytics
      const { data, error } = await supabase
        .from('company_analytics')
        .select('*')
        .eq('company_id', companyId)
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      // Calculate totals
      const totals = {
        profile_views: 0,
        job_views: 0,
        application_starts: 0,
        application_completes: 0,
        post_views: 0,
        post_engagements: 0,
        follower_count: 0,
      };

      data?.forEach((day: any) => {
        totals.profile_views += day.profile_views || 0;
        totals.job_views += day.job_views || 0;
        totals.application_starts += day.application_starts || 0;
        totals.application_completes += day.application_completes || 0;
        totals.post_views += day.post_views || 0;
        totals.post_engagements += day.post_engagements || 0;
        totals.follower_count = Math.max(totals.follower_count, day.follower_count || 0);
      });

      setAnalytics(totals);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse h-32 bg-muted rounded"></div>
      ))}
    </div>;
  }

  const stats = [
    {
      title: "Profile Views",
      value: analytics?.profile_views || 0,
      icon: Eye,
      description: "Last 30 days",
      color: "text-blue-500",
    },
    {
      title: "Job Views",
      value: analytics?.job_views || 0,
      icon: Briefcase,
      description: "Last 30 days",
      color: "text-green-500",
    },
    {
      title: "Applications",
      value: analytics?.application_completes || 0,
      icon: TrendingUp,
      description: `${analytics?.application_starts || 0} started`,
      color: "text-purple-500",
    },
    {
      title: "Followers",
      value: analytics?.follower_count || 0,
      icon: Users,
      description: "Current followers",
      color: "text-pink-500",
    },
    {
      title: "Post Views",
      value: analytics?.post_views || 0,
      icon: MessageSquare,
      description: "Last 30 days",
      color: "text-orange-500",
    },
    {
      title: "Post Engagements",
      value: analytics?.post_engagements || 0,
      icon: TrendingUp,
      description: "Reactions & comments",
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="border-2 border-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold uppercase">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};