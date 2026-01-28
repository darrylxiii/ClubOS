import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Calendar, 
  Video, 
  BookOpen,
  Building2,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from "date-fns";
import { motion } from "framer-motion";

interface UpcomingInterview {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  interview_type: string | null;
  video_meeting_link: string | null;
  quantum_meeting_link: string | null;
  job_id: string | null;
  job_title?: string;
  company_name?: string;
  status: string;
}

export function InterviewCountdownWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<UpcomingInterview | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNextInterview();
    }
  }, [user]);

  useEffect(() => {
    if (!interview) return;

    const updateCountdown = () => {
      const now = new Date();
      const start = new Date(interview.scheduled_start);
      const end = new Date(interview.scheduled_end);
      
      const hoursUntil = differenceInHours(start, now);
      const minutesUntil = differenceInMinutes(start, now);
      
      // Check if interview is live (between start and end)
      if (now >= start && now <= end) {
        setIsLive(true);
        setIsUrgent(true);
        setTimeLeft("Live Now");
        return;
      }
      
      setIsLive(false);
      
      // Urgent if less than 24 hours
      setIsUrgent(hoursUntil < 24 && hoursUntil >= 0);
      
      if (minutesUntil < 0) {
        setTimeLeft("Completed");
        return;
      }
      
      if (minutesUntil < 60) {
        setTimeLeft(`${minutesUntil} minutes`);
      } else if (hoursUntil < 24) {
        setTimeLeft(`${hoursUntil} hours`);
      } else {
        setTimeLeft(formatDistanceToNow(start, { addSuffix: false }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [interview]);

  const fetchNextInterview = async () => {
    if (!user) return;
    
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_start,
          scheduled_end,
          interview_type,
          video_meeting_link,
          quantum_meeting_link,
          job_id,
          status
        `)
        .eq('user_id', user.id)
        .eq('is_interview_booking', true)
        .in('status', ['confirmed', 'pending'])
        .gte('scheduled_end', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(1)
        .single();

      if (error || !bookings) {
        setInterview(null);
        return;
      }

      // Fetch job details if job_id exists
      let jobTitle = "Interview";
      let companyName = "";
      
      if (bookings.job_id) {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('title, companies:company_id(name)')
          .eq('id', bookings.job_id)
          .single();
        
        if (jobData) {
          jobTitle = jobData.title || "Interview";
          companyName = (jobData.companies as any)?.name || "";
        }
      }

      setInterview({
        ...bookings,
        job_title: jobTitle,
        company_name: companyName
      });
    } catch (error) {
      console.error('Error fetching interview:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMeetingLink = () => {
    if (!interview) return null;
    return interview.quantum_meeting_link || interview.video_meeting_link;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!interview) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            <Calendar className="w-5 h-5" />
            Next Interview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-3">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm">
              No upcoming interviews scheduled
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/jobs')}
            >
              Browse Open Roles
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meetingLink = getMeetingLink();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border-border/50 transition-all ${isUrgent ? 'ring-2 ring-warning/50' : ''} ${isLive ? 'ring-2 ring-success/50 animate-pulse' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
              <div className="w-1 h-6 bg-foreground"></div>
              <Calendar className="w-5 h-5" />
              Next Interview
            </CardTitle>
            {isLive ? (
              <Badge className="bg-success text-success-foreground animate-pulse">
                <Video className="w-3 h-3 mr-1" />
                Live Now
              </Badge>
            ) : isUrgent ? (
              <Badge variant="outline" className="border-warning text-warning">
                <AlertCircle className="w-3 h-3 mr-1" />
                Soon
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Countdown */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
            <Clock className={`w-8 h-8 ${isLive ? 'text-success' : isUrgent ? 'text-warning' : 'text-primary'}`} />
            <div>
              <p className="text-2xl font-bold tracking-tight">{timeLeft}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(interview.scheduled_start), "EEEE, MMM d 'at' h:mm a")}
              </p>
            </div>
          </div>

          {/* Job Details */}
          <div className="space-y-2">
            <h4 className="font-semibold truncate">{interview.job_title}</h4>
            {interview.company_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{interview.company_name}</span>
              </div>
            )}
            {interview.interview_type && (
              <Badge variant="outline" className="text-xs">
                {interview.interview_type}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isLive && meetingLink ? (
              <Button 
                className="flex-1 bg-success hover:bg-success/90"
                onClick={() => window.open(meetingLink, '_blank')}
              >
                <Video className="w-4 h-4 mr-2" />
                Join Meeting
              </Button>
            ) : (
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/interview-prep')}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Prepare
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/meetings')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
