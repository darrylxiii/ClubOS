import { useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type FunnelEventType = 
  | "page_view"
  | "slots_viewed"
  | "slot_selected"
  | "form_started"
  | "form_completed"
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled";

interface FunnelEventData {
  slot_time?: string;
  slot_date?: string;
  form_field?: string;
  booking_id?: string;
  [key: string]: any;
}

export function useBookingFunnelTracking(bookingLinkId?: string) {
  const sessionIdRef = useRef<string | null>(null);
  const trackedEventsRef = useRef<Set<string>>(new Set());

  // Generate or retrieve session ID
  useEffect(() => {
    if (!sessionIdRef.current) {
      const storedSessionId = sessionStorage.getItem("booking_funnel_session");
      if (storedSessionId) {
        sessionIdRef.current = storedSessionId;
      } else {
        const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem("booking_funnel_session", newSessionId);
        sessionIdRef.current = newSessionId;
      }
    }
  }, []);

  const trackEvent = useCallback(async (
    eventType: FunnelEventType,
    eventData?: FunnelEventData,
    deduplicate = true
  ) => {
    if (!bookingLinkId) return;
    
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    // Deduplicate events in same session
    const eventKey = `${sessionId}-${eventType}-${JSON.stringify(eventData || {})}`;
    if (deduplicate && trackedEventsRef.current.has(eventKey)) {
      return;
    }
    trackedEventsRef.current.add(eventKey);

    try {
      await supabase.from("booking_funnel_events").insert({
        session_id: sessionId,
        booking_link_id: bookingLinkId,
        event_type: eventType,
        event_data: eventData || {},
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
      });
    } catch (error) {
      // Silent fail - don't interrupt user flow
      console.warn("Failed to track funnel event:", error);
    }
  }, [bookingLinkId]);

  const trackPageView = useCallback(() => {
    trackEvent("page_view", { url: window.location.pathname });
  }, [trackEvent]);

  const trackSlotsViewed = useCallback(() => {
    trackEvent("slots_viewed");
  }, [trackEvent]);

  const trackSlotSelected = useCallback((slotTime: string, slotDate: string) => {
    trackEvent("slot_selected", { slot_time: slotTime, slot_date: slotDate }, false);
  }, [trackEvent]);

  const trackFormStarted = useCallback((field?: string) => {
    trackEvent("form_started", { first_field: field });
  }, [trackEvent]);

  const trackFormCompleted = useCallback(() => {
    trackEvent("form_completed");
  }, [trackEvent]);

  const trackBookingCreated = useCallback((bookingId: string) => {
    trackEvent("booking_created", { booking_id: bookingId }, false);
  }, [trackEvent]);

  const trackBookingConfirmed = useCallback((bookingId: string) => {
    trackEvent("booking_confirmed", { booking_id: bookingId }, false);
  }, [trackEvent]);

  return {
    trackPageView,
    trackSlotsViewed,
    trackSlotSelected,
    trackFormStarted,
    trackFormCompleted,
    trackBookingCreated,
    trackBookingConfirmed,
    trackEvent,
    sessionId: sessionIdRef.current,
  };
}
