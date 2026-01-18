import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar, Clock, Copy, ExternalLink, Link as LinkIcon, Plus, Settings, Trash2, Video, Users, Shield, Repeat, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BookingAvailabilitySettings } from "@/components/scheduling/BookingAvailabilitySettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingAnalyticsDashboard } from "@/components/booking/BookingAnalyticsDashboard";
import { CalendarConnectionStatus } from "@/components/scheduling/CalendarConnectionStatus";
import { VideoPlatformSelector } from "@/components/booking/VideoPlatformSelector";
import { BarChart3 } from "lucide-react";
import { AIPageCopilot } from "@/components/ai/AIPageCopilot";
import { BookingApprovalList } from "@/components/booking/BookingApprovalList";
import { AvailabilityOnboardingWizard } from "@/components/scheduling/AvailabilityOnboardingWizard";
import { useAvailabilityOnboarding } from "@/hooks/useAvailabilityOnboarding";
import { SchedulingSkeleton } from "@/components/LoadingSkeletons";
interface BookingLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number | null;
  buffer_after_minutes: number | null;
  advance_booking_days: number | null;
  min_notice_hours: number | null;
  is_active: boolean | null;
  color: string | null;
  created_at: string | null;
  scheduling_type: string | null;
  video_conferencing_provider: string | null;
  auto_generate_meeting_link: boolean | null;
  allow_waitlist: boolean | null;
  single_use: boolean | null;
  max_uses: number | null;
  requires_approval: boolean | null;
  max_bookings_per_day: number | null;
}

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  created_at: string;
}

export default function Scheduling() {
  const { user } = useAuth();
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [connectedCalendars, setConnectedCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { needsOnboarding, loading: onboardingLoading, markComplete } = useAvailabilityOnboarding();
  
  const [newLink, setNewLink] = useState({
    title: "",
    description: "",
    slug: "",
    duration_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    advance_booking_days: 60,
    min_notice_hours: 2,
    color: "#6366f1",
    scheduling_type: "individual",
    video_conferencing_provider: null as string | null,
    auto_generate_meeting_link: false,
    allow_waitlist: true,
    single_use: false,
    max_uses: null as number | null,
    requires_approval: false,
    max_bookings_per_day: null as number | null,
    primary_calendar_id: null as string | null,
    create_quantum_meeting: true,
    enable_club_ai: false,
    video_platform: 'quantum_club' as string,
    allow_guest_platform_choice: false,
    available_platforms: ['quantum_club'] as string[],
  });

  useEffect(() => {
    if (user) {
      loadBookingLinks();
      loadUpcomingBookings();
      loadConnectedCalendars();
      loadPendingCount();
    }
  }, [user]);

  const loadPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id ?? '')
        .eq("status", "pending_approval");

      if (!error) {
        setPendingCount(count || 0);
      }
    } catch (error) {
      console.error("[Scheduling] Error loading pending count:", error);
    }
  };

  const loadConnectedCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnectedCalendars(data || []);
    } catch (error) {
      console.error('[Scheduling] Error loading calendars:', error);
    }
  };

  const loadBookingLinks = async () => {
    try {
      console.log("[Scheduling] Loading booking links for user:", user?.id);
      const { data, error } = await supabase
        .from("booking_links")
        .select("*")
        .eq("user_id", user?.id ?? '')
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Scheduling] Error loading booking links:", error);
        throw error;
      }
      console.log("[Scheduling] Loaded booking links:", data);
      setBookingLinks(data || []);
    } catch (error: any) {
      console.error("[Scheduling] Failed to load booking links:", error);
      toast.error("Failed to load booking links");
    } finally {
      setLoading(false);
    }
  };

  const loadUpcomingBookings = async () => {
    try {
      const now = new Date().toISOString();
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_start", now)
        .eq("status", "confirmed")
        .order("scheduled_start", { ascending: true })
        .limit(10);

      if (error) throw error;
      setUpcomingBookings(data || []);
    } catch (error: any) {
      toast.error("Failed to load bookings");
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const createBookingLink = async () => {
    if (!newLink.title || !newLink.slug) {
      toast.error("Please provide a title and URL slug");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to create a booking link");
      return;
    }
    setIsCreatingLink(true);
    try {
      console.log("[Scheduling] Creating booking link with data:", newLink);
      const { user_id, ...insertData } = { ...newLink, user_id: user.id };
      const { data, error } = await supabase
        .from("booking_links")
        .insert([{ ...insertData, user_id }])
        .select()
        .single();

      if (error) {
        console.error("[Scheduling] Error creating booking link:", error);
        throw error;
      }

      console.log("[Scheduling] Created booking link:", data);
      toast.success("Booking link created!");
      setBookingLinks([data, ...bookingLinks]);
      setNewLink({
        title: "",
        description: "",
        slug: "",
        duration_minutes: 30,
        buffer_before_minutes: 0,
        buffer_after_minutes: 0,
        advance_booking_days: 60,
        min_notice_hours: 2,
        color: "#6366f1",
        scheduling_type: "individual",
        video_conferencing_provider: null,
        auto_generate_meeting_link: false,
        allow_waitlist: true,
        single_use: false,
        max_uses: null,
        requires_approval: false,
        max_bookings_per_day: null,
        primary_calendar_id: null,
        create_quantum_meeting: true,
        enable_club_ai: false,
        video_platform: 'quantum_club',
        allow_guest_platform_choice: false,
        available_platforms: ['quantum_club'],
      });
      setDialogOpen(false);
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("This URL is already taken");
      } else {
        toast.error("Failed to create booking link");
      }
    } finally {
      setIsCreatingLink(false);
    }
  };

  const toggleLinkStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("booking_links")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setBookingLinks(
        bookingLinks.map((link) =>
          link.id === id ? { ...link, is_active: !currentStatus } : link
        )
      );
      toast.success(currentStatus ? "Link deactivated" : "Link activated");
    } catch (error) {
      toast.error("Failed to update link");
    }
  };

  const deleteBookingLink = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking link?")) return;

    try {
      const { error } = await supabase
        .from("booking_links")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBookingLinks(bookingLinks.filter((link) => link.id !== id));
      toast.success("Booking link deleted");
    } catch (error) {
      toast.error("Failed to delete booking link");
    }
  };

  const copyBookingUrl = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking URL copied to clipboard!");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <SchedulingSkeleton />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Scheduling</h1>
            <p className="text-muted-foreground mt-2">
              Share your availability and let people book time with you
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="glass">
                <Plus className="h-4 w-4 mr-2" />
                New Booking Link
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Booking Link</DialogTitle>
                <DialogDescription>
                  Set up a new booking link for people to schedule time with you
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={newLink.title}
                    onChange={(e) => {
                      setNewLink({
                        ...newLink,
                        title: e.target.value,
                        slug: newLink.slug || generateSlug(e.target.value),
                      });
                    }}
                    placeholder="e.g., 30 Minute Meeting"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">URL Slug *</Label>
                  <div className="flex gap-2">
                    <span className="flex items-center text-sm text-muted-foreground">
                      /book/
                    </span>
                    <Input
                      id="slug"
                      value={newLink.slug}
                      onChange={(e) => setNewLink({ ...newLink, slug: generateSlug(e.target.value) })}
                      placeholder="30-min-meeting"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newLink.description}
                    onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                    placeholder="What's this meeting about?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={newLink.duration_minutes}
                      onChange={(e) => setNewLink({ ...newLink, duration_minutes: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="min_notice">Minimum notice (hours)</Label>
                    <Input
                      id="min_notice"
                      type="number"
                      min="0"
                      value={newLink.min_notice_hours}
                      onChange={(e) => setNewLink({ ...newLink, min_notice_hours: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="buffer_before">Buffer before (minutes)</Label>
                    <Input
                      id="buffer_before"
                      type="number"
                      min="0"
                      step="5"
                      value={newLink.buffer_before_minutes}
                      onChange={(e) => setNewLink({ ...newLink, buffer_before_minutes: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="buffer_after">Buffer after (minutes)</Label>
                    <Input
                      id="buffer_after"
                      type="number"
                      min="0"
                      step="5"
                      value={newLink.buffer_after_minutes}
                      onChange={(e) => setNewLink({ ...newLink, buffer_after_minutes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="advance_booking">Advance booking (days)</Label>
                  <Input
                    id="advance_booking"
                    type="number"
                    min="1"
                    value={newLink.advance_booking_days}
                    onChange={(e) => setNewLink({ ...newLink, advance_booking_days: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label htmlFor="color">Theme Color</Label>
                  <Input
                    id="color"
                    type="color"
                    value={newLink.color}
                    onChange={(e) => setNewLink({ ...newLink, color: e.target.value })}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Advanced Options
                  </h3>

                  <div>
                    <Label htmlFor="scheduling_type">Scheduling Type</Label>
                    <Select
                      value={newLink.scheduling_type}
                      onValueChange={(value) => setNewLink({ ...newLink, scheduling_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual (1-on-1)</SelectItem>
                        <SelectItem value="round_robin">Round Robin (Team)</SelectItem>
                        <SelectItem value="collective">Collective (Group)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="video_provider">Video Conferencing</Label>
                    <Select
                      value={newLink.video_conferencing_provider || "none"}
                      onValueChange={(value) => setNewLink({ 
                        ...newLink, 
                        video_conferencing_provider: value === "none" ? null : value,
                        auto_generate_meeting_link: value !== "none"
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="google_meet">Google Meet</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="waitlist">Enable Waitlist</Label>
                      <p className="text-sm text-muted-foreground">
                        Let people join waitlist when fully booked
                      </p>
                    </div>
                    <Switch
                      id="waitlist"
                      checked={newLink.allow_waitlist}
                      onCheckedChange={(checked) => setNewLink({ ...newLink, allow_waitlist: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="single_use">Single-Use Link</Label>
                      <p className="text-sm text-muted-foreground">
                        Link expires after first booking
                      </p>
                    </div>
                    <Switch
                      id="single_use"
                      checked={newLink.single_use}
                      onCheckedChange={(checked) => setNewLink({ ...newLink, single_use: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requires_approval">Require Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        Manually approve bookings before confirming
                      </p>
                    </div>
                    <Switch
                      id="requires_approval"
                      checked={newLink.requires_approval}
                      onCheckedChange={(checked) => setNewLink({ ...newLink, requires_approval: checked })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_bookings">Max Bookings Per Day (optional)</Label>
                    <Input
                      id="max_bookings"
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={newLink.max_bookings_per_day || ""}
                      onChange={(e) => setNewLink({ 
                        ...newLink, 
                        max_bookings_per_day: e.target.value ? parseInt(e.target.value) : null 
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Calendar Integration
                  </h3>

                  <div>
                    <Label htmlFor="primary_calendar">Primary Calendar (Auto-sync)</Label>
                    <Select
                      value={newLink.primary_calendar_id || "none"}
                      onValueChange={(value) => setNewLink({ 
                        ...newLink, 
                        primary_calendar_id: value === "none" ? null : value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a calendar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (No auto-sync)</SelectItem>
                        {connectedCalendars.map((cal) => (
                          <SelectItem key={cal.id} value={cal.id}>
                            {cal.provider === 'google' ? '📅 Google' : '📆 Microsoft'} - {cal.calendar_label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bookings will automatically create events in this calendar
                    </p>
                  </div>

                  <VideoPlatformSelector
                    value={(newLink as any).video_platform || 'quantum_club'}
                    onChange={(platform) => setNewLink({ 
                      ...newLink, 
                      video_platform: platform,
                      create_quantum_meeting: platform === 'quantum_club',
                      // Auto-add selected platform to available platforms if not already there
                      available_platforms: newLink.available_platforms.includes(platform)
                        ? newLink.available_platforms
                        : [...newLink.available_platforms, platform]
                    } as any)}
                    hasGoogleCalendar={connectedCalendars.some(cal => cal.provider === 'google')}
                    onConnectGoogle={() => {
                      toast.info("Please connect your Google Calendar in Settings → Connections");
                    }}
                    enableClubAI={newLink.enable_club_ai}
                    onEnableClubAIChange={(checked) => setNewLink({ ...newLink, enable_club_ai: checked })}
                    allowGuestChoice={newLink.allow_guest_platform_choice}
                    onAllowGuestChoiceChange={(checked) => setNewLink({ ...newLink, allow_guest_platform_choice: checked })}
                    availablePlatforms={newLink.available_platforms}
                    onAvailablePlatformsChange={(platforms) => setNewLink({ ...newLink, available_platforms: platforms })}
                  />
                </div>

                <Button
                  onClick={createBookingLink}
                  disabled={isCreatingLink}
                  className="w-full"
                  variant="glass"
                >
                  {isCreatingLink ? "Creating..." : "Create Booking Link"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar Connection Status */}
        <CalendarConnectionStatus />

        {/* Availability Onboarding Wizard */}
        {!onboardingLoading && needsOnboarding && (
          <AvailabilityOnboardingWizard 
            onComplete={markComplete}
            onSkip={markComplete}
          />
        )}

        <Tabs defaultValue="links" className="w-full">
          <TabsList>
            <TabsTrigger value="links">
              <LinkIcon className="h-4 w-4 mr-2" />
              Booking Links
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              <CheckCircle className="h-4 w-4 mr-2" />
              Pending Approvals
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="h-4 w-4 mr-2" />
              Upcoming Bookings
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="availability">
              <Clock className="h-4 w-4 mr-2" />
              Availability Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="space-y-4 mt-6">
            {bookingLinks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No booking links yet</p>
                  <p className="text-muted-foreground">Create your first link to start accepting bookings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {bookingLinks.map((link) => (
                  <Card key={link.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{link.title}</CardTitle>
                            <Badge variant={link.is_active ? "default" : "secondary"}>
                              {link.is_active ? "Active" : "Inactive"}
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
                            {link.scheduling_type !== "individual" && (
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {link.scheduling_type === "round_robin" ? "Round Robin" : "Group"}
                              </span>
                            )}
                            {link.video_conferencing_provider && (
                              <span className="flex items-center gap-1">
                                <Video className="h-4 w-4" />
                                {link.video_conferencing_provider === "google_meet" ? "Google Meet" : 
                                 link.video_conferencing_provider === "zoom" ? "Zoom" : "Teams"}
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
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyBookingUrl(link.slug)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(`/book/${link.slug}`, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => toggleLinkStatus(link.id, link.is_active ?? false)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteBookingLink(link.id)}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyBookingUrl(link.slug)}
                        >
                          Copy Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4 mt-6">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No upcoming bookings</p>
                  <p className="text-muted-foreground">Your confirmed meetings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {upcomingBookings.map((booking) => {
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
                            {startDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {startDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" - "}
                            {endDate.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <BookingApprovalList onApprovalChange={loadPendingCount} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <BookingAnalyticsDashboard userId={user?.id || ""} />
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            <BookingAvailabilitySettings />
          </TabsContent>
        </Tabs>
      </div>
      
      <AIPageCopilot 
        currentPage="/scheduling" 
        contextData={{ bookingLinksCount: bookingLinks.length }}
      />
    </AppLayout>
  );
}