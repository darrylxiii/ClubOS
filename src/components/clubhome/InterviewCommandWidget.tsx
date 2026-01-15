import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  FileText, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  User,
  Briefcase,
  ChevronRight,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface InterviewItem {
  id: string;
  title: string;
  scheduled_start: string;
  interview_stage?: string;
  candidate?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    current_title?: string;
  };
  job?: {
    id: string;
    title: string;
  };
  application_id?: string;
}

interface PendingScorecard {
  meeting_id: string;
  meeting_title: string;
  candidate_name: string;
  candidate_avatar?: string;
  completed_at: string;
  due_at?: string;
}

export const InterviewCommandWidget = () => {
  const navigate = useNavigate();
  const [todayInterviews, setTodayInterviews] = useState<InterviewItem[]>([]);
  const [pendingScorecards, setPendingScorecards] = useState<PendingScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));

      // Fetch today's interviews
      const { data: meetings } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          interview_stage,
          candidate_id,
          job_id,
          application_id
        `)
        .eq('host_id', user.user.id)
        .gte('scheduled_start', todayStart.toISOString())
        .lte('scheduled_start', todayEnd.toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_start', { ascending: true });

      // Enrich with candidate/job info
      const enrichedMeetings = await Promise.all(
        (meetings || []).map(async (meeting) => {
          let candidate = null;
          let job = null;

          if (meeting.candidate_id) {
            const { data } = await supabase
              .from('candidate_profiles')
              .select('id, full_name, avatar_url, current_title')
              .eq('id', meeting.candidate_id)
              .single();
            candidate = data;
          }

          if (meeting.job_id) {
            const { data } = await supabase
              .from('jobs')
              .select('id, title')
              .eq('id', meeting.job_id)
              .single();
            job = data;
          }

          return { ...meeting, candidate, job };
        })
      );

      setTodayInterviews(enrichedMeetings);

      // Fetch pending scorecards (meetings where user participated but hasn't submitted scorecard)
      const { data: participatedMeetings } = await supabase
        .from('meeting_participants')
        .select(`
          meeting_id,
          scorecard_submitted,
          scorecard_due_at,
          meeting:meeting_id (
            id,
            title,
            scheduled_end,
            candidate_id,
            status
          )
        `)
        .eq('user_id', user.user.id)
        .eq('scorecard_submitted', false);

      const pending: PendingScorecard[] = [];
      for (const p of participatedMeetings || []) {
        if (p.meeting && (p.meeting as any).status === 'completed') {
          const meeting = p.meeting as any;
          let candidateName = 'Unknown';
          let candidateAvatar: string | undefined;

          if (meeting.candidate_id) {
            const { data } = await supabase
              .from('candidate_profiles')
              .select('full_name, avatar_url')
              .eq('id', meeting.candidate_id)
              .single();
            if (data) {
              candidateName = data.full_name;
              candidateAvatar = data.avatar_url;
            }
          }

          pending.push({
            meeting_id: meeting.id,
            meeting_title: meeting.title,
            candidate_name: candidateName,
            candidate_avatar: candidateAvatar,
            completed_at: meeting.scheduled_end,
            due_at: p.scorecard_due_at
          });
        }
      }

      setPendingScorecards(pending);
    } catch (err) {
      console.error('Error loading interview command data:', err);
    } finally {
      setLoading(false);
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

  const formatStage = (stage?: string) => {
    if (!stage) return '';
    return stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Interview Command Center
          </span>
          {pendingScorecards.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendingScorecards.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Today ({todayInterviews.length})
            </TabsTrigger>
            <TabsTrigger value="scorecards" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Scorecards ({pendingScorecards.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4">
            {todayInterviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No interviews scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayInterviews.map((interview) => {
                  const startTime = new Date(interview.scheduled_start);
                  const isUpcoming = startTime > new Date();
                  const isNow = Math.abs(startTime.getTime() - Date.now()) < 15 * 60 * 1000; // within 15 min

                  return (
                    <div
                      key={interview.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                        isNow ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => navigate(`/meetings/${interview.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {interview.candidate ? (
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={interview.candidate.avatar_url} />
                              <AvatarFallback>
                                {interview.candidate.full_name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}

                          <div>
                            <p className="font-medium">{interview.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(startTime, 'HH:mm')}
                              {interview.interview_stage && (
                                <Badge variant="secondary" className={getStageColor(interview.interview_stage)}>
                                  {formatStage(interview.interview_stage)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isNow && (
                            <Button size="sm" className="gap-2">
                              <Play className="w-4 h-4" />
                              Join
                            </Button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>

                      {interview.job && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Briefcase className="w-3 h-3" />
                          {interview.job.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scorecards" className="mt-4">
            {pendingScorecards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-500" />
                <p>All scorecards submitted!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingScorecards.map((scorecard) => {
                  const isOverdue = scorecard.due_at && new Date(scorecard.due_at) < new Date();

                  return (
                    <div
                      key={scorecard.meeting_id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                        isOverdue ? 'border-destructive bg-destructive/5' : ''
                      }`}
                      onClick={() => navigate(`/scorecards/new?meeting=${scorecard.meeting_id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={scorecard.candidate_avatar} />
                            <AvatarFallback>
                              {scorecard.candidate_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <p className="font-medium">{scorecard.candidate_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {scorecard.meeting_title}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {isOverdue && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </Badge>
                          )}
                          <Button size="sm" variant="outline">
                            Submit
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        Completed {formatDistanceToNow(new Date(scorecard.completed_at), { addSuffix: true })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
