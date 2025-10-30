import { UnifiedCalendarEvent } from "@/types/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Star, ExternalLink, Users, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { JoinMeetingButton } from "./JoinMeetingButton";
import { isLiveMeeting } from "@/utils/meetingStatus";
import { cn } from "@/lib/utils";

interface CalendarEventCardProps {
  event: UnifiedCalendarEvent;
  onClick?: () => void;
  compact?: boolean;
}

export function CalendarEventCard({ event, onClick, compact = false }: CalendarEventCardProps) {
  const timeString = `${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`;
  const isLive = isLiveMeeting(event);

  const getSourceBadge = () => {
    if (event.source === 'quantum_club') {
      return (
        <Badge className="gap-1 bg-primary/10 text-primary border-primary/20">
          <Star className="h-3 w-3" />
          Quantum Club
        </Badge>
      );
    }
    if (event.source === 'google') {
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Google</Badge>;
    }
    if (event.source === 'microsoft') {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Microsoft</Badge>;
    }
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.02] cursor-pointer",
        isLive && "ring-2 ring-red-500 ring-offset-2",
        compact ? "p-3" : "p-4"
      )}
      onClick={onClick}
    >
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
      )}
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {isLive && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-semibold text-red-600 uppercase">Live</span>
              </div>
            )}
            {event.has_club_ai && (
              <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
            <h4 className={cn("font-semibold truncate", compact && "text-sm")}>{event.title}</h4>
          </div>

          <div className={cn("flex flex-col gap-1.5 mb-3", compact ? "text-xs" : "text-sm", "text-muted-foreground")}>
            <div className="flex items-center gap-2">
              <Clock className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
              <span>{timeString}</span>
            </div>
            {event.location && !compact && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.attendees && event.attendees.length > 0 && !compact && (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {getSourceBadge()}
            {event.has_club_ai && (
              <Badge variant="outline" className="gap-1 border-amber-500/20 bg-amber-500/5">
                <Sparkles className="h-3 w-3" />
                Club AI
              </Badge>
            )}
          </div>
        </div>

        {!compact && (
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            {event.is_quantum_club && event.meeting_id ? (
              <JoinMeetingButton event={event} size="sm" />
            ) : (
              <button className="px-3 py-1.5 text-sm rounded-lg border border-border/50 hover:bg-muted/50 transition-colors flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
