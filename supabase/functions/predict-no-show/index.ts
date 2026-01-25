import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PredictionRequest {
  bookingId: string;
}

interface PredictionFactors {
  domainHistory: number;
  leadTime: number;
  timeOfDay: number;
  dayOfWeek: number;
  guestCount: number;
  hasPhone: number;
  recaptchaScore: number;
}

// Scoring weights (total = 100)
const WEIGHTS = {
  domainHistory: 25,
  leadTime: 20,
  timeOfDay: 15,
  dayOfWeek: 10,
  guestCount: 5,
  hasPhone: 15,
  recaptchaScore: 10,
};

function getRiskLevel(score: number): string {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function calculateDomainScore(
  noShowRate: number,
  totalBookings: number
): number {
  // More bookings = more confidence in the rate
  const confidence = Math.min(totalBookings / 10, 1);
  // Base score from no-show rate (0-100)
  const baseScore = noShowRate * 100;
  // Scale by confidence
  return baseScore * confidence;
}

function calculateLeadTimeScore(leadTimeHours: number): number {
  // Very short lead time (< 2 hours) = lower risk (urgent meeting)
  // Very long lead time (> 7 days) = higher risk (might forget)
  // Optimal: 24-72 hours
  if (leadTimeHours < 2) return 20;
  if (leadTimeHours < 24) return 30;
  if (leadTimeHours <= 72) return 10; // Optimal
  if (leadTimeHours <= 168) return 40; // 3-7 days
  return 60; // > 7 days
}

function calculateTimeOfDayScore(hour: number): number {
  // Morning meetings (9-11am) = lowest no-show
  // Afternoon (2-4pm) = medium
  // End of day (5-6pm) = higher
  // Before 9am or after 6pm = highest
  if (hour >= 9 && hour <= 11) return 10;
  if (hour >= 14 && hour <= 16) return 30;
  if (hour >= 17 && hour <= 18) return 50;
  return 60;
}

function calculateDayOfWeekScore(day: number): number {
  // Monday = 1, Friday = 5, Sunday = 0
  // Fridays = highest no-show
  // Mondays = medium (weekend hangover)
  // Mid-week = lowest
  if (day === 5) return 60; // Friday
  if (day === 1) return 40; // Monday
  if (day === 0 || day === 6) return 50; // Weekend
  return 20; // Tuesday-Thursday
}

function calculateGuestCountScore(guestCount: number): number {
  // More guests = coordination complexity = higher no-show risk
  if (guestCount <= 1) return 10;
  if (guestCount <= 3) return 30;
  if (guestCount <= 5) return 50;
  return 70;
}

function calculatePhoneScore(hasPhone: boolean): number {
  // Having phone = more committed = lower risk
  return hasPhone ? 10 : 50;
}

function calculateRecaptchaScore(recaptchaScore: number | null): number {
  // Higher reCAPTCHA score = more human = lower risk
  if (recaptchaScore === null) return 30; // Unknown
  if (recaptchaScore >= 0.9) return 5;
  if (recaptchaScore >= 0.7) return 20;
  if (recaptchaScore >= 0.5) return 40;
  return 70; // Bot-like behavior
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { bookingId }: PredictionRequest = await req.json();

    if (!bookingId) {
      throw new Error("bookingId is required");
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        guest_email,
        guest_phone,
        scheduled_start,
        created_at,
        recaptcha_score,
        booking_guests(id)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingError?.message}`);
    }

    // Extract email domain
    const emailDomain = booking.guest_email.split("@")[1];

    // Fetch domain behavior patterns
    const { data: domainPattern } = await supabase
      .from("booking_behavior_patterns")
      .select("*")
      .eq("guest_email_domain", emailDomain)
      .single();

    // Calculate individual factor scores
    const scheduledStart = new Date(booking.scheduled_start);
    const createdAt = new Date(booking.created_at);
    const leadTimeHours = (scheduledStart.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    const factors: PredictionFactors = {
      domainHistory: domainPattern
        ? calculateDomainScore(
            domainPattern.no_show_count / Math.max(domainPattern.total_bookings, 1),
            domainPattern.total_bookings
          )
        : 30, // Default for unknown domains
      leadTime: calculateLeadTimeScore(leadTimeHours),
      timeOfDay: calculateTimeOfDayScore(scheduledStart.getHours()),
      dayOfWeek: calculateDayOfWeekScore(scheduledStart.getDay()),
      guestCount: calculateGuestCountScore(booking.booking_guests?.length || 0),
      hasPhone: calculatePhoneScore(!!booking.guest_phone),
      recaptchaScore: calculateRecaptchaScore(booking.recaptcha_score),
    };

    // Calculate weighted total score
    const totalScore = Math.round(
      (factors.domainHistory * WEIGHTS.domainHistory +
        factors.leadTime * WEIGHTS.leadTime +
        factors.timeOfDay * WEIGHTS.timeOfDay +
        factors.dayOfWeek * WEIGHTS.dayOfWeek +
        factors.guestCount * WEIGHTS.guestCount +
        factors.hasPhone * WEIGHTS.hasPhone +
        factors.recaptchaScore * WEIGHTS.recaptchaScore) / 100
    );

    const riskLevel = getRiskLevel(totalScore);

    // Store prediction
    const { data: prediction, error: insertError } = await supabase
      .from("booking_no_show_predictions")
      .upsert({
        booking_id: bookingId,
        risk_score: totalScore,
        risk_level: riskLevel,
        prediction_factors: {
          ...factors,
          weights: WEIGHTS,
          domain: emailDomain,
          domainTotalBookings: domainPattern?.total_bookings || 0,
          domainNoShowRate: domainPattern
            ? (domainPattern.no_show_count / Math.max(domainPattern.total_bookings, 1))
            : null,
        },
      }, {
        onConflict: 'booking_id',
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to store prediction:", insertError);
    }

    // Trigger intervention for high-risk bookings
    if (riskLevel === 'high' || riskLevel === 'critical') {
      // Invoke intervention function asynchronously
      supabase.functions.invoke('trigger-no-show-intervention', {
        body: { bookingId, riskLevel, riskScore: totalScore }
      }).catch(err => console.error('Intervention trigger failed:', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        prediction: {
          bookingId,
          riskScore: totalScore,
          riskLevel,
          factors,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error predicting no-show:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
