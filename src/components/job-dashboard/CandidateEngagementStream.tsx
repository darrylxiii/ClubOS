import { memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity, Eye, FileText, MessageSquare, CheckCircle, XCircle, Clock, Video, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface EngagementEvent {
  id: string;
  type: 'profile_view' | 'assessment_complete' | 'message_sent' | 'application_submitted' | 'interview_scheduled' | 'withdrawal' | 'document_upload';
  candidateName: string;
  candidateAvatar?: string;
  timestamp: Date;
  details?: string;
}

interface CandidateEngagementStreamProps {
  jobId: string;
}

export const CandidateEngagementStream = memo(({ jobId }: CandidateEngagementStreamProps) => {
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time events - in production would use Supabase realtime
  useEffect(() => {
    // Initial mock events
    const mockEvents: EngagementEvent[] = [
      {
        id: '1',
        type: 'assessment_complete',
        candidateName: 'Sarah Chen',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        details: 'Technical Assessment - Score: 92%'
      },
      {
        id: '2',
        type: 'interview_scheduled',
        candidateName: 'Marcus Johnson',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        details: 'Panel Interview - Tomorrow 2pm'
      },
      {
        id: '3',
        type: 'profile_view',
        candidateName: 'Emma Williams',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        details: 'Viewed job description 3 times'
      },
      {
        id: '4',
        type: 'document_upload',
        candidateName: 'Alex Rivera',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        details: 'Portfolio uploaded'
      },
      {
        id: '5',
        type: 'message_sent',
        candidateName: 'Jordan Lee',
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        details: 'Responded to follow-up'
      }
    ];
    
    setEvents(mockEvents);

    // Simulate new event coming in
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newEventTypes: EngagementEvent['type'][] = ['profile_view', 'message_sent', 'document_upload'];
        const names = ['Taylor Swift', 'Chris Martin', 'Amy Zhang', 'David Kim'];
        
        const newEvent: EngagementEvent = {
          id: Date.now().toString(),
          type: newEventTypes[Math.floor(Math.random() * newEventTypes.length)],
          candidateName: names[Math.floor(Math.random() * names.length)],
          timestamp: new Date(),
          details: 'New activity detected'
        };
        
        setEvents(prev => [newEvent, ...prev.slice(0, 4)]);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [jobId]);

  const getEventIcon = (type: EngagementEvent['type']) => {
    switch (type) {
      case 'profile_view': return <Eye className="w-3.5 h-3.5" />;
      case 'assessment_complete': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'message_sent': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'application_submitted': return <FileText className="w-3.5 h-3.5" />;
      case 'interview_scheduled': return <Video className="w-3.5 h-3.5" />;
      case 'withdrawal': return <XCircle className="w-3.5 h-3.5" />;
      case 'document_upload': return <FileText className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getEventColor = (type: EngagementEvent['type']) => {
    switch (type) {
      case 'assessment_complete': return 'bg-success/20 text-success border-success/30';
      case 'interview_scheduled': return 'bg-primary/20 text-primary border-primary/30';
      case 'withdrawal': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getEventLabel = (type: EngagementEvent['type']) => {
    switch (type) {
      case 'profile_view': return 'Viewed';
      case 'assessment_complete': return 'Completed';
      case 'message_sent': return 'Replied';
      case 'application_submitted': return 'Applied';
      case 'interview_scheduled': return 'Scheduled';
      case 'withdrawal': return 'Withdrew';
      case 'document_upload': return 'Uploaded';
      default: return 'Activity';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl border border-border/50 shadow-[var(--shadow-glass-lg)] overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div 
                className="relative p-2 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20"
                whileHover={{ scale: 1.05 }}
              >
                <Activity className="w-4 h-4 text-accent" />
                {isLive && (
                  <motion.div
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <div>
                <CardTitle className="text-base font-bold">Live Activity</CardTitle>
                <p className="text-xs text-muted-foreground">Real-time candidate engagement</p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`text-xs gap-1 ${isLive ? 'bg-success/10 text-success border-success/30' : 'bg-muted'}`}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-current"
                animate={isLive ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              {isLive ? 'Live' : 'Paused'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index === 0 ? 0 : 0
                  }}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-background/50 hover:bg-background/80 transition-all border border-transparent hover:border-border/30"
                >
                  {/* Avatar */}
                  <Avatar className="h-8 w-8 border border-border/30">
                    <AvatarImage src={event.candidateAvatar} />
                    <AvatarFallback className="text-xs bg-muted">
                      {event.candidateName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{event.candidateName}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 py-0 h-4 gap-1 ${getEventColor(event.type)}`}
                      >
                        {getEventIcon(event.type)}
                        {getEventLabel(event.type)}
                      </Badge>
                    </div>
                    {event.details && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {event.details}
                      </p>
                    )}
                  </div>
                  
                  {/* Time */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(event.timestamp, { addSuffix: false })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

CandidateEngagementStream.displayName = 'CandidateEngagementStream';
