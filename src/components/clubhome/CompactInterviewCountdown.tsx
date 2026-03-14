import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Video, BookOpen, Clock } from "lucide-react";
import { format, differenceInHours, differenceInMinutes, differenceInDays } from "date-fns";

interface Interview {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  video_meeting_link: string | null;
  quantum_meeting_link: string | null;
  job_title: string;
  company_name: string;
}

export function CompactInterviewCountdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState("");
  const [isLive, setIsLive] = useState(false);

  const { data: interview } = useQuery({
    queryKey: ['compact-interview', user?.id],
    queryFn: async () => {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, scheduled_start, scheduled_end, video_meeting_link, quantum_meeting_link, job_id')
        .eq('user_id', user!.id)
        .eq('is_interview_booking', true)
        .in('status', ['confirmed', 'pending'])
        .gte('scheduled_end', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!booking) return null;

      let jobTitle = "Interview";
      let companyName = "";

      if (booking.job_id) {
        const { data: job } = await supabase
          .from('jobs')
          .select('title, companies:company_id(name)')
          .eq('id', booking.job_id)
          .maybeSingle();
        if (job) {
          jobTitle = job.title || "Interview";
          companyName = (job.companies as any)?.name || "";
        }
      }

      // Only show if within 7 days
      const daysUntil = differenceInDays(new Date(booking.scheduled_start), new Date());
      if (daysUntil > 7) return null;

      return {
        ...booking,
        job_title: jobTitle,
        company_name: companyName,
      } as Interview;
    },
    enabled: !!user,
    staleTime: 2 * 60_000,
  });

  useEffect(() => {
    if (!interview) return;

    const tick = () => {
      const now = new Date();
      const start = new Date(interview.scheduled_start);
      const end = new Date(interview.scheduled_end);

      if (now >= start && now <= end) {
        setIsLive(true);
        setTimeLeft("Live now");
        return;
      }
      setIsLive(false);

      const mins = differenceInMinutes(start, now);
      const hrs = differenceInHours(start, now);

      if (mins < 0) { setTimeLeft(""); return; }
      if (mins < 60) setTimeLeft(`in ${mins}m`);
      else if (hrs < 24) setTimeLeft(`in ${hrs}h`);
      else setTimeLeft(format(start, "EEE, MMM d 'at' h:mm a"));
    };

    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [interview]);

  if (!interview || !timeLeft) return null;

  const meetingLink = interview.quantum_meeting_link || interview.video_meeting_link;

  return (
    <div className={`glass-subtle rounded-2xl px-5 py-3.5 flex items-center gap-3 ${isLive ? 'ring-1 ring-success/40' : ''}`}>
      <Clock className={`h-4 w-4 shrink-0 ${isLive ? 'text-success' : 'text-muted-foreground'}`} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">
          {interview.job_title}
          {interview.company_name && <span className="text-muted-foreground"> · {interview.company_name}</span>}
        </span>
      </div>
      <span className={`text-xs font-medium shrink-0 ${isLive ? 'text-success' : 'text-muted-foreground'}`}>
        {timeLeft}
      </span>
      {isLive && meetingLink ? (
        <Button size="sm" variant="success" className="shrink-0 h-8" onClick={() => window.open(meetingLink, '_blank')}>
          <Video className="h-3.5 w-3.5 mr-1" />
          Join
        </Button>
      ) : (
        <Button size="sm" variant="ghost" className="shrink-0 h-8" onClick={() => navigate('/jobs?tab=interview-prep')}>
          <BookOpen className="h-3.5 w-3.5 mr-1" />
          Prepare
        </Button>
      )}
    </div>
  );
}
