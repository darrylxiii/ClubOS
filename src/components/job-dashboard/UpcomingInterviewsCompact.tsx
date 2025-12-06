import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, MapPin, Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

interface UpcomingInterviewsCompactProps {
  jobId: string;
  limit?: number;
}

export const UpcomingInterviewsCompact = memo(({ jobId, limit = 3 }: UpcomingInterviewsCompactProps) => {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await (supabase as any)
          .from('job_interviews')
          .select(`
            id,
            scheduled_at,
            interview_type,
            location,
            candidate_profiles (
              full_name,
              avatar_url
            )
          `)
          .eq('job_id', jobId)
          .gte('scheduled_at', now)
          .order('scheduled_at', { ascending: true })
          .limit(limit);
        
        if (!error) {
          setInterviews(data || []);
        }
      } catch (err) {
        console.error('Error fetching interviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [jobId, limit]);

  const formatInterviewDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const formatInterviewTime = (dateStr: string) => {
    return format(parseISO(dateStr), 'h:mm a');
  };

  const getInterviewIcon = (type: string) => {
    if (type?.includes('video') || type?.includes('online')) return Video;
    return MapPin;
  };

  return (
    <Card className="border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Upcoming Interviews
          </h4>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>
        
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-center py-4">
            <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">No upcoming interviews</p>
          </div>
        ) : (
          <div className="space-y-2">
            {interviews.map((interview) => {
              const Icon = getInterviewIcon(interview.interview_type);
              const candidateName = interview.candidate_profiles?.full_name || 'Candidate';
              const initials = candidateName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
              
              return (
                <div 
                  key={interview.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-background/40 border border-border/20 hover:bg-background/60 transition-all cursor-pointer group"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={interview.candidate_profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{candidateName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatInterviewDate(interview.scheduled_at)}</span>
                      <span>•</span>
                      <span>{formatInterviewTime(interview.scheduled_at)}</span>
                    </div>
                  </div>
                  
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

UpcomingInterviewsCompact.displayName = 'UpcomingInterviewsCompact';
