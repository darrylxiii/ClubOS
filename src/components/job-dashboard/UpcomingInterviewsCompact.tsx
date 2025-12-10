import { useState, useEffect, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Video, MapPin, Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ManualInterviewEntryDialog } from "./ManualInterviewEntryDialog";

interface Interview {
  id: string;
  scheduled_start: string;
  interview_type: string;
  location?: string;
  candidate_name: string;
  candidate_avatar?: string;
  application_id?: string;
}

interface UpcomingInterviewsCompactProps {
  jobId: string;
  limit?: number;
}

export const UpcomingInterviewsCompact = memo(({ jobId, limit = 3 }: UpcomingInterviewsCompactProps) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchInterviews = async () => {
    try {
      const now = new Date().toISOString();
      
      // Query the interviews table, joining with applications to get candidate info
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          id,
          scheduled_start,
          interview_type,
          location,
          application_id,
          applications!inner (
            job_id,
            candidate_full_name,
            candidate_profiles (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('applications.job_id', jobId)
        .gte('scheduled_start', now)
        .order('scheduled_start', { ascending: true })
        .limit(limit);
      
      if (!error && data) {
        const mappedInterviews: Interview[] = data.map((interview: any) => ({
          id: interview.id,
          scheduled_start: interview.scheduled_start,
          interview_type: interview.interview_type || 'video',
          location: interview.location,
          application_id: interview.application_id,
          candidate_name: interview.applications?.candidate_profiles?.full_name 
            || interview.applications?.candidate_full_name 
            || 'Candidate',
          candidate_avatar: interview.applications?.candidate_profiles?.avatar_url
        }));
        setInterviews(mappedInterviews);
      }
    } catch (err) {
      console.error('Error fetching interviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    if (type?.includes('video') || type?.includes('online') || type === 'video') return Video;
    return MapPin;
  };

  const handleInterviewAdded = () => {
    setShowAddDialog(false);
    fetchInterviews();
  };

  return (
    <Card className="border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Upcoming Interviews
          </h4>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Interview</DialogTitle>
              </DialogHeader>
              <ManualInterviewEntryDialog 
                jobId={jobId} 
                onSuccess={handleInterviewAdded}
                onClose={() => setShowAddDialog(false)}
              />
            </DialogContent>
          </Dialog>
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
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 h-7 text-xs"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Schedule Interview
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {interviews.map((interview) => {
              const Icon = getInterviewIcon(interview.interview_type);
              const initials = interview.candidate_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
              
              return (
                <div 
                  key={interview.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-background/40 border border-border/20 hover:bg-background/60 transition-all cursor-pointer group"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={interview.candidate_avatar} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{interview.candidate_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatInterviewDate(interview.scheduled_start)}</span>
                      <span>•</span>
                      <span>{formatInterviewTime(interview.scheduled_start)}</span>
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
