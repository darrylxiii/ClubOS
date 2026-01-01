import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Clock, Video, User, Building, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CRMProspect } from '@/types/crm-enterprise';

interface ScheduleMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  prospect: CRMProspect;
  onMeetingScheduled?: () => void;
}

interface BookingLink {
  id: string;
  title: string;
  slug: string;
  duration_minutes: number;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export function ScheduleMeetingDialog({
  open,
  onClose,
  prospect,
  onMeetingScheduled,
}: ScheduleMeetingDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load booking links for the current user
  useEffect(() => {
    if (open) {
      loadBookingLinks();
    }
  }, [open]);

  // Load available slots when date or link changes
  useEffect(() => {
    if (selectedDate && selectedLinkId) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedLinkId]);

  const loadBookingLinks = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('booking_links')
        .select('id, title, slug, duration_minutes')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookingLinks(data || []);
      
      if (data && data.length > 0) {
        setSelectedLinkId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading booking links:', err);
      toast.error('Failed to load booking links');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedLinkId) return;
    
    setLoadingSlots(true);
    try {
      const selectedLink = bookingLinks.find(l => l.id === selectedLinkId);
      if (!selectedLink) return;

      const response = await supabase.functions.invoke('get-available-slots', {
        body: {
          booking_link_slug: selectedLink.slug,
          date: format(selectedDate, 'yyyy-MM-dd'),
        },
      });

      if (response.error) throw response.error;
      
      setAvailableSlots(response.data?.slots || []);
    } catch (err) {
      console.error('Error loading slots:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedDate || !selectedTime || !selectedLinkId) {
      toast.error('Please select a date and time');
      return;
    }

    setSubmitting(true);
    try {
      const selectedLink = bookingLinks.find(l => l.id === selectedLinkId);
      if (!selectedLink) throw new Error('Booking link not found');

      // Create booking via edge function
      const response = await supabase.functions.invoke('create-booking', {
        body: {
          booking_link_slug: selectedLink.slug,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          guest_name: prospect.full_name,
          guest_email: prospect.email,
          guest_phone: prospect.phone,
          notes: notes || `CRM Meeting with ${prospect.full_name} from ${prospect.company_name}`,
          metadata: {
            source: 'crm',
            prospect_id: prospect.id,
            company_name: prospect.company_name,
          },
        },
      });

      if (response.error) throw response.error;

      // Update prospect stage to meeting_booked
      await supabase
        .from('crm_prospects')
        .update({
          stage: 'meeting_booked',
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', prospect.id);

      // Create activity record
      await supabase
        .from('crm_activities')
        .insert({
          prospect_id: prospect.id,
          activity_type: 'meeting',
          subject: `Meeting scheduled: ${selectedLink.title}`,
          description: notes,
          due_date: format(selectedDate, 'yyyy-MM-dd'),
          due_time: selectedTime,
          duration_minutes: selectedLink.duration_minutes,
        });

      toast.success('Meeting scheduled successfully');
      onMeetingScheduled?.();
      onClose();
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      toast.error('Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLink = bookingLinks.find(l => l.id === selectedLinkId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Schedule Meeting
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 overflow-hidden">
          {/* Left: Prospect Info + Booking Link Selection */}
          <div className="md:w-1/2 space-y-4">
            {/* Prospect Summary */}
            <div className="p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{prospect.full_name}</p>
                  <p className="text-sm text-muted-foreground">{prospect.email}</p>
                </div>
              </div>
              {prospect.company_name && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Building className="w-4 h-4" />
                  {prospect.company_name}
                </div>
              )}
            </div>

            {/* Booking Link Selection */}
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              {loading ? (
                <Skeleton className="h-10 w-full" />
              ) : bookingLinks.length > 0 ? (
                <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookingLinks.map((link) => (
                      <SelectItem key={link.id} value={link.id}>
                        {link.title} ({link.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-amber-500/10 rounded-lg">
                  No booking links found. Create one in Settings → Scheduling.
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Meeting Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this meeting..."
                rows={3}
              />
            </div>

            {/* Calendar */}
            <div className="border rounded-lg p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 60)}
                className="rounded-md"
              />
            </div>
          </div>

          {/* Right: Time Slots */}
          <div className="md:w-1/2">
            <Label className="mb-2 block">Available Times</Label>
            {!selectedDate ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <CalendarIcon className="w-8 h-8 mr-2 opacity-50" />
                <span>Select a date</span>
              </div>
            ) : loadingSlots ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : availableSlots.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-2 pr-4">
                  {availableSlots.filter(s => s.available).map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {slot.time}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <span>No available slots for this date</span>
              </div>
            )}

            {selectedDate && selectedTime && selectedLink && (
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm font-medium">Meeting Summary</p>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
                </p>
                <Badge variant="secondary" className="mt-1">
                  {selectedLink.duration_minutes} minutes
                </Badge>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSchedule} 
            disabled={submitting || !selectedDate || !selectedTime || !selectedLinkId}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Schedule Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
