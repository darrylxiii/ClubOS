import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, ArrowRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { T } from "@/components/T";
import { motion } from "framer-motion";
import { format, isToday, parseISO } from "date-fns";

interface TodayInterview {
  id: string;
  guest_name: string;
  guest_email: string;
  scheduled_start: string;
  video_meeting_link?: string;
}

export const InterviewTodayWidget = () => {
  const { user } = useAuth();

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['interviews-today', user?.id],
    queryFn: async (): Promise<TodayInterview[]> => {
      if (!user) return [];

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Query bookings for today
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, scheduled_start, video_meeting_link, guest_name, guest_email')
        .gte('scheduled_start', startOfDay)
        .lt('scheduled_start', endOfDay)
        .order('scheduled_start', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error fetching today interviews:', error);
        return [];
      }

      return (bookings || []).map((booking) => ({
        id: booking.id,
        guest_name: booking.guest_name || 'Unknown',
        guest_email: booking.guest_email || '',
        scheduled_start: booking.scheduled_start,
        video_meeting_link: booking.video_meeting_link || undefined,
      }));
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const upcomingInterviews = interviews?.filter(i => {
    const interviewTime = parseISO(i.scheduled_start);
    return interviewTime > new Date();
  }) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <T k="common:meetings.todayInterviews" fallback="Today's Interviews" />
              {interviews && interviews.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                  {interviews.length}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/meetings">
                <T k="common:actions.viewAll" fallback="View All" />
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interviews && interviews.length > 0 ? (
            <div className="space-y-3">
            {interviews.map((interview) => {
                const interviewTime = parseISO(interview.scheduled_start);
                const isPast = interviewTime < new Date();
                const isUpcoming = !isPast && interviewTime.getTime() - Date.now() < 30 * 60 * 1000; // within 30 mins

                return (
                  <div
                    key={interview.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isUpcoming 
                        ? 'border-primary/50 bg-primary/5' 
                        : isPast 
                          ? 'border-muted bg-muted/20 opacity-60' 
                          : 'border-border/50 hover:border-border'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isUpcoming ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      <User className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{interview.guest_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{interview.guest_email}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" />
                          {format(interviewTime, 'HH:mm')}
                        </div>
                      </div>
                    </div>

                    {interview.video_meeting_link && !isPast && (
                      <Button size="sm" variant={isUpcoming ? "default" : "outline"} asChild>
                        <a href={interview.video_meeting_link} target="_blank" rel="noopener noreferrer">
                          <Video className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">
                            <T k="common:meetings.join" fallback="Join" />
                          </span>
                        </a>
                      </Button>
                    )}

                    {isPast && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        <T k="common:status.completed" fallback="Done" />
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                <T k="common:meetings.noInterviewsToday" fallback="No interviews scheduled for today" />
              </p>
              <Button variant="link" size="sm" asChild className="mt-2">
                <Link to="/meetings">
                  <T k="common:meetings.viewSchedule" fallback="View full schedule" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
