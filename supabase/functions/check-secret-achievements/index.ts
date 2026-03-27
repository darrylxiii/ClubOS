import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
    const { userId, eventType, eventData } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('[Check Secret Achievements] Checking for user:', userId);

    // Fetch all secret achievements
    const { data: secretAchievements } = await ctx.supabase
      .from('quantum_achievements')
      .select('*')
      .eq('is_secret', true)
      .eq('is_active', true);

    if (!secretAchievements || secretAchievements.length === 0) {
      return new Response(
        JSON.stringify({ unlockedAchievements: [] }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which secret achievements are already unlocked
    const { data: userAchievements } = await ctx.supabase
      .from('user_quantum_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlockedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) || []);
    const unlockedAchievements = [];

    // Check each secret achievement's conditions
    for (const achievement of secretAchievements) {
      if (unlockedIds.has(achievement.id)) continue;

      const criteria = achievement.unlock_criteria;
      let shouldUnlock = false;

      // Easter egg - click specific hidden button
      if (criteria.type === 'easter_egg' && eventType === 'easter_egg_found') {
        shouldUnlock = true;
      }

      // Night application - apply at 3 AM
      if (criteria.type === 'night_application' && eventType === 'application_submit') {
        const hour = new Date().getHours();
        if (hour === 3) shouldUnlock = true;
      }

      // Lucky seven - 7 actions on the 7th day of month
      if (criteria.type === 'lucky_seven' && eventData?.count === 7) {
        const day = new Date().getDate();
        if (day === 7) shouldUnlock = true;
      }

      // Unicorn - be the first to unlock a new achievement
      if (criteria.type === 'unicorn' && eventType === 'achievement_unlocked') {
        const { count } = await ctx.supabase
          .from('user_quantum_achievements')
          .select('*', { count: 'exact', head: true })
          .eq('achievement_id', eventData?.achievementId);

        if (count === 1) shouldUnlock = true;
      }

      if (shouldUnlock) {
        // Unlock the secret achievement
        const { data: newAchievement } = await ctx.supabase
          .from('user_quantum_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            is_showcased: true,
          })
          .select()
          .single();

        if (newAchievement) {
          // Update user XP via direct upsert
          const { data: engagement } = await ctx.supabase
            .from('user_engagement')
            .select('total_xp')
            .eq('user_id', userId)
            .single();

          const newXp = (engagement?.total_xp || 0) + (achievement.points || 0);
          await ctx.supabase.from('user_engagement').upsert({
            user_id: userId,
            total_xp: newXp,
            level: Math.floor(newXp / 100) + 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

          unlockedAchievements.push({
            ...achievement,
            user_achievement_id: newAchievement.id,
          });

          console.log('[Check Secret Achievements] Unlocked:', achievement.name);
        }
      }
    }

    return new Response(
      JSON.stringify({ unlockedAchievements }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
