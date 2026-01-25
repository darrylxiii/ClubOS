import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  current_load: number;
  burnout_risk: string;
  expertise_match: number;
  available_slots: number;
  meeting_count_today: number;
  meeting_count_week: number;
}

interface BalanceRequest {
  action: 'select_host' | 'get_team_load' | 'rebalance_schedule';
  bookingLinkId: string;
  proposedTime?: string;
  duration?: number;
  meetingType?: string;
  requiredSkills?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: BalanceRequest = await req.json();
    const { action, bookingLinkId, proposedTime, duration = 30, meetingType, requiredSkills } = body;

    if (action === 'select_host') {
      // Select optimal host for round-robin or collective booking
      const result = await selectOptimalHost(supabase, bookingLinkId, proposedTime!, duration, meetingType, requiredSkills);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_team_load') {
      // Get load distribution across team
      const teamLoad = await getTeamLoadDistribution(supabase, bookingLinkId);
      return new Response(JSON.stringify(teamLoad), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'rebalance_schedule') {
      // Suggest schedule rebalancing
      const suggestions = await suggestRebalancing(supabase, bookingLinkId);
      return new Response(JSON.stringify(suggestions), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Team balancing error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function selectOptimalHost(
  supabase: any,
  bookingLinkId: string,
  proposedTime: string,
  duration: number,
  meetingType?: string,
  requiredSkills?: string[]
): Promise<{
  selectedHost: TeamMember | null;
  allHosts: TeamMember[];
  selectionReason: string;
  fairnessScore: number;
}> {
  // Get booking link with team members
  const { data: bookingLink } = await supabase
    .from('booking_links')
    .select(`
      *,
      team_members:booking_link_team_members(
        user_id,
        priority,
        is_active,
        profile:profiles!booking_link_team_members_user_id_fkey(id, email, full_name)
      )
    `)
    .eq('id', bookingLinkId)
    .single();

  if (!bookingLink || !bookingLink.team_members?.length) {
    return {
      selectedHost: null,
      allHosts: [],
      selectionReason: 'No team members configured',
      fairnessScore: 0,
    };
  }

  const proposedDate = new Date(proposedTime);
  const dateStr = proposedDate.toISOString().split('T')[0];
  const weekStart = getWeekStart(proposedDate);

  // Get each team member's current load and availability
  const teamMembers: TeamMember[] = [];

  for (const member of bookingLink.team_members) {
    if (!member.is_active || !member.profile) continue;

    const userId = member.user_id;

    // Get today's load
    const { data: todayLoad } = await supabase
      .from('team_meeting_load')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();

    // Get week's meeting count
    const { data: weekBookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('host_id', userId)
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', proposedTime)
      .in('status', ['confirmed', 'pending', 'completed']);

    // Check availability at proposed time
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .eq('host_id', userId)
      .gte('start_time', proposedTime)
      .lte('start_time', new Date(proposedDate.getTime() + duration * 60000).toISOString())
      .in('status', ['confirmed', 'pending']);

    // Check focus blocks
    const timeStr = proposedDate.toTimeString().slice(0, 5);
    const { data: focusBlocks } = await supabase
      .from('focus_time_blocks')
      .select('id')
      .eq('user_id', userId)
      .eq('day_of_week', proposedDate.getUTCDay())
      .eq('is_active', true)
      .lte('start_time', timeStr)
      .gte('end_time', timeStr);

    const isAvailable = (!conflicts || conflicts.length === 0) && (!focusBlocks || focusBlocks.length === 0);

    // Calculate expertise match (simplified - would use skills table in real implementation)
    let expertiseMatch = 50; // Base score
    if (meetingType === 'technical' && member.priority === 1) expertiseMatch = 90;
    if (meetingType === 'culture' && member.priority === 2) expertiseMatch = 85;

    teamMembers.push({
      id: userId,
      email: member.profile.email,
      full_name: member.profile.full_name,
      current_load: todayLoad?.load_score || 0,
      burnout_risk: todayLoad?.burnout_risk || 'low',
      expertise_match: expertiseMatch,
      available_slots: isAvailable ? 1 : 0,
      meeting_count_today: todayLoad?.meeting_count || 0,
      meeting_count_week: weekBookings?.length || 0,
    });
  }

  // Score each available team member
  const availableMembers = teamMembers.filter(m => m.available_slots > 0);
  
  if (availableMembers.length === 0) {
    return {
      selectedHost: null,
      allHosts: teamMembers,
      selectionReason: 'No team members available at this time',
      fairnessScore: 0,
    };
  }

  // Calculate fairness-weighted scores
  // Lower load = higher score, lower week count = higher score
  const maxWeekMeetings = Math.max(...teamMembers.map(m => m.meeting_count_week), 1);
  const scoredMembers = availableMembers.map(member => {
    const loadScore = 100 - member.current_load; // 0-100
    const fairnessScore = 100 - (member.meeting_count_week / maxWeekMeetings) * 100;
    const expertiseScore = member.expertise_match;
    const burnoutPenalty = member.burnout_risk === 'high' ? 30 : member.burnout_risk === 'critical' ? 50 : 0;

    const totalScore = (
      loadScore * 0.3 +
      fairnessScore * 0.35 +
      expertiseScore * 0.25 +
      (100 - burnoutPenalty) * 0.1
    );

    return { ...member, score: totalScore };
  });

  // Sort by score descending
  scoredMembers.sort((a, b) => b.score - a.score);
  const selected = scoredMembers[0];

  // Calculate overall fairness (variance in meeting distribution)
  const weekCounts = teamMembers.map(m => m.meeting_count_week);
  const avgWeek = weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length;
  const variance = weekCounts.reduce((sum, count) => sum + Math.pow(count - avgWeek, 2), 0) / weekCounts.length;
  const fairnessScore = Math.max(0, 100 - variance * 10);

  const reasons = [];
  if (selected.current_load < 30) reasons.push('low current load');
  if (selected.meeting_count_week < avgWeek) reasons.push('below average weekly meetings');
  if (selected.expertise_match > 70) reasons.push('strong expertise match');
  if (selected.burnout_risk === 'low') reasons.push('healthy work balance');

  return {
    selectedHost: selected,
    allHosts: teamMembers,
    selectionReason: `Selected for: ${reasons.join(', ')}`,
    fairnessScore: Math.round(fairnessScore),
  };
}

async function getTeamLoadDistribution(supabase: any, bookingLinkId: string) {
  // Get booking link with team members
  const { data: bookingLink } = await supabase
    .from('booking_links')
    .select(`
      *,
      team_members:booking_link_team_members(
        user_id,
        is_active,
        profile:profiles!booking_link_team_members_user_id_fkey(id, email, full_name)
      )
    `)
    .eq('id', bookingLinkId)
    .single();

  if (!bookingLink) {
    return { error: 'Booking link not found' };
  }

  const today = new Date().toISOString().split('T')[0];
  const weekStart = getWeekStart(new Date());

  const teamLoad: any[] = [];

  for (const member of (bookingLink.team_members || [])) {
    if (!member.is_active || !member.profile) continue;

    const userId = member.user_id;

    // Get 7 days of load data
    const { data: loadHistory } = await supabase
      .from('team_meeting_load')
      .select('*')
      .eq('user_id', userId)
      .gte('date', weekStart.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Get today's detailed load
    const { data: todayLoad } = await supabase
      .from('team_meeting_load')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    teamLoad.push({
      userId,
      email: member.profile.email,
      fullName: member.profile.full_name,
      todayLoad: todayLoad?.load_score || 0,
      burnoutRisk: todayLoad?.burnout_risk || 'low',
      weekHistory: loadHistory || [],
      recommendations: todayLoad?.recommendations || [],
    });
  }

  // Calculate team-level metrics
  const avgLoad = teamLoad.reduce((sum, m) => sum + m.todayLoad, 0) / (teamLoad.length || 1);
  const criticalCount = teamLoad.filter(m => m.burnoutRisk === 'critical').length;
  const highCount = teamLoad.filter(m => m.burnoutRisk === 'high').length;

  return {
    teamMembers: teamLoad,
    teamMetrics: {
      averageLoad: Math.round(avgLoad),
      criticalBurnoutRisk: criticalCount,
      highBurnoutRisk: highCount,
      healthyMembers: teamLoad.length - criticalCount - highCount,
    },
    teamHealthStatus: criticalCount > 0 ? 'critical' : highCount > 1 ? 'concerning' : 'healthy',
  };
}

async function suggestRebalancing(supabase: any, bookingLinkId: string) {
  const teamLoad = await getTeamLoadDistribution(supabase, bookingLinkId);
  
  if ('error' in teamLoad) {
    return teamLoad;
  }

  const suggestions: any[] = [];

  // Find overloaded and underloaded members
  const overloaded = teamLoad.teamMembers.filter((m: any) => m.todayLoad > 70);
  const underloaded = teamLoad.teamMembers.filter((m: any) => m.todayLoad < 30);

  // Suggest redistributing meetings
  for (const member of overloaded) {
    if (underloaded.length > 0) {
      suggestions.push({
        type: 'redistribute',
        from: member.fullName,
        to: underloaded[0].fullName,
        reason: `${member.fullName} has load of ${member.todayLoad}%, consider moving meetings to ${underloaded[0].fullName} (${underloaded[0].todayLoad}%)`,
        priority: member.burnoutRisk === 'critical' ? 'high' : 'medium',
      });
    }
  }

  // Suggest focus time for high-load members
  for (const member of teamLoad.teamMembers.filter((m: any) => m.burnoutRisk === 'high' || m.burnoutRisk === 'critical')) {
    suggestions.push({
      type: 'add_focus_time',
      member: member.fullName,
      reason: `${member.fullName} is at ${member.burnoutRisk} burnout risk. Consider blocking focus time.`,
      priority: member.burnoutRisk === 'critical' ? 'high' : 'medium',
    });
  }

  return {
    suggestions,
    teamHealth: teamLoad.teamHealthStatus,
    metrics: teamLoad.teamMetrics,
  };
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
