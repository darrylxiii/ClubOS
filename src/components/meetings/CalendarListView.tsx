import { UnifiedCalendarEvent } from "@/types/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Clock, MapPin, Users, Star, Sparkles, 
  Search, Download, ChevronDown, ChevronRight 
} from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { useState, useMemo } from "react";
import { JoinMeetingButton } from "./JoinMeetingButton";
import { cn } from "@/lib/utils";

interface CalendarListViewProps {
  events: UnifiedCalendarEvent[];
  onEventClick: (event: UnifiedCalendarEvent) => void;
}

export function CalendarListView({ events, onEventClick }: CalendarListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return events;
    
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, UnifiedCalendarEvent[]>();
    
    filteredEvents.forEach(event => {
      const dateKey = format(startOfDay(event.start), 'yyyy-MM-dd');
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    });

    return Array.from(groups.entries()).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );
  }, [filteredEvents]);

  const getSourceBadge = (event: UnifiedCalendarEvent) => {
    if (event.source === 'quantum_club') {
      return (
        <Badge variant="default" className="gap-1">
          <Star className="h-3 w-3" />
          Quantum Club
        </Badge>
      );
    }
    if (event.source === 'google') {
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">Google</Badge>;
    }
    if (event.source === 'microsoft') {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600">Microsoft</Badge>;
    }
  };

  const toggleExpand = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </Card>

      {/* Events List */}
      {groupedEvents.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No events found matching your search' : 'No events scheduled'}
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedEvents.map(([dateKey, dayEvents]) => {
            const date = new Date(dateKey);
            const isToday = isSameDay(date, new Date());

            return (
              <div key={dateKey} className="space-y-3">
                <div className={cn(
                  "sticky top-0 z-10 py-2 px-4 bg-card/80 backdrop-blur-sm rounded-lg border",
                  isToday && "border-primary/50 bg-primary/5"
                )}>
                  <h3 className="font-semibold flex items-center gap-2">
                    {format(date, 'EEEE, MMMM d, yyyy')}
                    {isToday && <Badge variant="default">Today</Badge>}
                    <span className="text-sm text-muted-foreground font-normal ml-auto">
                      {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                </div>

                <div className="space-y-2">
                  {dayEvents.map(event => {
                    const isExpanded = expandedEventId === event.id;
                    const duration = Math.round((event.end.getTime() - event.start.getTime()) / 60000);

                    return (
                      <Card key={event.id} className="overflow-hidden transition-all hover:shadow-md">
                        <button
                          onClick={() => toggleExpand(event.id)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-start gap-4">
                            {/* Time */}
                            <div className="flex-shrink-0 w-24 text-center">
                              <div className="text-sm font-semibold">
                                {format(event.start, 'h:mm a')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {duration} min
                              </div>
                            </div>

                            {/* Event Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {event.has_club_ai && (
                                  <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                                )}
                                <h4 className="font-semibold truncate">{event.title}</h4>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate max-w-[200px]">{event.location}</span>
                                  </div>
                                )}
                                {event.attendees && event.attendees.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{event.attendees.length}</span>
                                  </div>
                                )}
                                {getSourceBadge(event)}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex-shrink-0">
                              {event.is_quantum_club ? (
                                <JoinMeetingButton event={event} size="sm" />
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick(event);
                                  }}
                                >
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-3 animate-in slide-in-from-top-2">
                            {event.description && (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {event.description}
                              </p>
                            )}
                            {event.attendees && event.attendees.length > 0 && (
                              <div>
                                <div className="text-sm font-medium mb-2">Attendees</div>
                                <div className="flex flex-wrap gap-2">
                                  {event.attendees.slice(0, 10).map((email, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {email}
                                    </Badge>
                                  ))}
                                  {event.attendees.length > 10 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{event.attendees.length - 10} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick(event);
                                }}
                              >
                                Full Details
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
