import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, eventType, eventData } = await req.json();

    console.log('[Achievement Evaluator] Processing event:', { userId, eventType });

    // Log the event
    const { data: eventRecord } = await supabase
      .from('achievement_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
      })
      .select()
      .single();

    // Fetch unprocessed events for evaluation
    const { data: unprocessedEvents } = await supabase
      .from('achievement_events')
      .select('*')
      .eq('user_id', userId)
      .eq('processed', false)
      .order('created_at', { ascending: true });

    console.log('[Achievement Evaluator] Unprocessed events:', unprocessedEvents?.length);

    // Fetch all active achievements
    const { data: achievements } = await supabase
      .from('quantum_achievements')
      .select('*')
      .eq('is_active', true)
      .eq('is_deprecated', false);

    const unlockedAchievements = [];

    // Evaluate each achievement
    for (const achievement of achievements || []) {
      const criteria = achievement.unlock_criteria;
      
      // Check if already unlocked
      const { data: existing } = await supabase
        .from('user_quantum_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id)
        .single();

      if (existing) continue;

      let shouldUnlock = false;
      let progressValue = 0;

      // Evaluate based on criteria type
      switch (criteria.type) {
        case 'signup':
          shouldUnlock = true;
          break;
        
        case 'posts':
          const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          progressValue = postCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;

        case 'streak':
          const { data: engagement } = await supabase
            .from('user_engagement')
            .select('current_streak')
            .eq('user_id', userId)
            .single();
          progressValue = engagement?.current_streak || 0;
          shouldUnlock = progressValue >= (criteria.days || 0);
          break;

        case 'level':
          const { data: levelData } = await supabase
            .from('user_engagement')
            .select('level')
            .eq('user_id', userId)
            .single();
          progressValue = levelData?.level || 0;
          shouldUnlock = progressValue >= (criteria.level || 0);
          break;
      }

      // Update progress
      await supabase
        .from('achievement_progress')
        .upsert({
          user_id: userId,
          achievement_id: achievement.id,
          progress_value: progressValue,
          target_value: criteria.count || criteria.days || criteria.level || 1,
        });

      // Unlock if criteria met
      if (shouldUnlock) {
        const { data: unlocked } = await supabase
          .from('user_quantum_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            is_showcased: unlockedAchievements.length < 3,
          })
          .select()
          .single();

        if (unlocked) {
          unlockedAchievements.push({
            id: achievement.id,
            name: achievement.name,
            points: achievement.points,
          });

          // Award XP
          await supabase.rpc('increment_user_xp', {
            user_id: userId,
            xp_amount: achievement.points,
          });

          console.log('[Achievement Evaluator] Unlocked:', achievement.name);
        }
      }
    }

    // Mark events as processed
    if (unprocessedEvents && unprocessedEvents.length > 0) {
      await supabase
        .from('achievement_events')
        .update({ processed: true })
        .in('id', unprocessedEvents.map(e => e.id));
    }

    return new Response(
      JSON.stringify({
        success: true,
        unlockedAchievements,
        eventId: eventRecord?.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Achievement Evaluator] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
