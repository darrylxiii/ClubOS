import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

/**
 * Background service that monitors for cancelled bookings
 * and automatically promotes waitlist entries
 */
export function useWaitlistAutoPromotion(bookingLinkId: string) {
  const { t } = useTranslation('common');
  useEffect(() => {
    const channel = supabase
      .channel(`waitlist-${bookingLinkId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `booking_link_id=eq.${bookingLinkId}`,
        },
        async (payload) => {
          // Check if booking was cancelled
          if (payload.new.status === "cancelled" && payload.old.status !== "cancelled") {
            console.log("Booking cancelled, checking waitlist...");
            
            try {
              // Invoke edge function to handle waitlist promotion
              const { data, error } = await supabase.functions.invoke("promote-waitlist", {
                body: {
                  bookingLinkId,
                  cancelledDate: payload.new.scheduled_start,
                },
              });

              if (error) throw error;

              if (data.promoted) {
                toast.success(t('booking.waitlistPromoted', 'A waitlist guest has been notified of the available slot!'));
              }
            } catch (error) {
              console.error("Error promoting waitlist:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingLinkId]);
}
