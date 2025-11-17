import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Video, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUnifiedCalendarEvents } from "@/services/calendarAggregation";
import { UnifiedCalendarEvent } from "@/types/calendar";
import {
  CalendarEventWithDetection,
  DetectedInterview,
  enrichCalendarEventWithDetection,
  formatInterviewType,
  getConfidenceBadgeVariant,
  getStatusBadgeVariant,
  suggestCandidateFromEvent
} from "@/utils/calendarInterviewUtils";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isThisWeek, isFuture } from "date-fns";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CalendarInterviewLinkerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  applications: any[];
  onInterviewLinked?: () => void;
}

export function CalendarInterviewLinker({
  open,
  onOpenChange,
  jobId,
  applications,
  onInterviewLinked
}: CalendarInterviewLinkerProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'auto-detected' | 'my-calendar' | 'linked'>('auto-detected');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventWithDetection[]>([]);
  const [detectedInterviews, setDetectedInterviews] = useState<DetectedInterview[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithDetection | null>(null);
  const [linkingEvent, setLinkingEvent] = useState(false);
  
  // Linking form state
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");
  const [interviewType, setInterviewType] = useState<string>("partner_interview");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load detected interviews for this job
      const { data: detected, error: detectedError } = await supabase
        .from('detected_interviews')
        .select('*')
        .eq('job_id', jobId)
        .order('scheduled_start', { ascending: true });

      if (detectedError) throw detectedError;
      setDetectedInterviews(detected || []);

      // Load calendar events (next 60 days)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);

      const events = await fetchUnifiedCalendarEvents(user.id, startDate, endDate);
      
      // Enrich events with detection data
      const enrichedEvents = events.map(event => 
        enrichCalendarEventWithDetection(event, detected || [])
      );

      setCalendarEvents(enrichedEvents);
    } catch (error: any) {
      console.error('Failed to load calendar data:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleScanCalendar = async () => {
    if (!user) return;
    setScanning(true);

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);

      const { data, error } = await supabase.functions.invoke('detect-calendar-interviews', {
        body: {
          userId: user.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      if (error) throw error;

      toast.success(`Scan complete! Detected ${data?.detectedCount || 0} potential interviews`);
      await loadData(); // Reload data to show new detections
    } catch (error: any) {
      console.error('Calendar scan failed:', error);
      toast.error('Failed to scan calendar');
    } finally {
      setScanning(false);
    }
  };

  const handleLinkEvent = async () => {
    if (!selectedEvent || !selectedApplicationId) return;
    setLinkingEvent(true);

    try {
      const application = applications.find(a => a.id === selectedApplicationId);
      if (!application) throw new Error('Application not found');

      // Extract event ID (remove provider prefix)
      const eventId = selectedEvent.id.replace('google-', '').replace('microsoft-', '');
      const provider = selectedEvent.source;

      // Create or update detected interview
      const { error } = await supabase
        .from('detected_interviews')
        .upsert({
          calendar_event_id: eventId,
          calendar_provider: provider,
          event_title: selectedEvent.title,
          scheduled_start: selectedEvent.start.toISOString(),
          scheduled_end: selectedEvent.end.toISOString(),
          meeting_link: selectedEvent.location,
          interview_type: interviewType,
          job_id: jobId,
          application_id: selectedApplicationId,
          candidate_id: application.candidate_id,
          tqc_organizer_id: user?.id,
          status: 'confirmed',
          manually_edited: true,
          user_notes: notes,
          detection_confidence: 'high'
        });

      if (error) throw error;

      toast.success('Interview linked successfully!');
      setSelectedEvent(null);
      setSelectedApplicationId("");
      setNotes("");
      await loadData();
      onInterviewLinked?.();
    } catch (error: any) {
      console.error('Failed to link interview:', error);
      toast.error('Failed to link interview');
    } finally {
      setLinkingEvent(false);
    }
  };

  const handleConfirmDetected = async (interview: DetectedInterview) => {
    try {
      const { error } = await supabase
        .from('detected_interviews')
        .update({ status: 'confirmed' })
        .eq('id', interview.id);

      if (error) throw error;

      toast.success('Interview confirmed!');
      await loadData();
      onInterviewLinked?.();
    } catch (error: any) {
      console.error('Failed to confirm interview:', error);
      toast.error('Failed to confirm interview');
    }
  };

  const handleDismissDetected = async (interview: DetectedInterview) => {
    try {
      const { error } = await supabase
        .from('detected_interviews')
        .update({ status: 'dismissed' })
        .eq('id', interview.id);

      if (error) throw error;

      toast.success('Interview dismissed');
      await loadData();
    } catch (error: any) {
      console.error('Failed to dismiss interview:', error);
      toast.error('Failed to dismiss interview');
    }
  };

  const renderEventCard = (event: CalendarEventWithDetection) => {
    const suggestion = suggestCandidateFromEvent(event, applications);
    
    return (
      <Card key={event.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium truncate">{event.title}</h4>
                {event.isLinked && (
                  <Badge variant="default" className="shrink-0">Linked</Badge>
                )}
                {event.hasVideoLink && (
                  <Video className="w-4 h-4 shrink-0 text-primary" />
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{format(event.start, 'MMM dd, HH:mm')} - {format(event.end, 'HH:mm')}</span>
                </div>
                
                {event.attendees && event.attendees.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{event.attendees.length} attendees</span>
                  </div>
                )}
                
                {event.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[200px]">{event.location}</span>
                  </div>
                )}
              </div>

              {suggestion && (
                <div className="mt-2 text-sm">
                  <Badge variant={suggestion.confidence === 'high' ? 'default' : 'secondary'}>
                    Suggested: {suggestion.candidateName}
                  </Badge>
                </div>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => {
                setSelectedEvent(event);
                if (suggestion) {
                  setSelectedApplicationId(suggestion.applicationId);
                }
              }}
              disabled={event.isLinked}
            >
              {event.isLinked ? 'Linked' : 'Link'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDetectedCard = (interview: DetectedInterview) => {
    return (
      <Card key={interview.id} className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium truncate">{interview.event_title}</h4>
                <Badge variant={getConfidenceBadgeVariant(interview.detection_confidence || 'low')}>
                  {interview.detection_confidence || 'unknown'} confidence
                </Badge>
                <Badge variant={getStatusBadgeVariant(interview.status)}>
                  {interview.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{format(new Date(interview.scheduled_start), 'MMM dd, HH:mm')}</span>
                </div>
                <div className="text-xs">
                  {formatInterviewType(interview.interview_type || 'unknown')}
                </div>
              </div>

              {Array.isArray(interview.detected_candidates) && interview.detected_candidates.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <strong>Candidate:</strong> {interview.detected_candidates[0]?.name || 'Unknown'}
                </div>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {interview.status === 'pending_review' && (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleConfirmDetected(interview)}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDismissDetected(interview)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </>
              )}
              {interview.status === 'confirmed' && (
                <Badge variant="default">Confirmed</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const pendingDetected = detectedInterviews.filter(d => d.status === 'pending_review');
  const confirmedDetected = detectedInterviews.filter(d => d.status === 'confirmed');
  const upcomingEvents = calendarEvents.filter(e => isFuture(e.start) && !e.isLinked);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Interview from Calendar</DialogTitle>
            <DialogDescription>
              Browse your calendar events or view automatically detected interviews
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="auto-detected" className="relative">
                Auto-Detected
                {pendingDetected.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                    {pendingDetected.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="my-calendar">My Calendar</TabsTrigger>
              <TabsTrigger value="linked">Linked ({confirmedDetected.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="auto-detected" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Automatically detected interviews from your calendar
                </p>
                <Button
                  onClick={handleScanCalendar}
                  disabled={scanning}
                  variant="outline"
                  size="sm"
                >
                  {scanning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Scan Calendar
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : pendingDetected.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending interviews detected</p>
                  <p className="text-sm mt-1">Click "Scan Calendar" to detect interviews</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingDetected.map(renderDetectedCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-calendar" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a calendar event to link as an interview
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming calendar events found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(renderEventCard)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="linked" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Interviews that have been confirmed and linked to this job
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : confirmedDetected.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No linked interviews yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {confirmedDetected.map(renderDetectedCard)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Linking Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Interview to Job</DialogTitle>
            <DialogDescription>
              Connect this calendar event to an application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Calendar Event</Label>
              <Card>
                <CardContent className="p-3">
                  <p className="font-medium">{selectedEvent?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent && format(selectedEvent.start, 'MMM dd, yyyy HH:mm')}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div>
              <Label htmlFor="application">Select Candidate *</Label>
              <Select value={selectedApplicationId} onValueChange={setSelectedApplicationId}>
                <SelectTrigger id="application">
                  <SelectValue placeholder="Choose a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.full_name || app.email || 'Unknown Candidate'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="interview-type">Interview Type *</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger id="interview-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tqc_intro">TQC Introduction</SelectItem>
                  <SelectItem value="partner_interview">Partner Interview</SelectItem>
                  <SelectItem value="panel_interview">Panel Interview</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this interview..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleLinkEvent}
                disabled={!selectedApplicationId || linkingEvent}
              >
                {linkingEvent && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Link Interview
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
