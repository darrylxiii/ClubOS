import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, TrendingUp, Users, MessageSquare, Calendar, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function MeetingIntelligenceHub() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [processingQueue, setProcessingQueue] = useState<any[]>([]);
  const [hiringManagers, setHiringManagers] = useState<any[]>([]);
  const [questionPatterns, setQuestionPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Subscribe to processing queue changes
    const channel = supabase
      .channel('meeting-intelligence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_intelligence_processing'
        },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load recent meetings with transcripts
    const { data: meetingsData } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_transcripts(count),
        candidate_interview_performance(*)
      `)
      .order('scheduled_start', { ascending: false })
      .limit(20);

    setMeetings(meetingsData || []);

    // Load processing queue
    const { data: queueData } = await supabase
      .from('meeting_intelligence_processing')
      .select('*, meetings(title, scheduled_start)')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true });

    setProcessingQueue(queueData || []);

    // Load hiring manager profiles
    const { data: managersData } = await supabase
      .from('hiring_manager_profiles')
      .select('*, companies(name)')
      .order('meetings_analyzed', { ascending: false })
      .limit(10);

    setHiringManagers(managersData || []);

    // Load top question patterns
    const { data: questionsData } = await supabase
      .from('interview_question_patterns')
      .select('*, companies(name)')
      .order('frequency', { ascending: false })
      .limit(20);

    setQuestionPatterns(questionsData || []);

    setLoading(false);
  };

  const triggerProcessing = async () => {
    const { error } = await supabase.functions.invoke('process-meeting-intelligence');
    
    if (error) {
      console.error('Processing trigger failed:', error);
    }
    
    loadData();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Meeting Intelligence Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights from all interview meetings
          </p>
        </div>
        <Button onClick={triggerProcessing} variant="outline">
          Process Queue
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="patterns">Question Patterns</TabsTrigger>
          <TabsTrigger value="managers">Hiring Managers</TabsTrigger>
          <TabsTrigger value="queue">Processing Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{meetings.length}</div>
                <p className="text-xs text-muted-foreground">
                  {meetings.filter(m => m.meeting_transcripts?.length > 0).length} with transcripts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Questions Identified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{questionPatterns.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across {new Set(questionPatterns.map(q => q.company_id)).size} companies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Hiring Manager Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hiringManagers.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active interviewer profiles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processingQueue.length}</div>
                <p className="text-xs text-muted-foreground">
                  Pending analysis tasks
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {meetings.map(meeting => (
                <Card key={meeting.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{meeting.title}</CardTitle>
                        <CardDescription>
                          {format(new Date(meeting.scheduled_start), 'MMM d, yyyy h:mm a')}
                        </CardDescription>
                      </div>
                      <Badge variant={meeting.status === 'ended' ? 'secondary' : 'default'}>
                        {meeting.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {meeting.meeting_transcripts?.[0]?.count || 0} transcripts
                      </span>
                      {meeting.candidate_interview_performance?.[0] && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Performance Analyzed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {questionPatterns.map(pattern => (
                <Card key={pattern.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium mb-1">{pattern.question_text}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{pattern.companies?.name}</span>
                          {pattern.question_category && (
                            <Badge variant="secondary">{pattern.question_category}</Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">
                        Asked {pattern.frequency}x
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="managers" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {hiringManagers.map(manager => (
                <Card key={manager.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {manager.full_name || manager.email}
                        </CardTitle>
                        <CardDescription>{manager.companies?.name}</CardDescription>
                      </div>
                      <Badge>{manager.meetings_analyzed} meetings</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {manager.interview_style && (
                      <div>
                        <span className="text-sm font-medium">Interview Style: </span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {manager.interview_style}
                        </span>
                      </div>
                    )}
                    {manager.focus_areas && manager.focus_areas.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Focus Areas: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {manager.focus_areas.map((area: string) => (
                            <Badge key={area} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {processingQueue.map(task => (
                <Card key={task.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{task.meetings?.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {task.processing_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <Badge variant={task.status === 'processing' ? 'default' : 'secondary'}>
                        {task.status === 'processing' && <Play className="w-3 h-3 mr-1" />}
                        {task.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {processingQueue.length === 0 && (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">All caught up!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
