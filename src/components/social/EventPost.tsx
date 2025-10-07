import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ExternalLink, Users } from "lucide-react";
import { format } from "date-fns";

interface EventPostProps {
  title: string;
  description: string;
  eventDate: string;
  location?: string;
  eventLink?: string;
  attendeeCount?: number;
  imageUrl?: string;
}

export const EventPost = ({
  title,
  description,
  eventDate,
  location,
  eventLink,
  attendeeCount = 0,
  imageUrl,
}: EventPostProps) => {
  const isPastEvent = new Date(eventDate) < new Date();

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
      {imageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <Badge className="absolute top-4 right-4 bg-primary">
            {isPastEvent ? "Past Event" : "Upcoming"}
          </Badge>
        </div>
      )}
      
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {format(new Date(eventDate), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </span>
          </div>

          {location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{location}</span>
            </div>
          )}

          {attendeeCount > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span>{attendeeCount.toLocaleString()} attending</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" disabled={isPastEvent}>
            {isPastEvent ? "Event Ended" : "Interested"}
          </Button>
          {eventLink && (
            <Button variant="outline" asChild>
              <a href={eventLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Details
              </a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
