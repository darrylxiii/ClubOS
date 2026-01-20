import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Calendar, Clock, Users, CheckCircle2 } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  date: Date;
  time: string;
  confidence: number;
  conflicts: number;
  reason: string;
}

interface SmartSchedulingPanelProps {
  interviewers: string[];
  candidateEmail?: string;
  duration: number;
  calendarConnectionId?: string;
  onSelectSlot: (slot: TimeSlot) => void;
}

export const SmartSchedulingPanel = ({
  interviewers,
  candidateEmail,
  duration,
  calendarConnectionId,
  onSelectSlot,
}: SmartSchedulingPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([]);
  const [usingGoogleCalendar, setUsingGoogleCalendar] = useState(false);

  useEffect(() => {
    if (interviewers.length > 0) {
      findOptimalSlots();
    }
  }, [interviewers, duration, calendarConnectionId]);

  const findOptimalSlots = async () => {
    setLoading(true);
    try {
      let busySlots: { start: string; end: string }[] = [];

      // Try to fetch real Google Calendar availability if connected
      if (calendarConnectionId) {
        try {
          const timeMin = new Date().toISOString();
          const timeMax = addDays(new Date(), 14).toISOString();

          const { data, error } = await supabase.functions.invoke('google-calendar-events', {
            body: {
              action: 'findFreeSlots',
              connectionId: calendarConnectionId,
              timeMin,
              timeMax,
            },
          });

          if (!error && data?.busySlots) {
            busySlots = data.busySlots;
            setUsingGoogleCalendar(true);
          }
        } catch (err) {
          console.error('Failed to fetch Google Calendar availability:', err);
        }
      }

      // Also fetch existing bookings for all interviewers
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('scheduled_start, scheduled_end, user_id')
        .in('user_id', interviewers)
        .gte('scheduled_start', new Date().toISOString())
        .lte('scheduled_start', addDays(new Date(), 14).toISOString())
        .eq('status', 'confirmed');

      if (bookingsError) throw bookingsError;

      // Combine Google Calendar busy slots with booking conflicts
      const allBusySlots = [
        ...busySlots,
        ...(bookings?.map((b) => ({
          start: b.scheduled_start,
          end: b.scheduled_end,
        })) || []),
      ];

      // Generate time slots for next 14 days
      const slots: TimeSlot[] = [];
      const today = new Date();

      // Business hours: 9 AM - 5 PM, Monday - Friday
      for (let day = 1; day <= 14; day++) {
        const date = addDays(today, day);
        const dayOfWeek = date.getDay();

        // Skip weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        // Check each hour slot
        for (let hour = 9; hour <= 17 - duration / 60; hour++) {
          const slotStart = setMinutes(setHours(date, hour), 0);
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);

          // Check for conflicts with busy slots
          const conflicts = allBusySlots.filter((busy) => {
            const busyStart = new Date(busy.start);
            const busyEnd = new Date(busy.end);
            return (
              (slotStart >= busyStart && slotStart < busyEnd) ||
              (slotEnd > busyStart && slotEnd <= busyEnd) ||
              (slotStart <= busyStart && slotEnd >= busyEnd)
            );
          }).length;

          // Calculate confidence score
          let confidence = 100;
          confidence -= conflicts * 30; // Penalty for each conflict
          if (hour < 10 || hour > 15) confidence -= 10; // Prefer mid-day slots
          if (dayOfWeek === 1 || dayOfWeek === 5) confidence -= 5; // Slight penalty for Mon/Fri

          // Only include slots with no conflicts or minimal conflicts
          if (conflicts === 0) {
            slots.push({
              date: slotStart,
              time: format(slotStart, 'HH:mm'),
              confidence: Math.max(confidence, 0),
              conflicts,
              reason: getReasonText(conflicts, interviewers.length, hour, usingGoogleCalendar),
            });
          }
        }
      }

      // Sort by confidence and take top 5
      const topSlots = slots
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      setSuggestedSlots(topSlots);
    } catch (error) {
      console.error('Error finding optimal slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReasonText = (conflicts: number, totalInterviewers: number, hour: number, usingCalendar: boolean) => {
    let reason = '';
    
    if (usingCalendar) {
      reason = 'Available on your Google Calendar';
    } else {
      const available = totalInterviewers - conflicts;
      reason = `${available}/${totalInterviewers} interviewers available`;
    }

    if (conflicts === 0) {
      reason += ' • No conflicts';
    }

    if (hour >= 10 && hour <= 14) {
      reason += ' • Optimal time';
    }

    return reason;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90)
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Excellent</Badge>
      );
    if (confidence >= 70)
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Good</Badge>;
    if (confidence >= 50)
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Fair</Badge>;
    return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Limited</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Scheduling Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">
              {calendarConnectionId 
                ? 'Checking your Google Calendar availability...' 
                : `Analyzing ${interviewers.length} interviewer${interviewers.length !== 1 ? 's' : ''} availability...`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-primary" />
          Smart Scheduling Assistant
          {usingGoogleCalendar && (
            <Badge variant="outline" className="ml-2 text-xs">
              Google Calendar
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {usingGoogleCalendar 
            ? 'AI-suggested slots based on your Google Calendar availability'
            : 'AI-suggested time slots based on booking availability'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestedSlots.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No available slots found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting the duration or selecting different interviewers
            </p>
          </div>
        ) : (
          suggestedSlots.map((slot, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{format(slot.date, 'EEEE, MMM d')}</span>
                  {index === 0 && (
                    <Badge variant="default" className="text-xs">
                      Best Match
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{slot.time}</span>
                  </div>
                  {getConfidenceBadge(slot.confidence)}
                </div>
                <p className="text-xs text-muted-foreground">{slot.reason}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectSlot(slot)}
                className="ml-3"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Select
              </Button>
            </div>
          ))
        )}

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            💡 {usingGoogleCalendar 
              ? 'Slots are ranked by your calendar availability and optimal scheduling times'
              : 'Connect your Google Calendar for more accurate availability'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
