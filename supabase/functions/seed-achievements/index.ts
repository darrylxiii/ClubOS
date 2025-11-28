import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const achievements = [
  // Career Journey (15 achievements)
  {
    name: 'First Steps',
    description: 'Submit your first job application',
    icon_emoji: '🎯',
    category: 'career',
    rarity: 'common',
    points: 10,
    unlock_criteria: { type: 'applications', count: 1 },
  },
  {
    name: 'Job Hunter',
    description: 'Submit 5 job applications',
    icon_emoji: '🏹',
    category: 'career',
    rarity: 'common',
    points: 25,
    unlock_criteria: { type: 'applications', count: 5 },
  },
  {
    name: 'Active Seeker',
    description: 'Submit 10 job applications',
    icon_emoji: '🚀',
    category: 'career',
    rarity: 'rare',
    points: 50,
    unlock_criteria: { type: 'applications', count: 10 },
  },
  {
    name: 'Relentless',
    description: 'Submit 25 job applications',
    icon_emoji: '⚡',
    category: 'career',
    rarity: 'epic',
    points: 100,
    unlock_criteria: { type: 'applications', count: 25 },
  },
  {
    name: 'Application Master',
    description: 'Submit 50 job applications',
    icon_emoji: '💎',
    category: 'career',
    rarity: 'legendary',
    points: 250,
    unlock_criteria: { type: 'applications', count: 50 },
  },
  {
    name: 'Rising Star',
    description: 'Advance to interview stage',
    icon_emoji: '⭐',
    category: 'career',
    rarity: 'rare',
    points: 50,
    unlock_criteria: { type: 'applications_advanced', count: 1 },
  },
  {
    name: 'Interview Pro',
    description: 'Advance to interview 5 times',
    icon_emoji: '🎪',
    category: 'career',
    rarity: 'epic',
    points: 150,
    unlock_criteria: { type: 'applications_advanced', count: 5 },
  },
  {
    name: 'The Offer',
    description: 'Receive your first job offer',
    icon_emoji: '📩',
    category: 'career',
    rarity: 'epic',
    points: 200,
    unlock_criteria: { type: 'applications_advanced', count: 1 },
  },
  {
    name: 'Dream Job',
    description: 'Accept and get hired!',
    icon_emoji: '💼',
    category: 'career',
    rarity: 'legendary',
    points: 500,
    unlock_criteria: { type: 'applications_hired', count: 1 },
  },
  {
    name: 'Interview Marathon',
    description: 'Complete 5 interviews',
    icon_emoji: '🏃',
    category: 'career',
    rarity: 'rare',
    points: 75,
    unlock_criteria: { type: 'interviews', count: 5 },
  },

  // Learning & Growth (15 achievements)
  {
    name: 'Scholar',
    description: 'Complete your first course',
    icon_emoji: '📚',
    category: 'learning',
    rarity: 'common',
    points: 20,
    unlock_criteria: { type: 'courses', count: 1 },
  },
  {
    name: 'Student',
    description: 'Complete 3 courses',
    icon_emoji: '🎓',
    category: 'learning',
    rarity: 'rare',
    points: 75,
    unlock_criteria: { type: 'courses', count: 3 },
  },
  {
    name: 'Graduate',
    description: 'Complete 5 courses',
    icon_emoji: '🏆',
    category: 'learning',
    rarity: 'epic',
    points: 150,
    unlock_criteria: { type: 'courses', count: 5 },
  },
  {
    name: 'Master Scholar',
    description: 'Complete 10 courses',
    icon_emoji: '📖',
    category: 'learning',
    rarity: 'legendary',
    points: 300,
    unlock_criteria: { type: 'courses', count: 10 },
  },
  {
    name: 'Quick Learner',
    description: 'Complete 10 course modules',
    icon_emoji: '⚡',
    category: 'learning',
    rarity: 'common',
    points: 15,
    unlock_criteria: { type: 'course_modules', count: 10 },
  },
  {
    name: 'Knowledge Seeker',
    description: 'Complete 25 course modules',
    icon_emoji: '🧠',
    category: 'learning',
    rarity: 'rare',
    points: 50,
    unlock_criteria: { type: 'course_modules', count: 25 },
  },
  {
    name: 'Perfectionist',
    description: 'Score 100% on an assessment',
    icon_emoji: '🌟',
    category: 'learning',
    rarity: 'epic',
    points: 100,
    unlock_criteria: { type: 'assessment_perfect', count: 1 },
  },
  {
    name: 'Flawless',
    description: 'Score 100% on 5 assessments',
    icon_emoji: '💯',
    category: 'learning',
    rarity: 'legendary',
    points: 250,
    unlock_criteria: { type: 'assessment_perfect', count: 5 },
  },
  {
    name: 'Assessment Taker',
    description: 'Complete 10 assessments',
    icon_emoji: '📝',
    category: 'learning',
    rarity: 'rare',
    points: 50,
    unlock_criteria: { type: 'assessments', count: 10 },
  },

  // Network & Community (12 achievements)
  {
    name: 'Connector',
    description: 'Refer your first person',
    icon_emoji: '🤝',
    category: 'social',
    rarity: 'common',
    points: 25,
    unlock_criteria: { type: 'referrals', count: 1 },
  },
  {
    name: 'Ambassador',
    description: 'Refer 5 people to The Club',
    icon_emoji: '🌟',
    category: 'social',
    rarity: 'rare',
    points: 100,
    unlock_criteria: { type: 'referrals', count: 5 },
  },
  {
    name: 'Talent Scout',
    description: 'Refer 10 people to The Club',
    icon_emoji: '🔍',
    category: 'social',
    rarity: 'epic',
    points: 250,
    unlock_criteria: { type: 'referrals', count: 10 },
  },
  {
    name: 'Golden Referral',
    description: 'One of your referrals got hired!',
    icon_emoji: '🏅',
    category: 'social',
    rarity: 'legendary',
    points: 500,
    unlock_criteria: { type: 'referrals_hired', count: 1 },
  },
  {
    name: 'Network Builder',
    description: 'Connect with 10 members',
    icon_emoji: '👥',
    category: 'social',
    rarity: 'common',
    points: 20,
    unlock_criteria: { type: 'connections', count: 10 },
  },
  {
    name: 'Super Connector',
    description: 'Connect with 50 members',
    icon_emoji: '🌐',
    category: 'social',
    rarity: 'epic',
    points: 150,
    unlock_criteria: { type: 'connections', count: 50 },
  },
  {
    name: 'Conversationalist',
    description: 'Send 50 messages',
    icon_emoji: '💬',
    category: 'social',
    rarity: 'common',
    points: 15,
    unlock_criteria: { type: 'messages_sent', count: 50 },
  },
  {
    name: 'Chatty',
    description: 'Send 200 messages',
    icon_emoji: '💭',
    category: 'social',
    rarity: 'rare',
    points: 50,
    unlock_criteria: { type: 'messages_sent', count: 200 },
  },
  {
    name: 'Voice of the Club',
    description: 'Create 10 posts',
    icon_emoji: '📣',
    category: 'social',
    rarity: 'rare',
    points: 75,
    unlock_criteria: { type: 'posts', count: 10 },
  },
  {
    name: 'Appreciated',
    description: 'Give 50 reactions to others',
    icon_emoji: '❤️',
    category: 'social',
    rarity: 'common',
    points: 20,
    unlock_criteria: { type: 'community_reactions', count: 50 },
  },
  {
    name: 'Mentor',
    description: 'Host 3 mentorship sessions',
    icon_emoji: '🎯',
    category: 'social',
    rarity: 'epic',
    points: 150,
    unlock_criteria: { type: 'mentor_sessions', count: 3 },
  },

  // Engagement & Loyalty (10 achievements)
  {
    name: 'Regular',
    description: 'Login 7 consecutive days',
    icon_emoji: '📅',
    category: 'engagement',
    rarity: 'common',
    points: 30,
    unlock_criteria: { type: 'streak', days: 7 },
  },
  {
    name: 'Dedicated',
    description: 'Login 30 consecutive days',
    icon_emoji: '🔥',
    category: 'engagement',
    rarity: 'rare',
    points: 100,
    unlock_criteria: { type: 'streak', days: 30 },
  },
  {
    name: 'Power User',
    description: 'Login 100 consecutive days',
    icon_emoji: '⚡',
    category: 'engagement',
    rarity: 'legendary',
    points: 500,
    unlock_criteria: { type: 'streak', days: 100 },
  },
  {
    name: 'Early Bird',
    description: 'Login before 7 AM (10 times)',
    icon_emoji: '🌅',
    category: 'engagement',
    rarity: 'rare',
    points: 50,
    unlock_criteria: { type: 'early_bird', count: 10 },
  },
  {
    name: 'Night Owl',
    description: 'Login after 11 PM (10 times)',
    icon_emoji: '🦉',
    category: 'engagement',
    rarity: 'rare',
    points: 50,
    unlock_criteria: { type: 'night_owl', count: 10 },
  },
  {
    name: 'Century',
    description: 'Complete 100 total logins',
    icon_emoji: '💯',
    category: 'engagement',
    rarity: 'epic',
    points: 150,
    unlock_criteria: { type: 'login_streak', days: 100 },
  },
  {
    name: 'Anniversary',
    description: '1 year as a Quantum Club member',
    icon_emoji: '🎂',
    category: 'milestone',
    rarity: 'legendary',
    points: 1000,
    unlock_criteria: { type: 'anniversary', days: 365 },
  },
  {
    name: 'Time Invested',
    description: 'Spend 10 hours on the platform',
    icon_emoji: '⏰',
    category: 'engagement',
    rarity: 'common',
    points: 25,
    unlock_criteria: { type: 'time_on_platform', minutes: 600 },
  },

  // Profile & Identity (8 achievements)
  {
    name: 'Getting Started',
    description: 'Complete profile to 50%',
    icon_emoji: '✨',
    category: 'profile',
    rarity: 'common',
    points: 15,
    unlock_criteria: { type: 'profile_completion', percentage: 50 },
  },
  {
    name: 'Polished',
    description: 'Complete profile to 80%',
    icon_emoji: '💫',
    category: 'profile',
    rarity: 'rare',
    points: 50,
    unlock_criteria: { type: 'profile_completion', percentage: 80 },
  },
  {
    name: 'Star Profile',
    description: 'Complete profile to 100%',
    icon_emoji: '🌟',
    category: 'profile',
    rarity: 'epic',
    points: 100,
    unlock_criteria: { type: 'profile_completion', percentage: 100 },
  },
  {
    name: 'Portfolio Pro',
    description: 'Upload 5 documents',
    icon_emoji: '💼',
    category: 'profile',
    rarity: 'common',
    points: 20,
    unlock_criteria: { type: 'documents_uploaded', count: 5 },
  },
  {
    name: 'Job Explorer',
    description: 'View 20 jobs',
    icon_emoji: '🔭',
    category: 'engagement',
    rarity: 'common',
    points: 10,
    unlock_criteria: { type: 'jobs_viewed', count: 20 },
  },
  {
    name: 'Wishlist Builder',
    description: 'Save 10 jobs',
    icon_emoji: '⭐',
    category: 'engagement',
    rarity: 'common',
    points: 15,
    unlock_criteria: { type: 'jobs_saved', count: 10 },
  },
  {
    name: 'Favorites Collector',
    description: 'Save 25 jobs',
    icon_emoji: '📌',
    category: 'engagement',
    rarity: 'rare',
    points: 40,
    unlock_criteria: { type: 'jobs_saved', count: 25 },
  },

  // XP Milestones (5 achievements)
  {
    name: 'Bronze Member',
    description: 'Earn 500 XP',
    icon_emoji: '🥉',
    category: 'milestone',
    rarity: 'common',
    points: 50,
    unlock_criteria: { type: 'xp_milestone', xp: 500 },
  },
  {
    name: 'Silver Member',
    description: 'Earn 2,500 XP',
    icon_emoji: '🥈',
    category: 'milestone',
    rarity: 'rare',
    points: 100,
    unlock_criteria: { type: 'xp_milestone', xp: 2500 },
  },
  {
    name: 'Gold Member',
    description: 'Earn 10,000 XP',
    icon_emoji: '🥇',
    category: 'milestone',
    rarity: 'epic',
    points: 250,
    unlock_criteria: { type: 'xp_milestone', xp: 10000 },
  },
  {
    name: 'Diamond Member',
    description: 'Earn 50,000 XP',
    icon_emoji: '💎',
    category: 'milestone',
    rarity: 'legendary',
    points: 500,
    unlock_criteria: { type: 'xp_milestone', xp: 50000 },
  },
  {
    name: 'Quantum Elite',
    description: 'Earn 100,000 XP',
    icon_emoji: '👑',
    category: 'milestone',
    rarity: 'quantum',
    points: 1000,
    unlock_criteria: { type: 'xp_milestone', xp: 100000 },
  },

  // Secret Achievements (7 achievements)
  {
    name: 'Night Shift',
    description: 'Apply to a job at 3 AM',
    icon_emoji: '🌙',
    category: 'special',
    rarity: 'rare',
    points: 50,
    is_secret: true,
    hint_text: 'The early bird gets the worm, but what about the night owl?',
    unlock_criteria: { type: 'applications', count: 1 },
  },
  {
    name: 'Lucky Seven',
    description: 'Complete 7 actions on the 7th of the month',
    icon_emoji: '🎲',
    category: 'special',
    rarity: 'epic',
    points: 100,
    is_secret: true,
    hint_text: 'Seven is a lucky number. Do seven things on the seventh day.',
    unlock_criteria: { type: 'xp_earned', count: 7 },
  },
  {
    name: 'Speed Demon',
    description: 'Complete onboarding in under 3 minutes',
    icon_emoji: '🏎️',
    category: 'special',
    rarity: 'epic',
    points: 100,
    is_secret: true,
    hint_text: 'Fast and efficient. Time is of the essence.',
    unlock_criteria: { type: 'signup', count: 1 },
  },
  {
    name: 'Unicorn',
    description: 'Be the first to unlock a new achievement',
    icon_emoji: '🦄',
    category: 'special',
    rarity: 'quantum',
    points: 500,
    is_secret: true,
    hint_text: 'Rare and legendary. Be first to discover something new.',
    unlock_criteria: { type: 'signup', count: 1 },
  },
  {
    name: 'Easter Egg',
    description: 'Find the hidden quantum symbol',
    icon_emoji: '🥚',
    category: 'special',
    rarity: 'legendary',
    points: 250,
    is_secret: true,
    hint_text: 'Hidden in plain sight. Look for the quantum symbol.',
    unlock_criteria: { type: 'signup', count: 1 },
  },
  {
    name: 'Weekend Warrior',
    description: 'Complete 10 actions on a weekend',
    icon_emoji: '⚔️',
    category: 'special',
    rarity: 'rare',
    points: 75,
    is_secret: true,
    hint_text: 'No rest for the ambitious. Work hard, even on weekends.',
    unlock_criteria: { type: 'xp_earned', count: 10 },
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

    console.log('[Seed Achievements] Starting seed...');

    const inserted = [];
    const errors = [];

    for (const achievement of achievements) {
      try {
        // Check if achievement already exists by name
        const { data: existing } = await supabase
          .from('quantum_achievements')
          .select('id, name')
          .eq('name', achievement.name)
          .single();

        if (existing) {
          console.log(`[Seed] Skipping existing: ${achievement.name}`);
          continue;
        }

        const { data, error } = await supabase
          .from('quantum_achievements')
          .insert([achievement])
          .select()
          .single();

        if (error) {
          errors.push({ achievement: achievement.name, error: error.message });
          console.error(`[Seed] Error inserting ${achievement.name}:`, error);
        } else {
          inserted.push(data);
          console.log(`[Seed] Inserted: ${achievement.name}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ achievement: achievement.name, error: errorMsg });
      }
    }

    console.log('[Seed Achievements] Complete:', {
      inserted: inserted.length,
      errors: errors.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        inserted: inserted.length,
        skipped: achievements.length - inserted.length - errors.length,
        errors: errors.length,
        details: { inserted, errors },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Seed Achievements] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
