import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, TrendingUp, Target, Activity, Users } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface CandidateAnalyticsProps {
  candidateId: string;
  activeTab?: string;
}

export const CandidateAnalytics = ({ candidateId, activeTab }: CandidateAnalyticsProps) => {
  const { t } = useTranslation('partner');
  const [analytics, setAnalytics] = useState({
    profileViews: 0,
    uniqueViewers: 0,
    avgEngagementScore: 0,
    fitScore: 0,
    recentViewers: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load when the activity tab is active
    if (activeTab === 'activity') {
      loadAnalytics();
    }
  }, [candidateId, activeTab]);

  const loadAnalytics = async () => {
    try {
      // Get profile views
      const { data: views, error: viewsError } = await supabase
        .from("candidate_profile_views")
        .select(`
          *,
          profiles:viewer_id(full_name, avatar_url)
        `)
        .eq("candidate_id", candidateId)
        .order("viewed_at", { ascending: false });

      if (viewsError) throw viewsError;

      // Calculate unique viewers
      const uniqueViewers = new Set(views?.map(v => v.viewer_id)).size;

      // Get recent viewers (last 5)
      const recentViewers = views?.slice(0, 5) || [];

      // Get candidate scores
      const { data: candidate } = await supabase
        .from("candidate_profiles")
        .select("engagement_score, fit_score")
        .eq("id", candidateId)
        .single();

      setAnalytics({
        profileViews: views?.length || 0,
        uniqueViewers,
        avgEngagementScore: candidate?.engagement_score || 0,
        fitScore: candidate?.fit_score || 0,
        recentViewers,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error(t('candidateAnalytics.toast.failedToLoadAnalytics'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('candidateAnalytics.profileViews')}</p>
                <p className="text-3xl font-bold">{analytics.profileViews}</p>
              </div>
              <Eye className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('candidateAnalytics.uniqueViewers')}</p>
                <p className="text-3xl font-bold">{analytics.uniqueViewers}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('candidateAnalytics.engagementScore')}</p>
                <p className="text-3xl font-bold">{analytics.avgEngagementScore.toFixed(1)}</p>
              </div>
              <Activity className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('candidateAnalytics.fitScore')}</p>
                <p className="text-3xl font-bold">{analytics.fitScore.toFixed(1)}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Profile Viewers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Recent Profile Viewers
          </CardTitle>
          <CardDescription>{t('candidateAnalytics.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentViewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('candidateAnalytics.noProfileViewsYet')}</p>
          ) : (
            <div className="space-y-3">
              {analytics.recentViewers.map((view) => (
                <div key={view.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {view.profiles?.avatar_url ? (
                        <img
                          src={view.profiles.avatar_url}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {view.profiles?.full_name || "Team Member"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {view.view_context || "Unknown context"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(view.viewed_at).toLocaleDateString()}
                    </p>
                    {view.duration_seconds && (
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(view.duration_seconds / 60)}m {view.duration_seconds % 60}s
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.profileViews > 10 && (
            <div className="flex items-start gap-2">
              <Badge variant="secondary">{t('candidateAnalytics.badge.highInterest')}</Badge>
              <p className="text-sm text-muted-foreground">{t('candidateAnalytics.thisCandidateHasReceivedSignificantAtten')}</p>
            </div>
          )}
          {analytics.fitScore >= 8 && (
            <div className="flex items-start gap-2">
              <Badge variant="secondary">{t('candidateAnalytics.badge.excellentFit')}</Badge>
              <p className="text-sm text-muted-foreground">{t('candidateAnalytics.aiAnalysisShowsStrongAlignmentWithRoleRe')}</p>
            </div>
          )}
          {analytics.avgEngagementScore >= 7 && (
            <div className="flex items-start gap-2">
              <Badge variant="secondary">{t('candidateAnalytics.badge.highlyEngaged')}</Badge>
              <p className="text-sm text-muted-foreground">{t('candidateAnalytics.candidateShowsStrongEngagementWithTheApp')}</p>
            </div>
          )}
          {analytics.profileViews === 0 && (
            <p className="text-sm text-muted-foreground">{t('candidateAnalytics.noInsightsAvailableYetProfileViewsAndInt')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
