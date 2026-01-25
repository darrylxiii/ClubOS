import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConflictDetails {
  conflictId?: string;
  userId: string;
  involvedBookings: string[];
  involvedCalendarEvents: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    source: string;
  }>;
  conflictType: 'double_booking' | 'overlap' | 'travel_time' | 'timezone_issue' | 'buffer_violation';
}

interface ResolutionOption {
  option_id: string;
  title: string;
  description: string;
  action_type: 'reschedule' | 'cancel' | 'shorten' | 'merge' | 'accept';
  affected_events: string[];
  new_time?: string;
  disruption_score: number;
  acceptance_probability: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, conflictDetails, selectedSolution } = await req.json();

    if (action === 'detect') {
      // Detect conflicts for a user's upcoming bookings
      return await detectConflicts(supabase, conflictDetails);
    } else if (action === 'propose') {
      // Generate AI-powered resolution options
      return await proposeResolutions(supabase, conflictDetails);
    } else if (action === 'resolve') {
      // Execute a selected resolution
      return await executeResolution(supabase, conflictDetails.conflictId, selectedSolution);
    } else if (action === 'auto-resolve') {
      // Automatically resolve low-severity conflicts
      return await autoResolveConflicts(supabase, conflictDetails.userId);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (error) {
    console.error('[resolve-scheduling-conflict] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function detectConflicts(supabase: any, details: ConflictDetails) {
  const { userId } = details;

  // Get user's upcoming bookings
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      scheduled_start,
      scheduled_end,
      guest_name,
      guest_email,
      status,
      booking_links(title, duration_minutes, buffer_before, buffer_after)
    `)
    .eq('host_id', userId)
    .eq('status', 'confirmed')
    .gte('scheduled_start', new Date().toISOString())
    .order('scheduled_start', { ascending: true });

  if (bookingsError) {
    throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
  }

  // Get user's external calendar events
  const { data: calendarEvents } = await supabase
    .from('unified_calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  const conflicts: Array<{
    type: string;
    severity: string;
    events: any[];
    description: string;
  }> = [];

  // Check for overlapping bookings
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      const booking1 = bookings[i];
      const booking2 = bookings[j];
      
      const start1 = new Date(booking1.scheduled_start);
      const end1 = new Date(booking1.scheduled_end);
      const start2 = new Date(booking2.scheduled_start);
      const end2 = new Date(booking2.scheduled_end);

      // Check direct overlap
      if (start1 < end2 && start2 < end1) {
        conflicts.push({
          type: 'double_booking',
          severity: 'critical',
          events: [booking1, booking2],
          description: `Double booking: "${booking1.booking_links?.title}" overlaps with "${booking2.booking_links?.title}"`
        });
      }

      // Check buffer violations
      const buffer1After = booking1.booking_links?.buffer_after || 0;
      const buffer2Before = booking2.booking_links?.buffer_before || 0;
      const requiredGap = (buffer1After + buffer2Before) * 60 * 1000;
      const actualGap = start2.getTime() - end1.getTime();

      if (actualGap > 0 && actualGap < requiredGap) {
        conflicts.push({
          type: 'buffer_violation',
          severity: 'warning',
          events: [booking1, booking2],
          description: `Buffer violation: Only ${Math.round(actualGap / 60000)}min between meetings (need ${Math.round(requiredGap / 60000)}min)`
        });
      }
    }

    // Check against external calendar
    if (calendarEvents) {
      for (const calEvent of calendarEvents) {
        const bookingStart = new Date(bookings[i].scheduled_start);
        const bookingEnd = new Date(bookings[i].scheduled_end);
        const calStart = new Date(calEvent.start_time);
        const calEnd = new Date(calEvent.end_time);

        if (bookingStart < calEnd && calStart < bookingEnd) {
          conflicts.push({
            type: 'overlap',
            severity: calEvent.is_all_day ? 'warning' : 'error',
            events: [bookings[i], calEvent],
            description: `Conflict with external event: "${calEvent.title}"`
          });
        }
      }
    }
  }

  // Store detected conflicts
  for (const conflict of conflicts) {
    const { error: insertError } = await supabase
      .from('scheduling_conflicts')
      .insert({
        user_id: userId,
        conflict_type: conflict.type,
        severity: conflict.severity,
        involved_bookings: conflict.events.filter(e => e.booking_links).map(e => e.id),
        involved_calendar_events: conflict.events.filter(e => !e.booking_links),
        status: 'pending'
      });

    if (insertError) {
      console.error('[detect] Failed to store conflict:', insertError);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      conflicts_found: conflicts.length,
      conflicts
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function proposeResolutions(supabase: any, details: ConflictDetails) {
  const { conflictId, involvedBookings, involvedCalendarEvents, conflictType, userId } = details;

  // Fetch full booking details
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_links(title, duration_minutes)
    `)
    .in('id', involvedBookings);

  // Get available slots for rescheduling
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Use AI to generate resolution options
  const prompt = `Given a scheduling conflict of type "${conflictType}" involving:

Bookings:
${bookings?.map((b: any) => `- "${b.booking_links?.title}" with ${b.guest_name} at ${b.scheduled_start}`).join('\n') || 'None'}

External Events:
${involvedCalendarEvents.map(e => `- "${e.title}" at ${e.start}`).join('\n') || 'None'}

Generate 3 resolution options. For each option provide:
1. A clear title
2. A description of the resolution
3. The action type (reschedule, cancel, shorten, merge, or accept)
4. Which events are affected
5. A disruption score (0-100, lower is better)
6. An estimated acceptance probability (0-100)

Respond in JSON format:
{
  "options": [
    {
      "option_id": "opt_1",
      "title": "...",
      "description": "...",
      "action_type": "...",
      "affected_events": ["event_id"],
      "disruption_score": 30,
      "acceptance_probability": 80
    }
  ]
}`;

  // Call AI for resolution suggestions
  const response = await fetch('https://dpjucecmoyfzrduhlctt.functions.supabase.co/lovable-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are QUIN, an AI scheduling assistant. Generate practical, considerate resolution options for scheduling conflicts.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    // Fallback to static options
    const options = generateStaticResolutions(bookings, conflictType);
    
    if (conflictId) {
      await supabase
        .from('scheduling_conflicts')
        .update({ proposed_solutions: options })
        .eq('id', conflictId);
    }

    return new Response(
      JSON.stringify({ success: true, options }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const aiResult = await response.json();
  let options: ResolutionOption[] = [];
  
  try {
    const parsed = JSON.parse(aiResult.choices?.[0]?.message?.content || '{}');
    options = parsed.options || [];
  } catch {
    options = generateStaticResolutions(bookings, conflictType);
  }

  // Store proposed solutions
  if (conflictId) {
    await supabase
      .from('scheduling_conflicts')
      .update({ proposed_solutions: options })
      .eq('id', conflictId);
  }

  return new Response(
    JSON.stringify({ success: true, options }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function generateStaticResolutions(bookings: any[], conflictType: string): ResolutionOption[] {
  const options: ResolutionOption[] = [];

  if (bookings.length >= 2) {
    // Option 1: Reschedule the second meeting
    options.push({
      option_id: 'opt_reschedule',
      title: 'Reschedule Later Meeting',
      description: `Move "${bookings[1]?.booking_links?.title || 'Meeting 2'}" to the next available slot`,
      action_type: 'reschedule',
      affected_events: [bookings[1]?.id],
      disruption_score: 40,
      acceptance_probability: 70
    });

    // Option 2: Shorten first meeting
    options.push({
      option_id: 'opt_shorten',
      title: 'Shorten First Meeting',
      description: `Reduce "${bookings[0]?.booking_links?.title || 'Meeting 1'}" by 15 minutes to create buffer`,
      action_type: 'shorten',
      affected_events: [bookings[0]?.id],
      disruption_score: 25,
      acceptance_probability: 60
    });
  }

  // Option 3: Accept conflict (for warnings)
  if (conflictType === 'buffer_violation') {
    options.push({
      option_id: 'opt_accept',
      title: 'Accept Tight Schedule',
      description: 'Acknowledge the tight schedule and proceed as planned',
      action_type: 'accept',
      affected_events: [],
      disruption_score: 0,
      acceptance_probability: 90
    });
  }

  return options;
}

async function executeResolution(supabase: any, conflictId: string, solution: ResolutionOption) {
  const { data: conflict, error: fetchError } = await supabase
    .from('scheduling_conflicts')
    .select('*')
    .eq('id', conflictId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch conflict: ${fetchError.message}`);
  }

  let resolutionResult = { success: false, message: '' };

  switch (solution.action_type) {
    case 'reschedule':
      // Find next available slot and reschedule
      resolutionResult = await handleReschedule(supabase, solution.affected_events[0]);
      break;

    case 'cancel':
      // Cancel the affected booking
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', solution.affected_events[0]);
      resolutionResult = { success: true, message: 'Booking cancelled' };
      break;

    case 'shorten':
      // Shorten the meeting duration
      const { data: booking } = await supabase
        .from('bookings')
        .select('scheduled_start, scheduled_end')
        .eq('id', solution.affected_events[0])
        .single();
      
      if (booking) {
        const newEnd = new Date(booking.scheduled_end);
        newEnd.setMinutes(newEnd.getMinutes() - 15);
        
        await supabase
          .from('bookings')
          .update({ scheduled_end: newEnd.toISOString() })
          .eq('id', solution.affected_events[0]);
        
        resolutionResult = { success: true, message: 'Meeting shortened by 15 minutes' };
      }
      break;

    case 'accept':
      resolutionResult = { success: true, message: 'Conflict acknowledged' };
      break;

    default:
      resolutionResult = { success: false, message: 'Unknown action type' };
  }

  // Update conflict status
  await supabase
    .from('scheduling_conflicts')
    .update({
      status: resolutionResult.success ? 'resolved' : 'pending',
      resolved_at: resolutionResult.success ? new Date().toISOString() : null,
      selected_solution_index: solution.option_id
    })
    .eq('id', conflictId);

  // Log resolution history
  await supabase
    .from('conflict_resolution_history')
    .insert({
      conflict_id: conflictId,
      action_taken: solution.action_type,
      action_details: solution,
      affected_parties: solution.affected_events,
      notifications_sent: false
    });

  return new Response(
    JSON.stringify({ success: true, result: resolutionResult }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleReschedule(supabase: any, bookingId: string) {
  // Get the booking details
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_links(id, duration_minutes)
    `)
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return { success: false, message: 'Booking not found' };
  }

  // Find next available slot (simplified - in production, use get-available-slots)
  const originalStart = new Date(booking.scheduled_start);
  const newStart = new Date(originalStart);
  newStart.setHours(newStart.getHours() + 2); // Move 2 hours later as fallback
  
  const newEnd = new Date(newStart);
  newEnd.setMinutes(newEnd.getMinutes() + (booking.booking_links?.duration_minutes || 30));

  await supabase
    .from('bookings')
    .update({
      scheduled_start: newStart.toISOString(),
      scheduled_end: newEnd.toISOString()
    })
    .eq('id', bookingId);

  return { 
    success: true, 
    message: `Meeting rescheduled to ${newStart.toLocaleString()}` 
  };
}

async function autoResolveConflicts(supabase: any, userId: string) {
  // Get pending conflicts with low severity
  const { data: conflicts } = await supabase
    .from('scheduling_conflicts')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .eq('severity', 'warning');

  if (!conflicts || conflicts.length === 0) {
    return new Response(
      JSON.stringify({ success: true, resolved: 0, message: 'No auto-resolvable conflicts' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let resolvedCount = 0;

  for (const conflict of conflicts) {
    // Auto-accept buffer violations and timezone warnings
    if (conflict.conflict_type === 'buffer_violation' || conflict.conflict_type === 'timezone_issue') {
      await supabase
        .from('scheduling_conflicts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: 'Auto-resolved: Low severity conflict accepted'
        })
        .eq('id', conflict.id);

      await supabase
        .from('conflict_resolution_history')
        .insert({
          conflict_id: conflict.id,
          action_taken: 'auto_accept',
          action_details: { reason: 'Low severity auto-resolution' }
        });

      resolvedCount++;
    }
  }

  return new Response(
    JSON.stringify({ success: true, resolved: resolvedCount }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
