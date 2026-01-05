import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UpcomingInterviewsWidget } from "@/components/partner/UpcomingInterviewsWidget";
import { Calendar, BarChart3, Clock, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

interface InterviewerDashboardProps {
  jobId: string;
  applicationId?: string;
}

export function InterviewerDashboard({ jobId, applicationId }: InterviewerDashboardProps) {
  const { user } = useAuth();

  // Fetch real interviewer stats
  const { data: interviewerStats, isLoading } = useQuery({
    queryKey: ['interviewer-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all meetings where user was a participant
      const { data: participations, error: partError } = await supabase
        .from('meeting_participants')
        .select(`
          id,
          meeting_id,
          scorecard_submitted,
          meetings (
            id,
            status,
            scheduled_start,
            actual_end
          )
        `)
        .eq('user_id', user.id)
        .eq('role_in_interview', 'interviewer');

      if (partError) throw partError;

      const meetings = participations || [];
      const completedMeetings = meetings.filter((p: any) => p.meetings?.status === 'completed');
      
      // Calculate avg feedback time from completed scorecards
      const { data: scorecards, error: scError } = await supabase
        .from('candidate_scorecards')
        .select('created_at, submitted_at, meeting_id')
        .eq('evaluator_id', user.id)
        .not('submitted_at', 'is', null);

      if (scError) throw scError;

      let avgFeedbackHours = 0;
      if (scorecards && scorecards.length > 0) {
        const totalHours = scorecards.reduce((acc, sc) => {
          if (sc.submitted_at && sc.created_at) {
            const hours = (new Date(sc.submitted_at).getTime() - new Date(sc.created_at).getTime()) / (1000 * 60 * 60);
            return acc + hours;
          }
          return acc;
        }, 0);
        avgFeedbackHours = Math.round(totalHours / scorecards.length);
      }

      // Calculate hire rate from recommendations
      const { data: allScorecards, error: allError } = await supabase
        .from('candidate_scorecards')
        .select('recommendation')
        .eq('evaluator_id', user.id)
        .not('recommendation', 'is', null);

      if (allError) throw allError;

      let hireRate = 0;
      if (allScorecards && allScorecards.length > 0) {
        const hireRecommendations = allScorecards.filter(
          (s: any) => s.recommendation === 'strong_yes' || s.recommendation === 'yes'
        ).length;
        hireRate = Math.round((hireRecommendations / allScorecards.length) * 100);
      }

      return {
        interviewsConducted: completedMeetings.length,
        avgFeedbackTime: avgFeedbackHours,
        hireRate: hireRate
      };
    },
    enabled: !!user?.id,
    staleTime: 30000
  });

  return (
    <div className="space-y-6">
      {/* My Interviews Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Interview Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingInterviewsWidget jobId={jobId} />
        </CardContent>
      </Card>

      {/* My Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            My Interview Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
          ) : interviewerStats ? (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Interviews Conducted</p>
                </div>
                <p className="text-2xl font-bold">{interviewerStats.interviewsConducted}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Avg Feedback Time</p>
                </div>
                <p className="text-2xl font-bold">{interviewerStats.avgFeedbackTime}h</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Hire Rate</p>
                </div>
                <p className="text-2xl font-bold">{interviewerStats.hireRate}%</p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No Interview Data"
              description="Complete interviews and submit scorecards to see your performance stats."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
