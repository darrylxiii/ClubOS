import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseBookingRealtimeProps {
  bookingLinkId: string;
  selectedDate?: Date | null;
  onSlotBooked?: (booking: any) => void;
  onSlotCancelled?: (booking: any) => void;
}

export function useBookingRealtime({
  bookingLinkId,
  selectedDate,
  onSlotBooked,
  onSlotCancelled,
}: UseBookingRealtimeProps) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [liveBookingsCount, setLiveBookingsCount] = useState<number>(0);

  useEffect(() => {
    if (!bookingLinkId) return;

    // Subscribe to realtime changes on bookings
    const realtimeChannel = supabase
      .channel(`booking-link-${bookingLinkId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `booking_link_id=eq.${bookingLinkId}`,
        },
        (payload) => {
          console.log("New booking detected:", payload.new);
          setLiveBookingsCount((prev) => prev + 1);
          
          // Check if the new booking affects the selected date
          if (selectedDate && payload.new.scheduled_start) {
            const bookingDate = new Date(payload.new.scheduled_start as string);
            if (
              bookingDate.getFullYear() === selectedDate.getFullYear() &&
              bookingDate.getMonth() === selectedDate.getMonth() &&
              bookingDate.getDate() === selectedDate.getDate()
            ) {
              onSlotBooked?.(payload.new);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `booking_link_id=eq.${bookingLinkId}`,
        },
        (payload) => {
          console.log("Booking updated:", payload.new);
          
          // Check for cancellations
          if (
            payload.new.status === "cancelled" &&
            payload.old.status !== "cancelled"
          ) {
            setLiveBookingsCount((prev) => Math.max(0, prev - 1));
            
            if (selectedDate && payload.new.scheduled_start) {
              const bookingDate = new Date(payload.new.scheduled_start as string);
              if (
                bookingDate.getFullYear() === selectedDate.getFullYear() &&
                bookingDate.getMonth() === selectedDate.getMonth() &&
                bookingDate.getDate() === selectedDate.getDate()
              ) {
                onSlotCancelled?.(payload.new);
              }
            }
          }
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [bookingLinkId, selectedDate, onSlotBooked, onSlotCancelled]);

  return {
    channel,
    liveBookingsCount,
  };
}
