import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Challenge {
  name: string;
  description: string;
  challenge_type: 'daily' | 'weekly';
  criteria: {
    type: string;
    count: number;
  };
  bonus_points: number;
}

// Predefined challenge templates
const dailyChallengeTemplates: Challenge[] = [
  {
    name: 'Daily Explorer',
    description: 'View 3 job postings today',
    challenge_type: 'daily',
    criteria: { type: 'jobs_viewed', count: 3 },
    bonus_points: 25,
  },
  {
    name: 'Application Sprint',
    description: 'Submit 1 job application today',
    challenge_type: 'daily',
    criteria: { type: 'applications', count: 1 },
    bonus_points: 50,
  },
  {
    name: 'Learning Hour',
    description: 'Complete 1 course module today',
    challenge_type: 'daily',
    criteria: { type: 'modules_completed', count: 1 },
    bonus_points: 40,
  },
  {
    name: 'Network Builder',
    description: 'Send 2 messages today',
    challenge_type: 'daily',
    criteria: { type: 'messages_sent', count: 2 },
    bonus_points: 30,
  },
  {
    name: 'Profile Perfectionist',
    description: 'Update your profile today',
    challenge_type: 'daily',
    criteria: { type: 'profile_updates', count: 1 },
    bonus_points: 20,
  },
];

const weeklyChallengeTemplates: Challenge[] = [
  {
    name: 'Weekly Achiever',
    description: 'Apply to 5 jobs this week',
    challenge_type: 'weekly',
    criteria: { type: 'applications', count: 5 },
    bonus_points: 200,
  },
  {
    name: 'Learning Champion',
    description: 'Complete 3 courses this week',
    challenge_type: 'weekly',
    criteria: { type: 'courses', count: 3 },
    bonus_points: 250,
  },
  {
    name: 'Network Pro',
    description: 'Make 10 new connections this week',
    challenge_type: 'weekly',
    criteria: { type: 'connections', count: 10 },
    bonus_points: 300,
  },
  {
    name: 'Streak Master',
    description: 'Login for 7 consecutive days',
    challenge_type: 'weekly',
    criteria: { type: 'login_streak', count: 7 },
    bonus_points: 350,
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Generate Daily Challenges] Starting challenge generation');

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Check if daily challenges already exist for today
    const { data: existingDaily } = await supabase
      .from('achievement_challenges')
      .select('id')
      .eq('challenge_type', 'daily')
      .eq('start_date', today)
      .single();

    if (!existingDaily) {
      // Generate 3 random daily challenges
      const shuffled = [...dailyChallengeTemplates].sort(() => 0.5 - Math.random());
      const selectedDaily = shuffled.slice(0, 3);

      for (const challenge of selectedDaily) {
        await supabase.from('achievement_challenges').insert({
          name: challenge.name,
          description: challenge.description,
          challenge_type: 'daily',
          criteria: challenge.criteria,
          bonus_points: challenge.bonus_points,
          start_date: today,
          end_date: today,
          is_active: true,
        });
      }

      console.log('[Generate Daily Challenges] Created 3 daily challenges');
    }

    // Check if weekly challenges exist for this week
    const { data: existingWeekly } = await supabase
      .from('achievement_challenges')
      .select('id')
      .eq('challenge_type', 'weekly')
      .eq('start_date', weekStartStr)
      .single();

    if (!existingWeekly && now.getDay() === 1) {
      // Only generate weekly challenges on Monday
      const shuffled = [...weeklyChallengeTemplates].sort(() => 0.5 - Math.random());
      const selectedWeekly = shuffled.slice(0, 2);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      for (const challenge of selectedWeekly) {
        await supabase.from('achievement_challenges').insert({
          name: challenge.name,
          description: challenge.description,
          challenge_type: 'weekly',
          criteria: challenge.criteria,
          bonus_points: challenge.bonus_points,
          start_date: weekStartStr,
          end_date: weekEndStr,
          is_active: true,
        });
      }

      console.log('[Generate Daily Challenges] Created 2 weekly challenges');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Challenges generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Generate Daily Challenges] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
