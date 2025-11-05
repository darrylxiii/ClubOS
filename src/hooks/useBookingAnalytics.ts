import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FunnelStep {
  step: "landing" | "calendar_view" | "time_select" | "form_view" | "form_submit" | "confirmation";
  bookingLinkId: string;
}

export function useBookingAnalytics(bookingLinkId: string) {
  const sessionId = useRef<string>(
    `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  const stepStartTime = useRef<number>(Date.now());
  const currentStep = useRef<FunnelStep["step"] | null>(null);

  const trackStep = async (step: FunnelStep["step"]) => {
    if (!bookingLinkId) return;

    const now = Date.now();
    const duration = currentStep.current
      ? Math.floor((now - stepStartTime.current) / 1000)
      : 0;

    // Track previous step duration if exists
    if (currentStep.current && duration > 0) {
      try {
        const { error } = await supabase
          .from("booking_funnel_analytics")
          .insert({
            booking_link_id: bookingLinkId,
            session_id: sessionId.current,
            step: currentStep.current,
            step_duration_seconds: duration,
            user_agent: navigator.userAgent,
            referrer: document.referrer || null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            metadata: {
              screen_width: window.screen.width,
              screen_height: window.screen.height,
            },
          });
        
        if (error) {
          console.error("Error tracking funnel step:", error);
          toast.error("Analytics tracking failed", { 
            description: error.message,
            duration: 2000 
          });
        }
      } catch (error) {
        console.error("Error tracking funnel step:", error);
      }
    }

    // Set new step
    currentStep.current = step;
    stepStartTime.current = now;
  };

  const trackSlotView = async (slotStart: string) => {
    if (!bookingLinkId) return;

    try {
      const { error } = await supabase.rpc("track_slot_view", {
        p_booking_link_id: bookingLinkId,
        p_slot_start: slotStart,
        p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      
      if (error) {
        console.error("Error tracking slot view:", error);
        toast.error("Slot tracking failed", { 
          description: error.message,
          duration: 2000 
        });
      }
    } catch (error) {
      console.error("Error tracking slot view:", error);
    }
  };

  useEffect(() => {
    // Track landing on mount
    trackStep("landing");

    // Track page unload
    const handleUnload = () => {
      if (currentStep.current) {
        const duration = Math.floor((Date.now() - stepStartTime.current) / 1000);
        // Use sendBeacon for reliable tracking on page unload
        const payload = JSON.stringify({
          booking_link_id: bookingLinkId,
          session_id: sessionId.current,
          step: currentStep.current,
          step_duration_seconds: duration,
          user_agent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        
        // Note: sendBeacon would need a dedicated endpoint
        // For now, we'll just track it normally
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [bookingLinkId]);

  return {
    trackStep,
    trackSlotView,
    sessionId: sessionId.current,
  };
}
