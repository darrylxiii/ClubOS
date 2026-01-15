import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, TrendingUp, MessageSquare, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface MeetingWithInsights {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  insights?: {
    summary?: string;
    action_items?: any[];
    sentiment_analysis?: string;
    topics?: string[];
  };
}

export function MeetingIntelligenceTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingWithInsights[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<MeetingWithInsights[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMeetings();
    }
  }, [user]);

  useEffect(() => {
    filterMeetings();
  }, [searchQuery, meetings]);

  const loadMeetings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First, try to get meetings with insights from meeting_insights table
      const { data: meetingsWithInsights, error: insightsError } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          scheduled_end,
          meeting_insights(summary, action_items, sentiment_analysis, topics)
        `)
        .not('meeting_insights', 'is', null)
        .order('scheduled_start', { ascending: false })
        .limit(20);

      // Also get analyzed recordings with AI analysis
      const { data: analyzedRecordings, error: recordingsError } = await supabase
        .from('meeting_recordings_extended')
        .select(`
          id,
          meeting_id,
          title,
          created_at,
          duration_seconds,
          ai_analysis
        `)
        .eq('processing_status', 'completed')
        .not('ai_analysis', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (insightsError) throw insightsError;

      // Map meetings from both sources
      const meetingsFromInsights = (meetingsWithInsights || []).map((meeting: any) => ({
        id: meeting.id,
        title: meeting.title,
        scheduled_start: meeting.scheduled_start,
        scheduled_end: meeting.scheduled_end,
        insights: meeting.meeting_insights?.[0],
        source: 'insights'
      }));

      // Map analyzed recordings to meeting format
      const meetingsFromRecordings = (analyzedRecordings || [])
        .filter((rec: any) => rec.ai_analysis)
        .map((rec: any) => {
          const analysis = typeof rec.ai_analysis === 'string' 
            ? JSON.parse(rec.ai_analysis) 
            : rec.ai_analysis;
          
          return {
            id: rec.meeting_id || rec.id,
            title: rec.title || 'Meeting Recording',
            scheduled_start: rec.created_at,
            scheduled_end: new Date(new Date(rec.created_at).getTime() + (rec.duration_seconds || 0) * 1000).toISOString(),
            insights: {
              summary: analysis?.summary || analysis?.meeting_summary,
              action_items: analysis?.action_items || analysis?.actionItems || [],
              sentiment_analysis: analysis?.sentiment || analysis?.overall_sentiment,
              topics: analysis?.topics || analysis?.key_topics || []
            },
            source: 'recordings'
          };
        });

      // Merge and deduplicate by meeting_id, preferring recordings data
      const allMeetings = [...meetingsFromRecordings, ...meetingsFromInsights];
      const uniqueMeetings = Array.from(
        new Map(allMeetings.map(m => [m.id, m])).values()
      ).sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());

      setMeetings(uniqueMeetings);
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMeetings = () => {
    if (!searchQuery) {
      setFilteredMeetings(meetings);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = meetings.filter(meeting => 
      meeting.title.toLowerCase().includes(query) ||
      meeting.insights?.summary?.toLowerCase().includes(query) ||
      meeting.insights?.topics?.some(topic => topic.toLowerCase().includes(query))
    );

    setFilteredMeetings(filtered);
  };

  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return 'bg-muted';
    if (sentiment.toLowerCase().includes('positive')) return 'bg-green-500/10 text-green-600';
    if (sentiment.toLowerCase().includes('negative')) return 'bg-red-500/10 text-red-600';
    return 'bg-yellow-500/10 text-yellow-600';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings, transcripts, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No analyzed meetings found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search query"
                : "Meetings with Club AI will appear here after analysis"}
            </p>
          </Card>
        ) : (
          filteredMeetings.map(meeting => (
            <Card key={meeting.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/meetings/${meeting.id}/insights`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{meeting.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(meeting.scheduled_start), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {Math.round((new Date(meeting.scheduled_end).getTime() - new Date(meeting.scheduled_start).getTime()) / 60000)} min
                      </span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline">View Insights</Button>
              </div>

              {meeting.insights?.summary && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {meeting.insights.summary}
                </p>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {meeting.insights?.sentiment_analysis && (
                  <Badge variant="secondary" className={getSentimentColor(meeting.insights.sentiment_analysis)}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {meeting.insights.sentiment_analysis}
                  </Badge>
                )}
                {meeting.insights?.action_items && meeting.insights.action_items.length > 0 && (
                  <Badge variant="outline">
                    {meeting.insights.action_items.length} Action Items
                  </Badge>
                )}
                {meeting.insights?.topics && meeting.insights.topics.slice(0, 3).map((topic, idx) => (
                  <Badge key={idx} variant="secondary">{topic}</Badge>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
