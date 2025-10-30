import { UnifiedCalendarEvent } from "@/types/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Star, ExternalLink, Users } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface CalendarEventCardProps {
  event: UnifiedCalendarEvent;
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  const navigate = useNavigate();

  const timeString = `${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`;

  const getSourceBadge = () => {
    if (event.source === 'quantum_club') {
      return <Badge variant="default" className="gap-1">Quantum Club</Badge>;
    }
    if (event.source === 'google') {
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">Google</Badge>;
    }
    if (event.source === 'microsoft') {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600">Microsoft</Badge>;
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {event.has_club_ai && (
              <Star className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
            <h4 className="font-semibold truncate">{event.title}</h4>
          </div>

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeString}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>{event.attendees.length} attendees</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {getSourceBadge()}
            {event.has_club_ai && (
              <Badge variant="outline" className="gap-1">
                <Star className="h-3 w-3" />
                Club AI
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {event.is_quantum_club && event.meeting_id && (
            <>
              <Button size="sm" onClick={() => navigate(`/meetings/${event.meeting_id}`)}>
                View Details
              </Button>
              {event.insights_available && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/meetings/${event.meeting_id}/insights`)}
                >
                  View Insights
                </Button>
              )}
            </>
          )}
          {!event.is_quantum_club && (
            <Button size="sm" variant="outline" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
