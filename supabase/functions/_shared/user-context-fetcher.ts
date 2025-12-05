/**
 * Optimized User Context Fetcher
 * Phase 2: Batched database queries for club-ai-chat
 * Reduces ~20 sequential queries to ~5 batched queries
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

export interface UserContext {
  profile: any;
  roles: string[];
  company: any | null;
  applications: any[];
  tasks: any[];
  bookings: any[];
  achievements: any[];
  emails: any[];
  meetings: any[];
  socialStats: {
    posts: number;
    followers: number;
    connections: number;
  };
  urgentItems: {
    upcomingInterviews: any[];
    urgentTasks: any[];
    actionEmails: number;
  };
}

export interface AIMemoryContext {
  memories: any[];
  trendInsights: any[];
  userTrends: any[];
}

/**
 * Fetch essential user context in batched queries
 * Optimized for performance - only fetches what's needed
 */
export async function fetchUserContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{ userContext: UserContext; aiMemory: AIMemoryContext }> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // BATCH 1: Core user data (profile, roles, company)
  const [profileResult, rolesResult, companyResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    supabase
      .from('company_members')
      .select(`
        role,
        is_active,
        companies!inner (id, name, industry, headquarters_location)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
  ]);

  // BATCH 2: Activity data (applications, tasks, bookings)
  const [applicationsResult, tasksResult, bookingsResult] = await Promise.all([
    supabase
      .from('applications')
      .select('id, position, company_name, status, current_stage_index, stages, created_at, jobs(id, title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('unified_tasks')
      .select('id, title, status, priority, due_date')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .neq('status', 'completed')
      .order('priority', { ascending: false })
      .limit(10),
    supabase
      .from('bookings')
      .select('id, status, scheduled_start, scheduled_end, booking_links(title)')
      .eq('user_id', userId)
      .gte('scheduled_start', now.toISOString())
      .order('scheduled_start', { ascending: true })
      .limit(5),
  ]);

  // BATCH 3: Intelligence data (emails, meetings, achievements)
  const [emailsResult, meetingsResult, achievementsResult] = await Promise.all([
    supabase
      .from('emails')
      .select('id, subject, from_name, from_email, email_date, is_read, ai_priority_score, inbox_type')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('email_date', { ascending: false })
      .limit(20),
    supabase
      .from('meetings')
      .select('id, title, start_time, end_time, meeting_type, status')
      .gte('start_time', oneWeekAgo.toISOString())
      .lte('start_time', twoWeeksAhead.toISOString())
      .order('start_time', { ascending: true })
      .limit(15),
    supabase
      .from('user_quantum_achievements')
      .select('unlocked_at, quantum_achievements(name, category, rarity)')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })
      .limit(10),
  ]);

  // BATCH 4: Social stats (count queries)
  const [followersResult, connectionsResult, postsCountResult] = await Promise.all([
    supabase
      .from('social_connections')
      .select('*', { count: 'exact', head: true })
      .eq('connected_user_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('social_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'accepted'),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  // BATCH 5: AI Memory & Trends
  const [aiMemoryResult, trendInsightsResult, userTrendsResult] = await Promise.all([
    supabase
      .from('ai_memory')
      .select('memory_type, content, relevance_score')
      .eq('user_id', userId)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('relevance_score', { ascending: false })
      .limit(15),
    supabase
      .from('career_trend_insights')
      .select('title, description, impact_level')
      .or('valid_until.is.null,valid_until.gt.now()')
      .order('impact_level', { ascending: false })
      .limit(5),
    supabase
      .from('user_trend_subscriptions')
      .select('career_trend_insights(title)')
      .eq('user_id', userId)
      .eq('is_relevant', true)
      .limit(5),
  ]);

  // Process urgent items
  const bookings = bookingsResult.data || [];
  const upcomingInterviews = bookings
    .filter(b => {
      const start = new Date(b.scheduled_start);
      const daysUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil >= 0 && daysUntil <= 7;
    })
    .map(b => {
      const linkData = Array.isArray(b.booking_links) ? b.booking_links[0] : b.booking_links;
      return {
        title: linkData?.title || 'Interview',
        date: b.scheduled_start,
        daysUntil: Math.ceil((new Date(b.scheduled_start).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      };
    });

  const tasks = tasksResult.data || [];
  const urgentTasks = tasks
    .filter(t => t.priority === 'high' || t.priority === 'urgent')
    .map(t => ({ title: t.title, priority: t.priority, dueDate: t.due_date }));

  const emails = emailsResult.data || [];
  const actionEmailCount = emails.filter(e => !e.is_read && e.inbox_type === 'action').length;

  const companyData = companyResult.data?.companies;
  const company = Array.isArray(companyData) ? companyData[0] : companyData;

  return {
    userContext: {
      profile: profileResult.data,
      roles: (rolesResult.data || []).map(r => r.role),
      company: company || null,
      applications: applicationsResult.data || [],
      tasks: tasks,
      bookings: bookings,
      achievements: achievementsResult.data || [],
      emails: emails,
      meetings: meetingsResult.data || [],
      socialStats: {
        posts: postsCountResult.count || 0,
        followers: followersResult.count || 0,
        connections: connectionsResult.count || 0,
      },
      urgentItems: {
        upcomingInterviews,
        urgentTasks,
        actionEmails: actionEmailCount,
      },
    },
    aiMemory: {
      memories: aiMemoryResult.data || [],
      trendInsights: trendInsightsResult.data || [],
      userTrends: userTrendsResult.data || [],
    },
  };
}

/**
 * Build a compact context string for AI system prompt
 */
export function buildCompactContextString(context: UserContext, memory: AIMemoryContext): string {
  const { profile, roles, company, applications, urgentItems, socialStats, emails, meetings } = context;

  const parts: string[] = [];

  // User basics
  parts.push(`USER: ${profile?.full_name || 'Unknown'} | Roles: ${roles.join(', ') || 'None'}`);
  
  if (company) {
    parts.push(`COMPANY: ${company.name} (${company.industry || 'N/A'})`);
  }

  // Urgent items (most important)
  if (urgentItems.upcomingInterviews.length > 0) {
    parts.push(`⚠️ INTERVIEWS: ${urgentItems.upcomingInterviews.map(i => `${i.title} in ${i.daysUntil}d`).join(', ')}`);
  }

  if (urgentItems.urgentTasks.length > 0) {
    parts.push(`⚠️ TASKS: ${urgentItems.urgentTasks.map(t => t.title).join(', ')}`);
  }

  if (urgentItems.actionEmails > 0) {
    parts.push(`⚠️ EMAILS: ${urgentItems.actionEmails} require action`);
  }

  // Applications summary
  const activeApps = applications.filter(a => a.status === 'active');
  if (activeApps.length > 0) {
    parts.push(`APPLICATIONS (${activeApps.length} active): ${activeApps.slice(0, 3).map(a => 
      `${a.company_name} - Stage ${a.current_stage_index + 1}`
    ).join('; ')}`);
  }

  // Recent emails (high priority only)
  const highPriorityEmails = emails.filter(e => e.ai_priority_score && e.ai_priority_score >= 70);
  if (highPriorityEmails.length > 0) {
    parts.push(`HIGH-PRIORITY EMAILS (${highPriorityEmails.length}): ${highPriorityEmails.slice(0, 3).map(e => 
      `${e.from_name || e.from_email}: ${e.subject}`
    ).join('; ')}`);
  }

  // Upcoming meetings
  const upcomingMeetings = meetings.filter(m => new Date(m.start_time) > new Date());
  if (upcomingMeetings.length > 0) {
    parts.push(`MEETINGS: ${upcomingMeetings.slice(0, 3).map(m => 
      `${m.title} at ${new Date(m.start_time).toLocaleString()}`
    ).join('; ')}`);
  }

  // Social stats
  parts.push(`SOCIAL: ${socialStats.posts} posts, ${socialStats.followers} followers, ${socialStats.connections} connections`);

  // AI Memory
  if (memory.memories.length > 0) {
    parts.push(`AI MEMORY: ${memory.memories.slice(0, 5).map(m => m.content.substring(0, 50)).join('; ')}`);
  }

  return parts.join('\n');
}
