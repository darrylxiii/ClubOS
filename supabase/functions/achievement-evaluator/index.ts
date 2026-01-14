import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders } from '../_shared/cors-config.ts';

const corsHeaders = publicCorsHeaders;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, eventType, eventData } = await req.json();

    console.log('[Achievement Evaluator] Processing event:', { userId, eventType, eventData });

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

        case 'posts': {
          const { count: postCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          progressValue = postCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'streak': {
          const { data: engagement } = await supabase
            .from('user_engagement')
            .select('current_streak')
            .eq('user_id', userId)
            .single();
          progressValue = engagement?.current_streak || 0;
          shouldUnlock = progressValue >= (criteria.days || 0);
          break;
        }

        case 'level': {
          const { data: levelData } = await supabase
            .from('user_engagement')
            .select('level')
            .eq('user_id', userId)
            .single();
          progressValue = levelData?.level || 0;
          shouldUnlock = progressValue >= (criteria.level || 0);
          break;
        }

        case 'applications': {
          const { count: appCount } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          progressValue = appCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'applications_advanced': {
          const { count: advancedCount } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['interview', 'offer', 'hired']);
          progressValue = advancedCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'applications_hired': {
          const { count: hiredCount } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'hired');
          progressValue = hiredCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'courses': {
          const { count: courseCount } = await supabase
            .from('course_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('completed', true);
          progressValue = courseCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'course_modules': {
          const { count: moduleCount } = await supabase
            .from('module_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('completed', true);
          progressValue = moduleCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'assessments': {
          const { count: assessmentCount } = await supabase
            .from('assessment_results')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          progressValue = assessmentCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'assessment_perfect': {
          const { count: perfectCount } = await supabase
            .from('assessment_results')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('score', 100);
          progressValue = perfectCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'referrals': {
          const { count: referralCount } = await supabase
            .from('referral_network')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', userId)
            .eq('status', 'joined');
          progressValue = referralCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'referrals_hired': {
          const { count: referralHiredCount } = await supabase
            .from('referral_network')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', userId)
            .eq('status', 'hired');
          progressValue = referralHiredCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'interviews': {
          const { count: interviewCount } = await supabase
            .from('meetings')
            .select('*', { count: 'exact', head: true })
            .eq('candidate_id', userId)
            .eq('meeting_type', 'interview')
            .eq('status', 'ended');
          progressValue = interviewCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'connections': {
          const { count: connectionCount } = await supabase
            .from('candidate_network')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('connection_status', 'accepted');
          progressValue = connectionCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'profile_completion': {
          const { data: profile } = await supabase
            .from('candidate_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (profile) {
            const fields = [
              profile.full_name, profile.bio, profile.current_title,
              profile.current_company, profile.location, profile.linkedin_url,
              profile.github_url, profile.portfolio_url, profile.avatar_url
            ];
            const completedFields = fields.filter(f => f && f.length > 0).length;
            progressValue = Math.round((completedFields / fields.length) * 100);
            shouldUnlock = progressValue >= (criteria.percentage || 0);
          }
          break;
        }

        case 'jobs_saved': {
          const { count: savedJobsCount } = await supabase
            .from('saved_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          progressValue = savedJobsCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'jobs_viewed': {
          const { count: viewedJobsCount } = await supabase
            .from('user_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('event_type', 'job_view');
          progressValue = viewedJobsCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'messages_sent': {
          const { count: messagesCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', userId);
          progressValue = messagesCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'login_streak': {
          const { data: activity } = await supabase
            .from('user_activity_tracking')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (activity) {
            progressValue = activity.session_count || 0;
            shouldUnlock = progressValue >= (criteria.days || 0);
          }
          break;
        }

        case 'time_on_platform': {
          const { data: timeActivity } = await supabase
            .from('user_activity_tracking')
            .select('total_session_duration_minutes')
            .eq('user_id', userId)
            .single();

          if (timeActivity) {
            progressValue = timeActivity.total_session_duration_minutes || 0;
            shouldUnlock = progressValue >= (criteria.minutes || 0);
          }
          break;
        }

        case 'community_reactions': {
          const { count: reactionsCount } = await supabase
            .from('achievement_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('reactor_id', userId);
          progressValue = reactionsCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'mentor_sessions': {
          const { count: mentorCount } = await supabase
            .from('meetings')
            .select('*', { count: 'exact', head: true })
            .eq('organizer_id', userId)
            .eq('meeting_type', 'mentorship');
          progressValue = mentorCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'documents_uploaded': {
          const { count: docsCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          progressValue = docsCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'early_bird': {
          // Check if user logged in before 7 AM multiple times
          const { count: earlyLoginCount } = await supabase
            .from('user_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('event_type', 'login')
            .gte('created_at', 'CURRENT_DATE')
            .lt('created_at', 'CURRENT_DATE + INTERVAL \'7 hours\'');
          progressValue = earlyLoginCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'night_owl': {
          // Check if user logged in after 11 PM multiple times
          const { count: lateLoginCount } = await supabase
            .from('user_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('event_type', 'login')
            .gte('created_at', 'CURRENT_DATE + INTERVAL \'23 hours\'');
          progressValue = lateLoginCount || 0;
          shouldUnlock = progressValue >= (criteria.count || 0);
          break;
        }

        case 'xp_milestone': {
          const { data: xpData } = await supabase
            .from('achievement_leaderboard')
            .select('total_xp')
            .eq('user_id', userId)
            .single();
          progressValue = xpData?.total_xp || 0;
          shouldUnlock = progressValue >= (criteria.xp || 0);
          break;
        }

        case 'anniversary': {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', userId)
            .single();

          if (profileData) {
            const daysSinceJoined = Math.floor(
              (new Date().getTime() - new Date(profileData.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            progressValue = daysSinceJoined;
            shouldUnlock = daysSinceJoined >= (criteria.days || 365);
          }
          break;
        }
      }

      // Update progress
      await supabase
        .from('achievement_progress')
        .upsert({
          user_id: userId,
          achievement_id: achievement.id,
          progress_value: progressValue,
          target_value: criteria.count || criteria.days || criteria.level || criteria.percentage || criteria.minutes || criteria.xp || 1,
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
            icon_emoji: achievement.icon_emoji,
            points: achievement.points,
            rarity: achievement.rarity,
            animation_type: achievement.animation_type || 'default',
          });

          // Award XP via engagement system
          const { data: existingEngagement } = await supabase
            .from('user_engagement')
            .select('total_xp')
            .eq('user_id', userId)
            .single();

          const newXp = (existingEngagement?.total_xp || 0) + achievement.points;

          await supabase
            .from('user_engagement')
            .upsert({
              user_id: userId,
              total_xp: newXp,
              level: Math.floor(newXp / 100) + 1,
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
