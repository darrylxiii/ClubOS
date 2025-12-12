import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimeSlot {
  day: number;
  hour: number;
  openRate: number;
  replyRate: number;
  sampleSize: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, analyze_all } = await req.json();

    // Get all replies with timestamps
    const query = supabase
      .from('crm_email_replies')
      .select('*, crm_prospects!inner(campaign_id)')
      .order('created_at', { ascending: false });

    if (campaign_id && !analyze_all) {
      query.eq('crm_prospects.campaign_id', campaign_id);
    }

    const { data: replies } = await query;

    if (!replies || replies.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No reply data available for analysis',
        heatmap: generateDefaultHeatmap(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze reply patterns by day and hour
    const timeSlots: Record<string, TimeSlot> = {};

    for (const reply of replies) {
      const replyDate = new Date(reply.created_at);
      const day = replyDate.getUTCDay(); // 0-6
      const hour = replyDate.getUTCHours(); // 0-23
      const key = `${day}-${hour}`;

      if (!timeSlots[key]) {
        timeSlots[key] = {
          day,
          hour,
          openRate: 0,
          replyRate: 0,
          sampleSize: 0,
        };
      }

      timeSlots[key].sampleSize++;
      timeSlots[key].replyRate = (timeSlots[key].sampleSize / replies.length) * 100;
    }

    // Normalize and calculate scores
    const maxSamples = Math.max(...Object.values(timeSlots).map(s => s.sampleSize));
    const heatmapData = Object.values(timeSlots).map(slot => ({
      ...slot,
      score: (slot.sampleSize / maxSamples) * 100,
    }));

    // Find optimal time slots
    const sortedSlots = heatmapData.sort((a, b) => b.score - a.score);
    const topSlots = sortedSlots.slice(0, 5);

    // Store analytics per campaign if specified
    if (campaign_id) {
      for (const slot of heatmapData) {
        await supabase.from('instantly_send_time_analytics').upsert({
          campaign_id,
          day_of_week: slot.day,
          hour_of_day: slot.hour,
          reply_count: slot.sampleSize,
          reply_rate: slot.replyRate,
          sample_size: slot.sampleSize,
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'campaign_id,day_of_week,hour_of_day',
          ignoreDuplicates: false,
        });
      }
    }

    // Generate recommendations
    const recommendations = generateRecommendations(topSlots);

    return new Response(JSON.stringify({ 
      success: true,
      heatmap: generateFullHeatmap(timeSlots),
      topSlots,
      recommendations,
      totalRepliesAnalyzed: replies.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Send time optimization error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateDefaultHeatmap(): number[][] {
  // 7 days x 24 hours, default distribution
  const heatmap: number[][] = [];
  for (let day = 0; day < 7; day++) {
    heatmap[day] = [];
    for (let hour = 0; hour < 24; hour++) {
      // Business hours get higher default scores
      if (hour >= 9 && hour <= 17 && day >= 1 && day <= 5) {
        heatmap[day][hour] = 60 + Math.random() * 20;
      } else if (hour >= 7 && hour <= 20) {
        heatmap[day][hour] = 30 + Math.random() * 20;
      } else {
        heatmap[day][hour] = 10 + Math.random() * 15;
      }
    }
  }
  return heatmap;
}

function generateFullHeatmap(timeSlots: Record<string, TimeSlot>): number[][] {
  const heatmap: number[][] = [];
  const maxSamples = Math.max(...Object.values(timeSlots).map(s => s.sampleSize), 1);

  for (let day = 0; day < 7; day++) {
    heatmap[day] = [];
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`;
      if (timeSlots[key]) {
        heatmap[day][hour] = (timeSlots[key].sampleSize / maxSamples) * 100;
      } else {
        // Fill with low score for slots with no data
        heatmap[day][hour] = 5;
      }
    }
  }
  return heatmap;
}

function generateRecommendations(topSlots: any[]): string[] {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const recommendations: string[] = [];

  if (topSlots.length === 0) {
    return ['Not enough data to generate recommendations. Send more emails to gather patterns.'];
  }

  // Best single time
  const best = topSlots[0];
  recommendations.push(`Best time to send: ${dayNames[best.day]} at ${formatHour(best.hour)} (based on ${best.sampleSize} replies)`);

  // Best days
  const bestDays = [...new Set(topSlots.slice(0, 3).map(s => s.day))];
  recommendations.push(`Focus on: ${bestDays.map(d => dayNames[d]).join(', ')}`);

  // Best hours
  const avgHour = Math.round(topSlots.reduce((sum, s) => sum + s.hour, 0) / topSlots.length);
  recommendations.push(`Optimal sending window: ${formatHour(avgHour - 1)} - ${formatHour(avgHour + 2)}`);

  // Weekend vs weekday
  const weekendReplies = topSlots.filter(s => s.day === 0 || s.day === 6);
  if (weekendReplies.length > 0 && weekendReplies[0].score > 50) {
    recommendations.push('Consider weekend sends - your audience responds on weekends');
  }

  return recommendations;
}

function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:00 ${period}`;
}
