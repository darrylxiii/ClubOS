import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CandidateAnalyticsData {
  profileViews: {
    total: number;
    unique: number;
    trend: Array<{ date: string; views: number }>;
    byCompany: Array<{ company: string; views: number }>;
  };
  applicationMetrics: {
    total: number;
    active: number;
    interviews: number;
    offers: number;
    successRate: number;
    avgResponseTime: number;
    byStage: Array<{ stage: string; count: number }>;
    timeline: Array<{ date: string; applications: number }>;
  };
  interviewPerformance: {
    total: number;
    completed: number;
    avgRating: number;
    avgTechnicalScore: number;
    avgCulturalFit: number;
    avgCommunication: number;
    noShowRate: number;
  };
  jobSearchBehavior: {
    totalSearches: number;
    topSearchTerms: Array<{ term: string; count: number }>;
    viewedToAppliedRate: number;
    savedToAppliedRate: number;
    mostViewedCompanies: Array<{ company: string; views: number }>;
  };
  documentEngagement: {
    cvDownloads: number;
    portfolioViews: number;
    documentsShared: number;
  };
  networkActivity: {
    referralsMade: number;
    referralsHired: number;
    rewardsEarned: number;
    connectionsGrowth: number;
  };
}

export function useCandidateAnalytics(userId: string | undefined, dateRange?: { start: Date; end: Date }) {
  const [data, setData] = useState<CandidateAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchAnalytics();

    // Phase 4: Real-time updates
    const channel = supabase
      .channel(`candidate-analytics-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, dateRange]);

  const fetchAnalytics = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Get candidate profile ID
      const { data: profile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Fetch profile views (placeholder until types regenerate)
      const profileViews: any[] = [];

      // Calculate profile metrics
      const totalViews = profileViews?.length || 0;
      const uniqueViewers = new Set(profileViews?.map(v => v.company_id)).size;
      
      const viewsByDate = profileViews?.reduce((acc: Record<string, number>, view: any) => {
        const date = new Date(view.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const viewsTrend = Object.entries(viewsByDate || {}).map(([date, views]) => ({
        date,
        views: Number(views),
      })).slice(-30);

      const viewsByCompany = profileViews?.reduce((acc: Record<string, number>, view: any) => {
        const companyName = view.companies?.name || 'Unknown';
        acc[companyName] = (acc[companyName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCompanies = Object.entries(viewsByCompany || {})
        .map(([company, views]) => ({ company, views: Number(views) }))
        .sort((a, b) => Number(b.views) - Number(a.views))
        .slice(0, 10);

      // Fetch applications
      let applicationsQuery = supabase
        .from('applications')
        .select('*, jobs(title, companies(name))');

      if (dateRange) {
        applicationsQuery = applicationsQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: applications } = await applicationsQuery.eq('user_id', userId);

      const totalApps = applications?.length || 0;
      const activeApps = applications?.filter(a => !['rejected', 'withdrawn', 'hired'].includes(a.status))?.length || 0;
      const interviewStageCount = applications?.filter(a => ['interview', 'final'].includes(a.status))?.length || 0;
      const offers = applications?.filter(a => a.status === 'offer')?.length || 0;
      const hired = applications?.filter(a => a.status === 'hired')?.length || 0;

      const successRate = totalApps > 0 ? Math.round(((hired + offers) / totalApps) * 100) : 0;

      const appsByStage = applications?.reduce((acc, app) => {
        const stage = app.status || 'unknown';
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const stageDistribution = Object.entries(appsByStage || {}).map(([stage, count]) => ({
        stage,
        count,
      }));

      const appsByDate = applications?.reduce((acc, app) => {
        const date = new Date(app.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const appsTimeline = Object.entries(appsByDate || {})
        .map(([date, applications]) => ({ date, applications }))
        .slice(-30);

      // Fetch interview performance data - use any to handle schema differences
      const { data: interviewData } = await (supabase as any)
        .from('candidate_interview_performance')
        .select('*')
        .eq('candidate_id', profile.id);

      const interviewPerformanceData = (interviewData || []) as any[];
      const totalInterviews = interviewPerformanceData.length;
      const completedInterviews = interviewPerformanceData.filter(i => i.interview_completed || i.overall_score !== null).length;
      
      const avgRating = interviewPerformanceData.length 
        ? interviewPerformanceData.reduce((sum, i) => sum + (i.overall_rating || i.overall_score || 0), 0) / interviewPerformanceData.length 
        : 0;
      const avgTechnical = interviewPerformanceData.length 
        ? interviewPerformanceData.reduce((sum, i) => sum + (i.technical_score || i.technical_skills_score || 0), 0) / interviewPerformanceData.length 
        : 0;
      const avgCultural = interviewPerformanceData.length 
        ? interviewPerformanceData.reduce((sum, i) => sum + (i.cultural_fit_score || 0), 0) / interviewPerformanceData.length 
        : 0;
      const avgComm = interviewPerformanceData.length 
        ? interviewPerformanceData.reduce((sum, i) => sum + (i.communication_score || i.communication_clarity_score || 0), 0) / interviewPerformanceData.length 
        : 0;
      const noShowCount = interviewPerformanceData.filter(i => i.no_show || i.status === 'no_show').length;
      const noShowRate = totalInterviews > 0 ? (noShowCount / totalInterviews) * 100 : 0;

      // Fetch job search history
      const { data: searchData } = await (supabase as any)
        .from('job_search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      const searches = (searchData || []) as any[];
      const totalSearches = searches.length;
      const searchTerms = searches.reduce((acc: Record<string, number>, search: any) => {
        const term = search.search_query || 'blank search';
        acc[term] = (acc[term] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topSearchTerms = Object.entries(searchTerms || {})
        .map(([term, count]) => ({ term, count: Number(count) }))
        .sort((a, b) => Number(b.count) - Number(a.count))
        .slice(0, 10);

      // CV downloads from activity timeline
      const { data: cvDownloadsData } = await supabase
        .from('activity_timeline')
        .select('id')
        .eq('user_id', userId)
        .eq('activity_type', 'cv_download');

      const cvDownloads = cvDownloadsData || [];

      // Fetch referrals - use any to handle schema differences
      const { data: referralData } = await (supabase as any)
        .from('referrals')
        .select('*')
        .eq('referred_by', userId);

      const referrals = (referralData || []) as any[];
      const referralsMade = referrals.length;
      const referralsHired = referrals.filter(r => r.status === 'hired').length;
      const rewardsEarned = referrals.reduce((sum, r) => sum + (r.reward_paid || r.amount_paid || 0), 0);

      setData({
        profileViews: {
          total: totalViews,
          unique: uniqueViewers,
          trend: viewsTrend,
          byCompany: topCompanies,
        },
        applicationMetrics: {
          total: totalApps,
          active: activeApps,
          interviews: interviewStageCount,
          offers,
          successRate,
          avgResponseTime: 0,
          byStage: stageDistribution,
          timeline: appsTimeline,
        },
        interviewPerformance: {
          total: totalInterviews,
          completed: completedInterviews,
          avgRating: Math.round(avgRating * 100) / 100,
          avgTechnicalScore: Math.round(avgTechnical * 100) / 100,
          avgCulturalFit: Math.round(avgCultural * 100) / 100,
          avgCommunication: Math.round(avgComm * 100) / 100,
          noShowRate,
        },
        jobSearchBehavior: {
          totalSearches,
          topSearchTerms,
          viewedToAppliedRate: 0,
          savedToAppliedRate: 0,
          mostViewedCompanies: [],
        },
        documentEngagement: {
          cvDownloads: cvDownloads?.length || 0,
          portfolioViews: 0,
          documentsShared: 0,
        },
        networkActivity: {
          referralsMade,
          referralsHired,
          rewardsEarned,
          connectionsGrowth: 0,
        },
      });
    } catch (error) {
      console.error('Failed to fetch candidate analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refetch: fetchAnalytics };
}
