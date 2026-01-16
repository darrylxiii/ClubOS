import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Calendar, 
  CheckCircle2, 
  FileText,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface PartnerInterview {
  id: string;
  title: string;
  scheduled_start: string;
  status: string;
  interview_stage?: string;
  candidate: {
    id: string;
    full_name: string;
    avatar_url?: string;
    current_title?: string;
  };
  job: {
    id: string;
    title: string;
  };
  ai_summary?: string;
  ai_recommendation?: string;
  scorecards: {
    overall_rating: number;
    recommendation: string;
    evaluator_name?: string;
  }[];
}

interface PartnerInterviewHubProps {
  companyId?: string;
}

export const PartnerInterviewHub = ({ companyId }: PartnerInterviewHubProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcomingInterviews, setUpcomingInterviews] = useState<PartnerInterview[]>([]);
  const [completedInterviews, setCompletedInterviews] = useState<PartnerInterview[]>([]);
  const [decisionReady, setDecisionReady] = useState<PartnerInterview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInterviews();
  }, [companyId]);

  const loadInterviews = async () => {
    try {
      const now = new Date().toISOString();

      // Fetch upcoming interviews for partner's company
      let upcomingQuery = supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          status,
          interview_stage,
          candidate_id,
          job_id,
          ai_summary,
          ai_recommendation
        `)
        .gte('scheduled_start', now)
        .eq('status', 'scheduled')
        .eq('meeting_type', 'interview')
        .order('scheduled_start', { ascending: true })
        .limit(10);

      if (companyId) {
        upcomingQuery = upcomingQuery.eq('company_id', companyId);
      }

      const { data: upcoming } = await upcomingQuery;

      // Fetch completed interviews
      let completedQuery = supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          status,
          interview_stage,
          candidate_id,
          job_id,
          ai_summary,
          ai_recommendation
        `)
        .eq('status', 'completed')
        .eq('meeting_type', 'interview')
        .order('scheduled_start', { ascending: false })
        .limit(20);

      if (companyId) {
        completedQuery = completedQuery.eq('company_id', companyId);
      }

      const { data: completed } = await completedQuery;

      // Enrich with candidate/job data
      const enrichInterviews = async (interviews: any[]): Promise<PartnerInterview[]> => {
        return Promise.all(
          (interviews || []).map(async (interview) => {
            let candidate = { id: '', full_name: 'Unknown', avatar_url: undefined as string | undefined, current_title: undefined as string | undefined };
            let job = { id: '', title: 'Unknown Position' };
            let scorecards: any[] = [];

            if (interview.candidate_id) {
              const { data } = await supabase
                .from('candidate_profiles')
                .select('id, full_name, avatar_url, current_title')
                .eq('id', interview.candidate_id)
                .single();
              if (data) candidate = { ...data, avatar_url: data.avatar_url ?? undefined, current_title: data.current_title ?? undefined };
            }

            if (interview.job_id) {
              const { data } = await supabase
                .from('jobs')
                .select('id, title')
                .eq('id', interview.job_id)
                .single();
              if (data) job = data;
            }

            // Fetch scorecards for completed interviews
            if (interview.status === 'completed') {
              const { data } = await supabase
                .from('candidate_scorecards')
                .select(`
                  overall_rating,
                  recommendation,
                  evaluator_id
                `)
                .eq('meeting_id', interview.id)
                .eq('status', 'submitted');
              
              scorecards = data || [];
            }

            return {
              ...interview,
              candidate,
              job,
              scorecards
            };
          })
        );
      };

      const enrichedUpcoming = await enrichInterviews(upcoming || []);
      const enrichedCompleted = await enrichInterviews(completed || []);

      // Filter decision-ready: completed with all scorecards and clear recommendation
      const ready = enrichedCompleted.filter(i => 
        i.scorecards.length > 0 && 
        i.scorecards.every(s => s.recommendation)
      );

      setUpcomingInterviews(enrichedUpcoming);
      setCompletedInterviews(enrichedCompleted);
      setDecisionReady(ready);
    } catch (err) {
      console.error('Error loading partner interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (rec?: string) => {
    switch (rec) {
      case 'strong_yes':
      case 'yes':
        return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'strong_no':
      case 'no':
        return <ThumbsDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStageColor = (stage?: string) => {
    switch (stage) {
      case 'screening': return 'bg-blue-500/10 text-blue-500';
      case 'technical': return 'bg-purple-500/10 text-purple-500';
      case 'culture_fit': return 'bg-pink-500/10 text-pink-500';
      case 'panel': return 'bg-amber-500/10 text-amber-500';
      case 'final': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const renderInterviewCard = (interview: PartnerInterview, showActions: boolean = true) => {
    const isUpcoming = new Date(interview.scheduled_start) > new Date();
    const avgRating = interview.scorecards.length > 0
      ? (interview.scorecards.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / interview.scorecards.length).toFixed(1)
      : null;

    return (
      <Card key={interview.id} className="hover:shadow-sm transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={interview.candidate.avatar_url} />
                <AvatarFallback>
                  {interview.candidate.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-semibold">{interview.candidate.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {interview.candidate.current_title || 'Candidate'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{interview.job.title}</Badge>
                  {interview.interview_stage && (
                    <Badge className={getStageColor(interview.interview_stage)}>
                      {interview.interview_stage.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              {isUpcoming ? (
                <div>
                  <p className="text-sm font-medium">{getDateLabel(interview.scheduled_start)}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(interview.scheduled_start), 'HH:mm')}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {avgRating && (
                    <Badge variant="secondary" className="gap-1">
                      ⭐ {avgRating}
                    </Badge>
                  )}
                  {interview.ai_recommendation && getRecommendationIcon(interview.ai_recommendation)}
                </div>
              )}
            </div>
          </div>

          {/* AI Summary for completed interviews */}
          {!isUpcoming && interview.ai_summary && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {interview.ai_summary}
              </p>
            </div>
          )}

          {/* Scorecard Summary */}
          {interview.scorecards.length > 0 && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex -space-x-2">
                {interview.scorecards.slice(0, 3).map((s, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                    {getRecommendationIcon(s.recommendation)}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {interview.scorecards.length} evaluator{interview.scorecards.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="mt-4 flex items-center gap-2">
              {isUpcoming ? (
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  View Details
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => navigate(`/meetings/${interview.id}/insights`)}
                  >
                    <FileText className="w-4 h-4" />
                    View Insights
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Request Debrief
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-8 w-64 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" />
          Interview Hub
        </CardTitle>
        <CardDescription>
          Track interviews, review insights, and make hiring decisions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming" className="gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming ({upcomingInterviews.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed ({completedInterviews.length})
            </TabsTrigger>
            <TabsTrigger value="decisions" className="gap-2">
              <ThumbsUp className="w-4 h-4" />
              Ready ({decisionReady.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingInterviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming interviews scheduled</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingInterviews.map(interview => renderInterviewCard(interview))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedInterviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No completed interviews yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedInterviews.map(interview => renderInterviewCard(interview))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="decisions" className="mt-6">
            {decisionReady.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ThumbsUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No candidates ready for decision</p>
                <p className="text-sm mt-1">Interviews need scorecards before decisions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {decisionReady.map(interview => (
                  <Card key={interview.id} className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6">
                      {renderInterviewCard(interview, false)}
                      <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          All evaluators have submitted scorecards
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Pass
                          </Button>
                          <Button size="sm">
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Advance
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
