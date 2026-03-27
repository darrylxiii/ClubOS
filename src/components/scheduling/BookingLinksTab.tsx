import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Copy, ExternalLink, Settings, Trash2, Video, Users, Shield, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import type { BookingLink } from '@/hooks/useBookingLinks';
import { useToggleBookingLink, useDeleteBookingLink } from '@/hooks/useBookingLinks';

interface BookingLinksTabProps {
  bookingLinks: BookingLink[];
}

export function BookingLinksTab({ bookingLinks }: BookingLinksTabProps) {
  const { t } = useTranslation('common');
  const toggleLink = useToggleBookingLink();
  const deleteLink = useDeleteBookingLink();

  const copyBookingUrl = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success(t("booking_url_copied_to", "Booking URL copied to clipboard"));
  };

  if (bookingLinks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">{t("no_booking_links_yet", "No booking links yet")}</p>
          <p className="text-muted-foreground">{t("create_your_first_link", "Create your first link to start accepting bookings")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {bookingLinks.map((link) => (
        <Card key={link.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle>{link.title}</CardTitle>
                  <Badge variant={link.is_active ? 'default' : 'secondary'}>
                    {link.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {link.description && (
                  <CardDescription className="mt-2">{link.description}</CardDescription>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {link.duration_minutes} min
                  </span>
                  {link.scheduling_type !== 'individual' && (
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {link.scheduling_type === 'round_robin' ? 'Round Robin' : 'Group'}
                    </span>
                  )}
                  {link.video_conferencing_provider && (
                    <span className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      {link.video_conferencing_provider === 'google_meet' ? 'Google Meet' : 
                       link.video_conferencing_provider === 'zoom' ? 'Zoom' : 'Teams'}
                    </span>
                  )}
                  {link.requires_approval && (
                    <span className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      Approval Required
                    </span>
                  )}
                  {link.single_use && (
                    <span className="flex items-center gap-1">
                      <Repeat className="h-4 w-4" />
                      Single Use
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => copyBookingUrl(link.slug)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => window.open(`/book/${link.slug}`, '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => toggleLink.mutate({ id: link.id, isActive: link.is_active })}>
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this booking link?')) {
                      deleteLink.mutate(link.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <code className="flex-1 text-sm">
                {window.location.origin}/book/{link.slug}
              </code>
              <Button variant="ghost" size="sm" onClick={() => copyBookingUrl(link.slug)}>
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
