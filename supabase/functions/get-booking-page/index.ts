import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type HostDisplayMode = 'full' | 'discreet' | 'avatar_only' | 'name_only';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug } = await req.json();
    if (!slug || typeof slug !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing slug' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      // Use service role so we never depend on public table policies for bootstrapping.
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: bookingLink, error: linkError } = await supabase
      .from('booking_links')
      .select(
        [
          'id',
          'user_id',
          'slug',
          'title',
          'description',
          'duration_minutes',
          'buffer_before_minutes',
          'buffer_after_minutes',
          'advance_booking_days',
          'min_notice_hours',
          'color',
          'custom_questions',
          'is_active',
          'allow_guest_platform_choice',
          'available_platforms',
          'video_platform',
          'host_display_mode',
        ].join(', '),
      )
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (linkError || !bookingLink) {
      return new Response(JSON.stringify({ error: 'Booking link not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase JS edge typing can be loose; keep this function robust with explicit casting.
    const bookingLinkAny = bookingLink as unknown as Record<string, unknown>;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, work_timezone')
      .eq('id', bookingLinkAny.user_id as string)
      .single();

    const displayMode = (bookingLinkAny.host_display_mode ?? 'full') as HostDisplayMode;
    const fullName = profile?.full_name ?? null;
    const avatarUrl = profile?.avatar_url ?? null;

    const host = {
      full_name:
        displayMode === 'discreet'
          ? null
          : displayMode === 'avatar_only'
            ? null
            : fullName,
      avatar_url:
        displayMode === 'discreet'
          ? null
          : displayMode === 'name_only'
            ? null
            : avatarUrl,
      work_timezone: profile?.work_timezone ?? null,
      display_mode: displayMode,
    };

    const { data: activeCalendarConnections } = await supabase
      .from('calendar_connections')
      .select('provider')
      .eq('user_id', bookingLinkAny.user_id as string)
      .eq('is_active', true);

    const hasCalendarConnected = (activeCalendarConnections?.length ?? 0) > 0;
    const hasGoogleCalendar = (activeCalendarConnections ?? []).some((c) => c.provider === 'google');

    return new Response(
      JSON.stringify({
        bookingLink,
        host,
        hasCalendarConnected,
        hasGoogleCalendar,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[get-booking-page] Error:', message);
    return new Response(JSON.stringify({ error: 'Failed to load booking page' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
