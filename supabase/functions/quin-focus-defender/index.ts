import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FocusTimeBlock {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  block_type: string;
  label: string | null;
  is_active: boolean;
}

interface FocusPreferences {
  enable_focus_defender: boolean;
  auto_detect_patterns: boolean;
  min_focus_block_minutes: number;
  max_daily_meetings: number;
  max_weekly_meeting_hours: number;
  preferred_meeting_hours: { start: number; end: number };
  buffer_between_meetings_minutes: number;
  protect_mornings: boolean;
  morning_end_hour: number;
  allow_override_with_reason: boolean;
  notification_when_protected: boolean;
}

interface CheckRequest {
  action: 'check_availability' | 'get_alternative' | 'analyze_patterns' | 'calculate_load';
  userId: string;
  proposedTime?: string;
  duration?: number;
  bookingLinkId?: string;
  date?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CheckRequest = await req.json();
    const { action, userId, proposedTime, duration = 30, date } = body;

    if (action === 'check_availability') {
      // Check if proposed time conflicts with focus blocks
      const result = await checkFocusTimeConflict(supabase, userId, proposedTime!, duration);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_alternative') {
      // Get alternative slot that doesn't conflict with focus time
      const alternatives = await getAlternativeSlots(supabase, userId, proposedTime!, duration);
      return new Response(JSON.stringify({ alternatives }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'analyze_patterns') {
      // Analyze user's meeting patterns and suggest focus blocks
      const patterns = await analyzeProductivityPatterns(supabase, userId);
      return new Response(JSON.stringify(patterns), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'calculate_load') {
      // Calculate meeting load for a specific date
      const load = await calculateMeetingLoad(supabase, userId, date || new Date().toISOString().split('T')[0]);
      return new Response(JSON.stringify(load), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Focus defender error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function checkFocusTimeConflict(
  supabase: any,
  userId: string,
  proposedTime: string,
  duration: number
): Promise<{
  isProtected: boolean;
  blockType: string | null;
  blockLabel: string | null;
  canOverride: boolean;
  message: string | null;
  suggestedAlternative: string | null;
}> {
  const proposedDate = new Date(proposedTime);
  const dayOfWeek = proposedDate.getUTCDay();
  const timeStr = proposedDate.toTimeString().slice(0, 5);
  const endTimeStr = new Date(proposedDate.getTime() + duration * 60000).toTimeString().slice(0, 5);

  // Get user's focus blocks for this day
  const { data: focusBlocks } = await supabase
    .from('focus_time_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true);

  // Get user's preferences
  const { data: preferences } = await supabase
    .from('focus_time_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const prefs: FocusPreferences = preferences || {
    enable_focus_defender: true,
    protect_mornings: true,
    morning_end_hour: 11,
    allow_override_with_reason: true,
    preferred_meeting_hours: { start: 9, end: 17 },
  };

  if (!prefs.enable_focus_defender) {
    return {
      isProtected: false,
      blockType: null,
      blockLabel: null,
      canOverride: true,
      message: null,
      suggestedAlternative: null,
    };
  }

  // Check focus blocks
  for (const block of (focusBlocks || []) as FocusTimeBlock[]) {
    if (timeOverlaps(timeStr, endTimeStr, block.start_time, block.end_time)) {
      // Find alternative
      const alternatives = await getAlternativeSlots(supabase, userId, proposedTime, duration);
      
      return {
        isProtected: true,
        blockType: block.block_type,
        blockLabel: block.label,
        canOverride: prefs.allow_override_with_reason,
        message: `This time is reserved for ${block.block_type === 'focus' ? 'deep focus work' : block.block_type}${block.label ? `: ${block.label}` : ''}.`,
        suggestedAlternative: alternatives[0] || null,
      };
    }
  }

  // Check morning protection
  const hour = proposedDate.getUTCHours();
  if (prefs.protect_mornings && hour < prefs.morning_end_hour) {
    const alternatives = await getAlternativeSlots(supabase, userId, proposedTime, duration);
    
    return {
      isProtected: true,
      blockType: 'morning_protection',
      blockLabel: 'Protected Morning Hours',
      canOverride: prefs.allow_override_with_reason,
      message: `Mornings are protected for deep work. Meetings are preferred after ${prefs.morning_end_hour}:00.`,
      suggestedAlternative: alternatives[0] || null,
    };
  }

  // Check if outside preferred meeting hours
  const prefStart = prefs.preferred_meeting_hours?.start ?? 9;
  const prefEnd = prefs.preferred_meeting_hours?.end ?? 17;
  if (hour < prefStart || hour >= prefEnd) {
    return {
      isProtected: false, // Not blocked, just a warning
      blockType: 'outside_hours',
      blockLabel: null,
      canOverride: true,
      message: `This is outside preferred meeting hours (${prefStart}:00 - ${prefEnd}:00).`,
      suggestedAlternative: null,
    };
  }

  return {
    isProtected: false,
    blockType: null,
    blockLabel: null,
    canOverride: true,
    message: null,
    suggestedAlternative: null,
  };
}

function timeOverlaps(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && end1 > start2;
}

async function getAlternativeSlots(
  supabase: any,
  userId: string,
  proposedTime: string,
  duration: number
): Promise<string[]> {
  const proposedDate = new Date(proposedTime);
  const alternatives: string[] = [];

  // Get user preferences
  const { data: preferences } = await supabase
    .from('focus_time_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const prefs = preferences || {
    preferred_meeting_hours: { start: 9, end: 17 },
    buffer_between_meetings_minutes: 15,
    morning_end_hour: 11,
  };

  // Try slots after morning protection ends
  const dayStart = new Date(proposedDate);
  dayStart.setUTCHours(prefs.morning_end_hour || 11, 0, 0, 0);

  const dayEnd = new Date(proposedDate);
  dayEnd.setUTCHours(prefs.preferred_meeting_hours?.end || 17, 0, 0, 0);

  // Get existing bookings for this user on this day
  const dateStr = proposedDate.toISOString().split('T')[0];
  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('host_id', userId)
    .gte('start_time', `${dateStr}T00:00:00Z`)
    .lte('start_time', `${dateStr}T23:59:59Z`)
    .in('status', ['confirmed', 'pending']);

  // Get focus blocks for this day
  const { data: focusBlocks } = await supabase
    .from('focus_time_blocks')
    .select('*')
    .eq('user_id', userId)
    .eq('day_of_week', proposedDate.getUTCDay())
    .eq('is_active', true);

  // Generate 30-minute slot candidates
  const buffer = prefs.buffer_between_meetings_minutes || 15;
  let currentSlot = new Date(dayStart);

  while (currentSlot < dayEnd && alternatives.length < 5) {
    const slotEnd = new Date(currentSlot.getTime() + duration * 60000);
    const slotTimeStr = currentSlot.toTimeString().slice(0, 5);
    const slotEndTimeStr = slotEnd.toTimeString().slice(0, 5);

    // Check if slot conflicts with focus blocks
    let conflictsWithFocus = false;
    for (const block of (focusBlocks || [])) {
      if (timeOverlaps(slotTimeStr, slotEndTimeStr, block.start_time, block.end_time)) {
        conflictsWithFocus = true;
        break;
      }
    }

    // Check if slot conflicts with existing bookings
    let conflictsWithBooking = false;
    for (const booking of (bookings || [])) {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      // Add buffer time
      const bufferStart = new Date(bookingStart.getTime() - buffer * 60000);
      const bufferEnd = new Date(bookingEnd.getTime() + buffer * 60000);
      
      if (currentSlot < bufferEnd && slotEnd > bufferStart) {
        conflictsWithBooking = true;
        break;
      }
    }

    if (!conflictsWithFocus && !conflictsWithBooking) {
      alternatives.push(currentSlot.toISOString());
    }

    // Move to next 30-minute slot
    currentSlot = new Date(currentSlot.getTime() + 30 * 60000);
  }

  return alternatives;
}

async function analyzeProductivityPatterns(supabase: any, userId: string) {
  // Analyze user's meeting history to suggest optimal focus blocks
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get meeting history
  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time, status, outcome')
    .eq('host_id', userId)
    .gte('start_time', thirtyDaysAgo.toISOString())
    .in('status', ['completed', 'confirmed', 'cancelled', 'no_show']);

  // Analyze patterns by hour and day
  const hourlyPatterns: Record<string, { total: number; success: number; noShow: number }> = {};
  
  for (const booking of (bookings || [])) {
    const date = new Date(booking.start_time);
    const hour = date.getUTCHours();
    const day = date.getUTCDay();
    const key = `${day}-${hour}`;

    if (!hourlyPatterns[key]) {
      hourlyPatterns[key] = { total: 0, success: 0, noShow: 0 };
    }
    
    hourlyPatterns[key].total++;
    if (booking.status === 'completed') hourlyPatterns[key].success++;
    if (booking.status === 'no_show') hourlyPatterns[key].noShow++;
  }

  // Calculate scores and update productivity_patterns table
  const patterns: any[] = [];
  for (const [key, data] of Object.entries(hourlyPatterns)) {
    const [day, hour] = key.split('-').map(Number);
    const successRate = data.total > 0 ? (data.success / data.total) * 100 : 50;
    
    patterns.push({
      user_id: userId,
      day_of_week: day,
      hour_of_day: hour,
      meeting_success_rate: successRate,
      sample_size: data.total,
      last_calculated_at: new Date().toISOString(),
    });
  }

  // Upsert patterns
  if (patterns.length > 0) {
    await supabase
      .from('productivity_patterns')
      .upsert(patterns, { onConflict: 'user_id,hour_of_day,day_of_week' });
  }

  // Suggest focus blocks based on low-meeting hours
  const suggestedBlocks: any[] = [];
  const meetingHoursByDay: Record<number, number[]> = {};

  for (const booking of (bookings || [])) {
    const date = new Date(booking.start_time);
    const day = date.getUTCDay();
    const hour = date.getUTCHours();
    
    if (!meetingHoursByDay[day]) meetingHoursByDay[day] = [];
    meetingHoursByDay[day].push(hour);
  }

  // For each day, find 2-hour blocks with no meetings
  for (let day = 1; day <= 5; day++) { // Monday to Friday
    const meetingHours = meetingHoursByDay[day] || [];
    
    // Check morning block (9-11)
    if (!meetingHours.some(h => h >= 9 && h < 11)) {
      suggestedBlocks.push({
        day_of_week: day,
        start_time: '09:00',
        end_time: '11:00',
        block_type: 'focus',
        label: 'Morning Deep Work',
        reason: 'No meetings scheduled in this period historically',
      });
    }
    
    // Check afternoon block (14-16)
    if (!meetingHours.some(h => h >= 14 && h < 16)) {
      suggestedBlocks.push({
        day_of_week: day,
        start_time: '14:00',
        end_time: '16:00',
        block_type: 'focus',
        label: 'Afternoon Focus',
        reason: 'Low meeting frequency in this period',
      });
    }
  }

  return {
    hourlyPatterns: Object.fromEntries(
      Object.entries(hourlyPatterns).map(([k, v]) => [
        k,
        { ...v, successRate: v.total > 0 ? (v.success / v.total) * 100 : null }
      ])
    ),
    suggestedBlocks,
    totalMeetingsAnalyzed: bookings?.length || 0,
  };
}

async function calculateMeetingLoad(supabase: any, userId: string, date: string) {
  // Get all bookings for this date
  const { data: bookings } = await supabase
    .from('bookings')
    .select('start_time, end_time, status')
    .eq('host_id', userId)
    .gte('start_time', `${date}T00:00:00Z`)
    .lte('start_time', `${date}T23:59:59Z`)
    .in('status', ['confirmed', 'pending', 'completed']);

  // Get user preferences
  const { data: preferences } = await supabase
    .from('focus_time_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const prefs = preferences || {
    max_daily_meetings: 6,
    buffer_between_meetings_minutes: 15,
  };

  // Calculate metrics
  let meetingCount = bookings?.length || 0;
  let meetingMinutes = 0;
  let backToBackCount = 0;
  let longestMeeting = 0;

  const sortedBookings = (bookings || []).sort(
    (a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (let i = 0; i < sortedBookings.length; i++) {
    const booking = sortedBookings[i];
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const duration = (end.getTime() - start.getTime()) / 60000;
    
    meetingMinutes += duration;
    if (duration > longestMeeting) longestMeeting = duration;

    // Check for back-to-back
    if (i > 0) {
      const prevEnd = new Date(sortedBookings[i - 1].end_time);
      const gap = (start.getTime() - prevEnd.getTime()) / 60000;
      if (gap <= prefs.buffer_between_meetings_minutes) {
        backToBackCount++;
      }
    }
  }

  // Calculate load score (0-100)
  const meetingRatio = meetingCount / prefs.max_daily_meetings;
  const backToBackPenalty = backToBackCount * 10;
  const loadScore = Math.min(100, Math.round(meetingRatio * 60 + backToBackPenalty + (meetingMinutes > 360 ? 20 : 0)));

  // Determine burnout risk
  let burnoutRisk = 'low';
  if (loadScore >= 80) burnoutRisk = 'critical';
  else if (loadScore >= 60) burnoutRisk = 'high';
  else if (loadScore >= 40) burnoutRisk = 'medium';

  // Calculate focus time (assuming 8 working hours)
  const workingMinutes = 8 * 60;
  const focusTimeMinutes = Math.max(0, workingMinutes - meetingMinutes);

  // Generate recommendations
  const recommendations: string[] = [];
  if (backToBackCount > 2) {
    recommendations.push('Consider adding buffer time between meetings');
  }
  if (focusTimeMinutes < 120) {
    recommendations.push('Low focus time today. Consider blocking time for deep work');
  }
  if (meetingCount > prefs.max_daily_meetings) {
    recommendations.push(`Exceeding daily meeting limit (${prefs.max_daily_meetings}). Consider rescheduling`);
  }

  // Upsert load data
  const loadData = {
    user_id: userId,
    date,
    meeting_count: meetingCount,
    meeting_minutes: meetingMinutes,
    back_to_back_count: backToBackCount,
    longest_meeting_minutes: longestMeeting,
    focus_time_minutes: focusTimeMinutes,
    load_score: loadScore,
    burnout_risk: burnoutRisk,
    recommendations,
  };

  await supabase
    .from('team_meeting_load')
    .upsert(loadData, { onConflict: 'user_id,date' });

  return loadData;
}
