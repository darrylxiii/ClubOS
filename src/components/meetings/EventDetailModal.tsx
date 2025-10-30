import { UnifiedCalendarEvent } from "@/types/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JoinMeetingButton } from "./JoinMeetingButton";
import { getMeetingStatus } from "@/utils/meetingStatus";
import { format } from "date-fns";
import { 
  Clock, MapPin, Users, Star, Copy, ExternalLink, 
  Calendar, Sparkles, FileText 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface EventDetailModalProps {
  event: UnifiedCalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailModal({ event, open, onOpenChange }: EventDetailModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!event) return null;

  const statusInfo = getMeetingStatus(event);
  const duration = Math.round((event.end.getTime() - event.start.getTime()) / 60000);

  const copyMeetingLink = () => {
    if (event.is_quantum_club && event.meeting_id) {
      const link = `${window.location.origin}/meetings/${event.meeting_id}`;
      navigator.clipboard.writeText(link);
      toast({
        title: "Link copied",
        description: "Meeting link copied to clipboard",
      });
    }
  };

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
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Google Calendar</Badge>;
    }
    if (event.source === 'microsoft') {
      return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Microsoft Calendar</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {event.has_club_ai && (
                  <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
                )}
                <DialogTitle className="text-2xl">{event.title}</DialogTitle>
              </div>
              <DialogDescription className="text-base">
                {statusInfo.description}
              </DialogDescription>
            </div>
            {getSourceBadge()}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meeting Status */}
          {event.is_quantum_club && (
            <div className="flex items-center gap-3">
              <JoinMeetingButton event={event} size="lg" className="flex-1" />
              {event.insights_available && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate(`/meetings/${event.meeting_id}/insights`)}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Insights
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Time & Duration */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">
                  {format(event.start, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="text-muted-foreground">
                  {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')} ({duration} min)
                </div>
              </div>
            </div>

            {event.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 truncate">{event.location}</div>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3 text-sm">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium mb-2">{event.attendees.length} attendees</div>
                  <div className="flex flex-wrap gap-2">
                    {event.attendees.slice(0, 5).map((email, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{email}</span>
                      </div>
                    ))}
                    {event.attendees.length > 5 && (
                      <div className="flex items-center px-3 py-1 text-xs text-muted-foreground">
                        +{event.attendees.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            </>
          )}

          {/* Club AI Badge */}
          {event.has_club_ai && (
            <>
              <Separator />
              <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Club AI Notetaker Active</div>
                  <div className="text-xs text-muted-foreground">
                    AI will join, record, and analyze this meeting
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {event.is_quantum_club && event.meeting_id && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyMeetingLink}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/meetings/${event.meeting_id}`)}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Details
                </Button>
              </>
            )}
            {!event.is_quantum_club && (
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open in {event.source === 'google' ? 'Google' : 'Microsoft'} Calendar
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Add to Calendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
