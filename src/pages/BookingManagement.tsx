import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, Settings, Trash2, Copy, ExternalLink, BarChart3, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  color: string;
  primary_calendar_id: string | null;
  enable_club_ai: boolean | null;
  created_at: string;
}

interface CalendarConnection {
  id: string;
  provider: string;
  email: string;
  is_active: boolean | null;
}

interface BookingStats {
  total: number;
  confirmed: number;
  cancelled: number;
  no_shows: number;
}

export default function BookingManagement() {
  const [user, setUser] = useState<any>(null);
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [calendars, setCalendars] = useState<CalendarConnection[]>([]);
  const [stats, setStats] = useState<BookingStats>({ total: 0, confirmed: 0, cancelled: 0, no_shows: 0 });
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration_minutes: 30,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    advance_booking_days: 30,
    min_notice_hours: 24,
    color: "#3B82F6",
    enable_club_ai: false,
    primary_calendar_id: ""
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadBookingLinks(),
      loadCalendars(),
      loadStats()
    ]);
    setLoading(false);
  };

  const loadBookingLinks = async () => {
    const { data, error } = await supabase
      .from("booking_links")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load booking links");
      return;
    }
    setBookingLinks((data || []) as unknown as BookingLink[]);
  };

  const loadCalendars = async () => {
    const { data, error } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", user?.id)
      .eq("is_active", true);

    if (error) {
      toast.error("Failed to load calendar connections");
      return;
    }
    setCalendars((data || []) as unknown as CalendarConnection[]);
  };

  const loadStats = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("status, attended, no_show")
      .in("booking_link_id", bookingLinks.map(l => l.id));

    if (error) return;

    const total = data?.length || 0;
    const confirmed = data?.filter(b => b.status === 'confirmed').length || 0;
    const cancelled = data?.filter(b => b.status === 'cancelled').length || 0;
    const no_shows = data?.filter(b => b.no_show).length || 0;

    setStats({ total, confirmed, cancelled, no_shows });
  };

  const handleCreateLink = async () => {
    const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const { data, error } = await supabase
      .from("booking_links")
      .insert({
        ...formData,
        slug,
        user_id: user?.id,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create booking link");
      return;
    }

    toast.success("Booking link created successfully");
    setCreateDialogOpen(false);
    resetForm();
    loadBookingLinks();
  };

  const handleUpdateLink = async () => {
    if (!editingLink) return;

    const { error } = await supabase
      .from("booking_links")
      .update(formData)
      .eq("id", editingLink.id);

    if (error) {
      toast.error("Failed to update booking link");
      return;
    }

    toast.success("Booking link updated");
    setEditingLink(null);
    resetForm();
    loadBookingLinks();
  };

  const openDeleteDialog = (id: string) => {
    setLinkToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteLink = async () => {
    if (!linkToDelete) return;

    const { error } = await supabase
      .from("booking_links")
      .delete()
      .eq("id", linkToDelete);

    if (error) {
      logger.error('Delete booking link error:', error);
      toast.error("Failed to delete booking link");
      return;
    }

    toast.success("Booking link deleted");
    setDeleteDialogOpen(false);
    setLinkToDelete(null);
    loadBookingLinks();
  };

  const toggleLinkStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("booking_links")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success(`Booking link ${!currentStatus ? 'activated' : 'deactivated'}`);
    loadBookingLinks();
  };

  const copyLinkToClipboard = (slug: string) => {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const openBookingLink = (slug: string) => {
    window.open(`${window.location.origin}/book/${slug}`, '_blank');
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      duration_minutes: 30,
      buffer_before_minutes: 0,
      buffer_after_minutes: 0,
      advance_booking_days: 30,
      min_notice_hours: 24,
      color: "#3B82F6",
      enable_club_ai: false,
      primary_calendar_id: ""
    });
  };

  const startEdit = (link: BookingLink) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      description: link.description || "",
      duration_minutes: link.duration_minutes,
      buffer_before_minutes: link.buffer_before_minutes ?? 0,
      buffer_after_minutes: link.buffer_after_minutes ?? 0,
      advance_booking_days: link.advance_booking_days ?? 30,
      min_notice_hours: link.min_notice_hours ?? 24,
      color: link.color,
      enable_club_ai: link.enable_club_ai ?? false,
      primary_calendar_id: link.primary_calendar_id || ""
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-48" />
          <div className="grid gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Booking Management</h1>
          <p className="text-muted-foreground">Manage your booking links, calendars, and analytics</p>
        </div>
        <Dialog open={createDialogOpen || !!editingLink} onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setEditingLink(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Booking Link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLink ? 'Edit' : 'Create'} Booking Link</DialogTitle>
              <DialogDescription>
                Configure your booking settings and availability
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="30 Minute Meeting"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the meeting"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Min Notice (hours)</Label>
                  <Input
                    type="number"
                    value={formData.min_notice_hours}
                    onChange={(e) => setFormData({ ...formData, min_notice_hours: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Buffer Before (min)</Label>
                  <Input
                    type="number"
                    value={formData.buffer_before_minutes}
                    onChange={(e) => setFormData({ ...formData, buffer_before_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Buffer After (min)</Label>
                  <Input
                    type="number"
                    value={formData.buffer_after_minutes}
                    onChange={(e) => setFormData({ ...formData, buffer_after_minutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Advance Booking (days)</Label>
                <Input
                  type="number"
                  value={formData.advance_booking_days}
                  onChange={(e) => setFormData({ ...formData, advance_booking_days: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label>Primary Calendar</Label>
                <Select
                  value={formData.primary_calendar_id}
                  onValueChange={(value) => setFormData({ ...formData, primary_calendar_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.provider} - {cal.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable Club AI Assistant</Label>
                <Switch
                  checked={formData.enable_club_ai}
                  onCheckedChange={(checked) => setFormData({ ...formData, enable_club_ai: checked })}
                />
              </div>

              <div>
                <Label>Color</Label>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setCreateDialogOpen(false);
                setEditingLink(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={editingLink ? handleUpdateLink : handleCreateLink}>
                {editingLink ? 'Update' : 'Create'} Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {calendars.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No calendar connected. Connect a calendar in Settings to enable automatic syncing.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="links" className="space-y-4">
        <TabsList>
          <TabsTrigger value="links">Booking Links</TabsTrigger>
          <TabsTrigger value="calendars">Calendar Connections</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="space-y-4">
          {bookingLinks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No booking links yet</p>
                <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                  Create Your First Link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bookingLinks.map((link) => (
                <Card key={link.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle>{link.title}</CardTitle>
                          <Badge variant={link.is_active ? "default" : "secondary"}>
                            {link.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {link.enable_club_ai && (
                            <Badge variant="outline">Club AI</Badge>
                          )}
                        </div>
                        <CardDescription>{link.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyLinkToClipboard(link.slug)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openBookingLink(link.slug)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEdit(link)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openDeleteDialog(link.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">{link.duration_minutes} min</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min Notice</p>
                        <p className="font-medium">{link.min_notice_hours}h</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Booking URL</p>
                        <p className="font-mono text-xs truncate">/book/{link.slug}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Switch
                        checked={link.is_active}
                        onCheckedChange={() => toggleLinkStatus(link.id, link.is_active)}
                      />
                      <span className="ml-2 text-sm">
                        {link.is_active ? "Accepting bookings" : "Paused"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendars" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Connections</CardTitle>
              <CardDescription>
                Manage your connected calendars for automatic availability checking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calendars.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No calendars connected</p>
                  <Button onClick={() => window.location.href = '/settings'}>
                    Connect Calendar in Settings
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {calendars.map((cal) => (
                    <div key={cal.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Calendar className="h-8 w-8" />
                        <div>
                          <p className="font-medium">{cal.provider.toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">{cal.email}</p>
                        </div>
                      </div>
                      <Badge variant={cal.is_active ? "default" : "secondary"}>
                        {cal.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.confirmed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.cancelled}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">No Shows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.no_shows}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking link? This action cannot be undone and all associated bookings will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLinkToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLink} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </AppLayout>
  );
}
