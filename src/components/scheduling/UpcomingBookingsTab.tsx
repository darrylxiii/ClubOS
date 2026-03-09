import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import type { Booking } from '@/hooks/useBookingLinks';

interface UpcomingBookingsTabProps {
  bookings: Booking[];
}

export function UpcomingBookingsTab({ bookings }: UpcomingBookingsTabProps) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No upcoming bookings</p>
          <p className="text-muted-foreground">Your confirmed meetings will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {bookings.map((booking) => {
        const startDate = new Date(booking.scheduled_start);
        const endDate = new Date(booking.scheduled_end);

        return (
          <Card key={booking.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{booking.guest_name}</CardTitle>
                  <CardDescription>{booking.guest_email}</CardDescription>
                </div>
                <Badge>{booking.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {startDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
