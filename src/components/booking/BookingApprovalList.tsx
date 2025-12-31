import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Clock, Calendar, User, Mail } from "lucide-react";

interface PendingBooking {
  id: string;
  guest_name: string;
  guest_email: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  notes: string | null;
  created_at: string;
  booking_links: {
    title: string;
  };
}

export function BookingApprovalList() {
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PendingBooking | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingBookings, isLoading } = useQuery({
    queryKey: ["pending-bookings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          guest_name,
          guest_email,
          scheduled_start,
          scheduled_end,
          timezone,
          notes,
          created_at,
          booking_links!inner(title)
        `)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("scheduled_start", { ascending: true });

      if (error) throw error;
      return data as PendingBooking[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke("approve-booking", {
        body: { bookingId, action: "approve" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking approved successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("approve-booking", {
        body: { bookingId, action: "reject", rejectionReason: reason },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setRejectDialogOpen(false);
      setSelectedBooking(null);
      setRejectionReason("");
      toast.success("Booking rejected");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const handleReject = (booking: PendingBooking) => {
    setSelectedBooking(booking);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (selectedBooking) {
      rejectMutation.mutate({ bookingId: selectedBooking.id, reason: rejectionReason });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!pendingBookings?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>All caught up! No pending booking requests.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
            <Badge variant="secondary" className="ml-2">
              {pendingBookings.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingBookings.map((booking) => (
            <div
              key={booking.id}
              className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{booking.booking_links.title}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {booking.guest_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {booking.guest_email}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  Pending
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(booking.scheduled_start), "EEEE, MMMM d, yyyy")}
                </span>
                <span className="text-muted-foreground">
                  {format(new Date(booking.scheduled_start), "h:mm a")} -{" "}
                  {format(new Date(booking.scheduled_end), "h:mm a")}
                </span>
                <span className="text-muted-foreground">({booking.timezone})</span>
              </div>

              {booking.notes && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  {booking.notes}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(booking.id)}
                  disabled={approveMutation.isPending}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(booking)}
                  disabled={rejectMutation.isPending}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Booking Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this booking from{" "}
              <strong>{selectedBooking?.guest_name}</strong>? They will be notified via email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Optional: Provide a reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
