import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar, Clock, Copy, ExternalLink, Link as LinkIcon, Plus, Settings, Trash2, Video, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BookingAvailabilitySettings } from "@/components/scheduling/BookingAvailabilitySettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarConnectionStatus } from "@/components/scheduling/CalendarConnectionStatus";
import { AvailabilityOnboardingWizard } from "@/components/scheduling/AvailabilityOnboardingWizard";
import { useAvailabilityOnboarding } from "@/hooks/useAvailabilityOnboarding";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  advance_booking_days: number;
  min_notice_hours: number;
  is_active: boolean;
  color: string;
  created_at: string;
  scheduling_type: string;
  video_conferencing_provider: string | null;
  auto_generate_meeting_link: boolean;
  allow_waitlist: boolean;
  single_use: boolean;
  max_uses: number | null;
  requires_approval: boolean;
  max_bookings_per_day: number | null;
}

/**
 * Scheduling tab for the consolidated Meetings page
 * Manages booking links and availability settings
 */
export function MeetingsSchedulingTab() {
  const { user } = useAuth();
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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
  });

  useEffect(() => {
    if (user) {
      loadBookingLinks();
    }
  }, [user]);

  const loadBookingLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_links")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookingLinks(data || []);
    } catch (error: any) {
      console.error("[MeetingsSchedulingTab] Failed to load booking links:", error);
      toast.error("Failed to load booking links");
    } finally {
      setLoading(false);
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

    setIsCreatingLink(true);
    try {
      const { data, error } = await supabase
        .from("booking_links")
        .insert({
          ...newLink,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

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

  if (loading || onboardingLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (needsOnboarding) {
    return <AvailabilityOnboardingWizard onComplete={markComplete} />;
  }

  return (
    <div className="space-y-6">
      {/* Calendar Connection Status */}
      <CalendarConnectionStatus />
      {/* Booking Links Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Booking Links</h3>
          <p className="text-sm text-muted-foreground">
            Share these links to let people book time with you
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="approval">Require Approval</Label>
                  <p className="text-xs text-muted-foreground">
                    Review bookings before confirming
                  </p>
                </div>
                <Switch
                  id="approval"
                  checked={newLink.requires_approval}
                  onCheckedChange={(checked) =>
                    setNewLink({ ...newLink, requires_approval: checked })
                  }
                />
              </div>

              <Button onClick={createBookingLink} disabled={isCreatingLink} className="w-full">
                {isCreatingLink ? "Creating..." : "Create Booking Link"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Booking Links Grid */}
      {bookingLinks.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Calendar className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No booking links yet</h3>
              <p className="text-muted-foreground">
                Create your first booking link to start accepting meetings
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Booking Link
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookingLinks.map((link) => (
            <Card key={link.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: link.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{link.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {link.duration_minutes} minutes
                    </CardDescription>
                  </div>
                  <Badge variant={link.is_active ? "default" : "secondary"}>
                    {link.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LinkIcon className="h-3 w-3" />
                  <span className="truncate">/book/{link.slug}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyBookingUrl(link.slug)}
                    className="flex-1 gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/book/${link.slug}`, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Switch
                    checked={link.is_active}
                    onCheckedChange={() => toggleLinkStatus(link.id, link.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteBookingLink(link.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Availability Settings */}
      <div className="pt-6 border-t">
        <h3 className="text-lg font-semibold mb-4">Availability Settings</h3>
        <BookingAvailabilitySettings />
      </div>
    </div>
  );
}
