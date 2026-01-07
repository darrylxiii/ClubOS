import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, Brain, Video, Calendar, Clock, Search, Filter, 
  Settings, TrendingUp, Users, MessageSquare, Download,
  Play, Eye, Sparkles, BarChart3, CheckCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MeetingWithInsights {
  id: string;
  title: string;
  scheduled_start: string;
  duration?: number;
  participants_count?: number;
  has_insights: boolean;
  has_transcript: boolean;
  insights?: {
    summary: string;
    action_items: any[];
    sentiment: string;
    topics: string[];
  };
  bot_session?: {
    connection_status: string;
    joined_at: string;
  };
}

export default function MeetingIntelligence() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [meetings, setMeetings] = useState<MeetingWithInsights[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingWithInsights[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'analyzed' | 'pending'>('all');
  
  // Settings
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(true);
  
  // Stats
  const [stats, setStats] = useState({
    total_meetings: 0,
    analyzed_meetings: 0,
    total_transcripts: 0,
    hours_transcribed: 0,
    action_items_created: 0
  });

  useEffect(() => {
    if (user) {
      loadMeetings();
      loadStats();
      loadSettings();
    }
  }, [user]);

  useEffect(() => {
    filterMeetings();
  }, [meetings, searchQuery, filterStatus]);

  const loadMeetings = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get meetings with bot sessions and insights
      const { data: meetingsData, error } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          scheduled_end,
          meeting_bot_sessions (
            id,
            connection_status,
            joined_at
          ),
          meeting_insights (
            id,
            summary,
            action_items,
            sentiment_analysis,
            topics
          ),
          meeting_transcripts (
            id
          )
        `)
        .eq('host_id', user.id)
        .order('scheduled_start', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedMeetings: MeetingWithInsights[] = (meetingsData || []).map((m: any) => {
        const start = new Date(m.scheduled_start);
        const end = m.scheduled_end ? new Date(m.scheduled_end) : null;
        const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
        
        return {
          id: m.id,
          title: m.title,
          scheduled_start: m.scheduled_start,
          duration,
          participants_count: 0,
          has_insights: m.meeting_insights?.length > 0,
          has_transcript: m.meeting_transcripts?.length > 0,
          insights: m.meeting_insights?.[0] ? {
            summary: m.meeting_insights[0].summary,
            action_items: m.meeting_insights[0].action_items || [],
            sentiment: m.meeting_insights[0].sentiment_analysis?.overall || 'neutral',
            topics: m.meeting_insights[0].topics || []
          } : undefined,
          bot_session: m.meeting_bot_sessions?.[0]
        };
      });

      setMeetings(formattedMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      // Get total meetings
      const { count: totalMeetings } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', user.id);

      // Get analyzed meetings
      const { count: analyzedMeetings } = await supabase
        .from('meeting_insights')
        .select('meeting_id', { count: 'exact', head: true })
        .eq('analysis_status', 'completed');

      // Get total transcripts
      const { count: totalTranscripts } = await supabase
        .from('meeting_transcripts')
        .select('*', { count: 'exact', head: true });

      // Get action items count
      const { data: insights } = await supabase
        .from('meeting_insights')
        .select('action_items');
      
      const actionItemsCount = insights?.reduce((acc, insight) => {
        return acc + (Array.isArray(insight.action_items) ? insight.action_items.length : 0);
      }, 0) || 0;

      setStats({
        total_meetings: totalMeetings || 0,
        analyzed_meetings: analyzedMeetings || 0,
        total_transcripts: totalTranscripts || 0,
        hours_transcribed: Math.round((totalTranscripts || 0) * 0.75), // Estimate
        action_items_created: actionItemsCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('club_ai_notetaker_settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAutoJoinEnabled(settings.autoJoinEnabled ?? true);
        setNotificationsEnabled(settings.notificationsEnabled ?? true);
        setAutoAnalysisEnabled(settings.autoAnalysisEnabled ?? true);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  };

  const saveSettings = () => {
    const settings = {
      autoJoinEnabled,
      notificationsEnabled,
      autoAnalysisEnabled
    };
    localStorage.setItem('club_ai_notetaker_settings', JSON.stringify(settings));
    toast.success('Settings saved');
  };

  const filterMeetings = () => {
    let filtered = meetings;

    if (filterStatus === 'analyzed') {
      filtered = filtered.filter(m => m.has_insights);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(m => !m.has_insights && m.has_transcript);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.insights?.summary?.toLowerCase().includes(query) ||
        m.insights?.topics?.some(t => t.toLowerCase().includes(query))
      );
    }

    setFilteredMeetings(filtered);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500 bg-green-500/10';
      case 'negative': return 'text-red-500 bg-red-500/10';
      default: return 'text-yellow-500 bg-yellow-500/10';
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Bot className="h-10 w-10 text-purple-500" />
              Meeting Intelligence
            </h1>
            <p className="text-muted-foreground mt-2">
              All your meetings, transcribed and analyzed by Club AI
            </p>
          </div>
          <Button onClick={() => navigate('/meetings')} size="lg">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Meetings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_meetings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Analyzed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">{stats.analyzed_meetings}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total_meetings > 0 ? Math.round((stats.analyzed_meetings / stats.total_meetings) * 100) : 0}% analyzed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hours Transcribed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{stats.hours_transcribed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transcripts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{stats.total_transcripts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.action_items_created}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="meetings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="meetings">
              <Video className="h-4 w-4 mr-2" />
              Meetings
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Brain className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search meetings, topics, or insights..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filterStatus === 'all' ? 'default' : 'outline'}
                      onClick={() => setFilterStatus('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={filterStatus === 'analyzed' ? 'default' : 'outline'}
                      onClick={() => setFilterStatus('analyzed')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Analyzed
                    </Button>
                    <Button
                      variant={filterStatus === 'pending' ? 'default' : 'outline'}
                      onClick={() => setFilterStatus('pending')}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Pending
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meetings List */}
            {isLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bot className="h-12 w-12 mx-auto mb-4 animate-pulse text-purple-500" />
                  <p className="text-muted-foreground">Loading your meetings...</p>
                </CardContent>
              </Card>
            ) : filteredMeetings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterStatus !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Schedule your first meeting with Club AI Notetaker enabled'}
                  </p>
                  <Button onClick={() => navigate('/meetings')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredMeetings.map((meeting) => (
                  <Card key={meeting.id} className="hover:border-purple-500/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-xl">{meeting.title}</CardTitle>
                            {meeting.has_insights && (
                              <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Analyzed
                              </Badge>
                            )}
                            {meeting.bot_session && (
                              <Badge variant="outline">
                                <Bot className="h-3 w-3 mr-1" />
                                Club AI
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(meeting.scheduled_start), 'PPP')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(meeting.scheduled_start), 'p')}
                            </div>
                            {meeting.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {meeting.duration} min
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/meetings/${meeting.id}/insights`)}
                          disabled={!meeting.has_insights}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Insights
                        </Button>
                      </div>
                    </CardHeader>

                    {meeting.insights && (
                      <CardContent>
                        <div className="space-y-3">
                          {/* Summary Preview */}
                          <div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {meeting.insights.summary}
                            </p>
                          </div>

                          <Separator />

                          {/* Quick Stats */}
                          <div className="flex items-center gap-6 text-sm">
                            {meeting.insights.action_items.length > 0 && (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-orange-500" />
                                <span>{meeting.insights.action_items.length} action items</span>
                              </div>
                            )}
                            {meeting.insights.sentiment && (
                              <Badge variant="outline" className={getSentimentColor(meeting.insights.sentiment)}>
                                {meeting.insights.sentiment}
                              </Badge>
                            )}
                            {meeting.insights.topics.length > 0 && (
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                <span>{meeting.insights.topics.length} topics</span>
                              </div>
                            )}
                            {meeting.has_transcript && (
                              <Badge variant="outline">
                                <Download className="h-3 w-3 mr-1" />
                                Transcript
                              </Badge>
                            )}
                          </div>

                          {/* Topics */}
                          {meeting.insights.topics.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {meeting.insights.topics.slice(0, 5).map((topic, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Avg. Meeting Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {meetings.length > 0 
                      ? `${Math.round(meetings.reduce((acc, m) => acc + (m.duration || 0), 0) / meetings.length)} min`
                      : 'N/A'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Meetings This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-500">
                    {meetings.filter(m => {
                      const meetingDate = new Date(m.scheduled_start);
                      const now = new Date();
                      return meetingDate.getMonth() === now.getMonth() && 
                             meetingDate.getFullYear() === now.getFullYear();
                    }).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Analysis Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {meetings.length > 0 
                      ? `${Math.round((meetings.filter(m => m.has_insights).length / meetings.length) * 100)}%`
                      : '0%'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Top Discussion Topics
                </CardTitle>
                <CardDescription>
                  Most frequently discussed topics across your meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const topicCounts: Record<string, number> = {};
                  meetings.forEach(m => {
                    m.insights?.topics?.forEach(topic => {
                      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
                    });
                  });
                  const sortedTopics = Object.entries(topicCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);

                  if (sortedTopics.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No topics analyzed yet</p>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-wrap gap-2">
                      {sortedTopics.map(([topic, count]) => (
                        <Badge key={topic} variant="secondary" className="text-sm py-1.5 px-3">
                          {topic}
                          <span className="ml-2 text-muted-foreground">×{count}</span>
                        </Badge>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Sentiment Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  Sentiment Distribution
                </CardTitle>
                <CardDescription>
                  Overall sentiment across analyzed meetings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const sentiments = { positive: 0, neutral: 0, negative: 0 };
                  meetings.forEach(m => {
                    const s = m.insights?.sentiment;
                    if (s && s in sentiments) {
                      sentiments[s as keyof typeof sentiments]++;
                    }
                  });
                  const total = sentiments.positive + sentiments.neutral + sentiments.negative;

                  if (total === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No sentiment data available</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-sm">Positive</span>
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div 
                            className="bg-green-500 h-3 rounded-full transition-all" 
                            style={{ width: `${(sentiments.positive / total) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-sm text-right">{sentiments.positive}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-sm">Neutral</span>
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div 
                            className="bg-yellow-500 h-3 rounded-full transition-all" 
                            style={{ width: `${(sentiments.neutral / total) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-sm text-right">{sentiments.neutral}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-20 text-sm">Negative</span>
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div 
                            className="bg-red-500 h-3 rounded-full transition-all" 
                            style={{ width: `${(sentiments.negative / total) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 text-sm text-right">{sentiments.negative}</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-500" />
                  Club AI Notetaker Settings
                </CardTitle>
                <CardDescription>
                  Configure how Club AI joins and analyzes your meetings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-join">Auto-join meetings</Label>
                    <p className="text-sm text-muted-foreground">
                      Club AI will automatically join meetings when enabled during creation
                    </p>
                  </div>
                  <Switch
                    id="auto-join"
                    checked={autoJoinEnabled}
                    onCheckedChange={setAutoJoinEnabled}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="auto-analysis">Automatic analysis</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate insights, action items, and summaries after each meeting
                    </p>
                  </div>
                  <Switch
                    id="auto-analysis"
                    checked={autoAnalysisEnabled}
                    onCheckedChange={setAutoAnalysisEnabled}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="notifications">Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when meeting analysis is complete
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <Separator />

                <Button onClick={saveSettings} className="w-full">
                  Save Settings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About Club AI Notetaker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Real-time transcription
                  </h4>
                  <p className="text-sm text-muted-foreground pl-6">
                    Accurate speech-to-text during your meetings with speaker identification
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    AI-powered insights
                  </h4>
                  <p className="text-sm text-muted-foreground pl-6">
                    Automatic summaries, action items, decisions, and sentiment analysis
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Searchable transcripts
                  </h4>
                  <p className="text-sm text-muted-foreground pl-6">
                    Find any moment in your meetings with full-text search
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Action tracking
                  </h4>
                  <p className="text-sm text-muted-foreground pl-6">
                    Automatically create tasks from meeting action items
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
