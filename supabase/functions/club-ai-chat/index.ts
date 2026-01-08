import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, conversationId, images, documents, selectedModel: clientSelectedModel } = await req.json() as {
      messages: any[];
      userId?: string;
      conversationId?: string;
      images?: string[];
      documents?: Array<{ name: string; type: string; content: string }>;
      selectedModel?: string;
    };
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch conversation history if conversationId is provided
    let conversationHistory = "";
    if (conversationId) {
      const { data: conversation } = await supabase
        .from("ai_conversations")
        .select("messages, context")
        .eq("id", conversationId)
        .single();
      
      if (conversation && Array.isArray(conversation.messages) && conversation.messages.length > 0) {
        conversationHistory = `
=== CONVERSATION HISTORY ===
This user has had previous interactions with you. Here's the conversation history:

${conversation.messages.map((msg: any, idx: number) => 
  `[Message ${idx + 1}] ${msg.role.toUpperCase()}: ${msg.content}`
).join("\n\n")}

Based on this history, provide contextually aware responses that reference previous discussions when relevant.
===
`;
      }
    }

    // Fetch comprehensive user data - EVERYTHING in the platform
    let userContext = "";
    let careerBrainContext = "";
    let upcomingInterviews: any[] = [];
    let activeApplicationsWithStages: any[] = [];
    let urgentTasks: any[] = [];
    
    if (userId) {
      // === CAREER BRAIN: AI MEMORY ===
      const { data: aiMemory } = await supabase
        .from("ai_memory")
        .select("*")
        .eq("user_id", userId)
        .or("expires_at.is.null,expires_at.gt.now()")
        .order("relevance_score", { ascending: false })
        .limit(20);

      // === CAREER BRAIN: TREND INSIGHTS ===
      const { data: trendInsights } = await supabase
        .from("career_trend_insights")
        .select("*")
        .or("valid_until.is.null,valid_until.gt.now()")
        .order("impact_level", { ascending: false })
        .limit(10);

      // Get user-specific trend subscriptions
      const { data: userTrends } = await supabase
        .from("user_trend_subscriptions")
        .select(`
          *,
          career_trend_insights(*)
        `)
        .eq("user_id", userId)
        .eq("is_relevant", true);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // Get user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      // Get company associations
      const { data: companyMember } = await supabase
        .from("company_members")
        .select(`
          role,
          is_active,
          companies!inner (
            id,
            name,
            slug,
            description,
            industry,
            company_size,
            website_url,
            headquarters_location,
            mission,
            vision,
            values,
            culture_highlights,
            tech_stack,
            benefits
          )
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      const companyData = Array.isArray(companyMember?.companies) 
        ? companyMember?.companies[0] 
        : companyMember?.companies;

      // Get applications data with full details
      const { data: applications } = await supabase
        .from("applications")
        .select(`
          id,
          position,
          company_name,
          status,
          current_stage_index,
          created_at,
          updated_at,
          stages,
          jobs(id, title, description, location, employment_type)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15);

      // Get tasks
      const { data: tasks } = await supabase
        .from("unified_tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      // Get objectives
      const { data: objectives } = await supabase
        .from("club_objectives")
        .select("*")
        .or(`created_by.eq.${userId},owners.cs.{${userId}}`)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select(`
          id,
          status,
          scheduled_start,
          scheduled_end,
          booking_links(title, description)
        `)
        .eq("user_id", userId)
        .gte("scheduled_start", new Date().toISOString())
        .order("scheduled_start", { ascending: true })
        .limit(5);

      // Get jobs user might be interested in
      const { data: availableJobs } = await supabase
        .from("jobs")
        .select("id, title, location, employment_type, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get profile strength
      const { data: profileStrength } = await supabase
        .from("profile_strength_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // === SOCIAL DATA ===
      
      // Get user's posts with engagement counts
      const { data: userPosts } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          media_urls,
          created_at,
          ai_summary,
          poll_question,
          post_likes(count),
          post_comments(count),
          post_shares(count)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      // Get user's stories
      const { data: userStories } = await supabase
        .from("stories")
        .select("id, story_type, created_at, views_count")
        .eq("user_id", userId)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      // Get user's social connections
      const { data: connections } = await supabase
        .from("social_connections")
        .select("status, connected_user_id")
        .eq("user_id", userId)
        .eq("status", "accepted");

      // Get user's followers count
      const { count: followersCount } = await supabase
        .from("social_connections")
        .select("*", { count: "exact", head: true })
        .eq("connected_user_id", userId)
        .eq("status", "accepted");

      // Get user's recent comments
      const { data: recentComments } = await supabase
        .from("comments")
        .select("content, created_at, post_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get user's achievements
      const { data: achievements } = await supabase
        .from("user_quantum_achievements")
        .select(`
          unlocked_at,
          progress,
          quantum_achievements(name, description, category, rarity)
        `)
        .eq("user_id", userId)
        .order("unlocked_at", { ascending: false })
        .limit(15);

      // Get user's company achievements
      const { data: companyAchievements } = await supabase
        .from("company_achievement_earners")
        .select(`
          earned_at,
          company_achievements(name, description)
        `)
        .eq("user_id", userId)
        .order("earned_at", { ascending: false })
        .limit(10);

      // Get user's conversations
      const { data: conversations } = await supabase
        .from("conversation_participants")
        .select(`
          conversations(id, title, created_at, last_message_at)
        `)
        .eq("user_id", userId)
        .limit(10);

      // Get user's referrals
      const { data: referrals } = await supabase
        .from("referral_network")
        .select("referred_by_type, referral_level, created_at")
        .eq("user_id", userId)
        .maybeSingle();

      // Get user's sent referrals
      const { data: sentReferrals } = await supabase
        .from("referral_network")
        .select("*")
        .eq("referred_by", userId);

      // Get user engagement stats
      const { data: engagementStats } = await supabase
        .from("user_engagement")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      // Get companies user follows
      const { data: followedCompanies } = await supabase
        .from("company_followers")
        .select(`
          companies(name, slug, industry)
        `)
        .eq("follower_id", userId);

      // Get user's saved jobs
      const { data: savedJobs } = await supabase
        .from("saved_jobs")
        .select(`
          saved_at,
          jobs(id, title, location, employment_type)
        `)
        .eq("user_id", userId)
        .order("saved_at", { ascending: false })
        .limit(10);

      // Get user's meeting history
      const { data: meetingHistory } = await supabase
        .from("meeting_recordings")
        .select("title, meeting_date, duration_minutes, analysis_summary")
        .eq("user_id", userId)
        .order("meeting_date", { ascending: false })
        .limit(5);

      // Get pending feedback tasks
      const { data: feedbackTasks } = await supabase
        .from("closed_pipelines")
        .select("*")
        .eq("user_id", userId)
        .eq("feedback_completed", false);

      // Get AI conversations
      const { data: aiConversations } = await supabase
        .from("ai_conversations")
        .select("conversation_type, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(5);

      // === WHATSAPP COMMUNICATIONS ===
      const { data: recentWhatsApp } = await supabase
        .from('whatsapp_messages')
        .select(`
          content, direction, sentiment_score, intent_classification, created_at,
          conversation:whatsapp_conversations(contact_name, contact_phone, candidate_id)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      // === SMS COMMUNICATIONS ===
      const { data: recentSMS } = await supabase
        .from('sms_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      // === COMPANY INTERACTIONS (Phone, LinkedIn, etc.) ===
      const { data: companyInteractions } = await supabase
        .from('company_interactions')
        .select(`
          interaction_type, direction, summary, sentiment_score,
          interaction_date, duration_minutes, next_action, companies(name)
        `)
        .order('interaction_date', { ascending: false })
        .limit(30);

      // === RELATIONSHIP HEALTH SCORES ===
      const { data: relationshipAlerts } = await supabase
        .from('communication_relationship_scores')
        .select('*')
        .in('risk_level', ['high', 'critical'])
        .order('days_since_contact', { ascending: false })
        .limit(10);

      // === UNIFIED COMMUNICATION TIMELINE ===
      const { data: unifiedTimeline } = await supabase
        .from('unified_communications')
        .select('*')
        .order('original_timestamp', { ascending: false })
        .limit(100);

      // === EXTERNAL CONTEXT IMPORTS ===
      const { data: externalImports } = await supabase
        .from('external_context_imports')
        .select('*')
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      // === EMAIL INBOX DATA ===
      const { data: recentEmails } = await supabase
        .from("emails")
        .select(`
          id,
          subject,
          from_email,
          from_name,
          snippet,
          email_date,
          is_read,
          is_starred,
          ai_category,
          ai_priority_score,
          ai_priority_reason,
          inbox_type,
          ai_summary,
          ai_action_items,
          has_attachments,
          status
        `)
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("email_date", { ascending: false })
        .limit(50);

      // === CALENDAR & MEETINGS DATA ===
      const nowForCalendar = new Date();
      const oneWeekAgo = new Date(nowForCalendar.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAhead = new Date(nowForCalendar.getTime() + 14 * 24 * 60 * 60 * 1000);

      const { data: upcomingMeetings } = await supabase
        .from("meetings")
        .select(`
          id,
          title,
          description,
          start_time,
          end_time,
          location,
          meeting_type,
          status,
          meeting_url,
          attendees,
          agenda,
          notes
        `)
        .gte("start_time", nowForCalendar.toISOString())
        .lte("start_time", twoWeeksAhead.toISOString())
        .order("start_time", { ascending: true })
        .limit(20);

      const { data: recentMeetings } = await supabase
        .from("meetings")
        .select(`
          id,
          title,
          start_time,
          end_time,
          status,
          ai_summary,
          action_items
        `)
        .gte("start_time", oneWeekAgo.toISOString())
        .lt("start_time", nowForCalendar.toISOString())
        .order("start_time", { ascending: false })
        .limit(10);

      // === BUILD CAREER CONTEXT SNAPSHOT ===
      const now = new Date();
      upcomingInterviews = bookings
        ?.filter(b => {
          const start = new Date(b.scheduled_start);
          const daysUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return daysUntil >= 0 && daysUntil <= 7; // Next 7 days
        })
        .map(b => {
          const linkData = Array.isArray(b.booking_links) ? b.booking_links[0] : b.booking_links;
          return {
            title: linkData?.title || "Interview",
            date: b.scheduled_start,
            daysUntil: Math.ceil((new Date(b.scheduled_start).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          };
        }) || [];

      activeApplicationsWithStages = applications
        ?.filter(app => app.status === "active")
        .map(app => {
          const jobData = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
          const currentStage = app.stages?.[app.current_stage_index];
          return {
            position: jobData?.title || app.position,
            company: app.company_name,
            stage: currentStage?.name || "Unknown",
            stageIndex: app.current_stage_index,
            totalStages: app.stages?.length || 0
          };
        }) || [];

      urgentTasks = tasks
        ?.filter(t => t.status !== "completed" && (t.priority === "high" || t.priority === "urgent"))
        .map(t => ({
          title: t.title,
          priority: t.priority,
          dueDate: t.due_date
        })) || [];

      // Build Career Brain Context (proactive insights)
      careerBrainContext = `
=== 🧠 CAREER BRAIN: DEEP CONTEXTUAL AWARENESS ===

🎯 AI MEMORY & LEARNED PREFERENCES:
${aiMemory && aiMemory.length > 0 ?
  aiMemory.map(mem => `- [${mem.memory_type.toUpperCase()}] ${mem.content} (Relevance: ${mem.relevance_score})`).join("\n")
  : "No learned preferences yet - this is a fresh start"}

⚡ URGENT ITEMS REQUIRING ATTENTION:
${upcomingInterviews.length > 0 ? `
📅 UPCOMING INTERVIEWS (Next 7 days):
${upcomingInterviews.map(int => `  • ${int.title} in ${int.daysUntil} day${int.daysUntil !== 1 ? 's' : ''} (${new Date(int.date).toLocaleDateString()})`).join("\n")}
  ⚠️ PROACTIVE SUGGESTION: Offer interview prep, company research, or question practice.
` : ""}
${urgentTasks.length > 0 ? `
🚨 HIGH-PRIORITY TASKS:
${urgentTasks.map(t => `  • ${t.title} (${t.priority})`).join("\n")}
  ⚠️ PROACTIVE SUGGESTION: Ask if they need help prioritizing or breaking down tasks.
` : ""}
${activeApplicationsWithStages.length > 0 ? `
📊 ACTIVE APPLICATION PIPELINES:
${activeApplicationsWithStages.map(app => `  • ${app.position} at ${app.company} - Stage ${app.stageIndex + 1}/${app.totalStages}: ${app.stage}`).join("\n")}
  ⚠️ PROACTIVE SUGGESTION: Flag any stalled applications or suggest next steps.
` : ""}
${recentEmails && recentEmails.filter(e => !e.is_read && e.inbox_type === 'action').length > 0 ? `
📧 URGENT EMAIL ACTION REQUIRED:
  • ${recentEmails.filter(e => !e.is_read && e.inbox_type === 'action').length} unread emails require immediate action
  ⚠️ PROACTIVE SUGGESTION: Ask if they need help prioritizing or drafting responses
` : ""}
${upcomingMeetings && upcomingMeetings.filter(m => {
  const meetingTime = new Date(m.start_time);
  const hoursUntil = (meetingTime.getTime() - nowForCalendar.getTime()) / (1000 * 60 * 60);
  return hoursUntil > 0 && hoursUntil < 24;
}).length > 0 ? `
📅 MEETINGS IN NEXT 24 HOURS:
${upcomingMeetings.filter(m => {
  const meetingTime = new Date(m.start_time);
  const hoursUntil = (meetingTime.getTime() - nowForCalendar.getTime()) / (1000 * 60 * 60);
  return hoursUntil > 0 && hoursUntil < 24;
}).map(m => `  • ${m.title} at ${new Date(m.start_time).toLocaleTimeString()}`).join("\n")}
  ⚠️ PROACTIVE SUGGESTION: Offer meeting prep, agenda review, or research on attendees
` : ""}

🌐 MARKET & TREND INSIGHTS:
${trendInsights && trendInsights.length > 0 ?
  trendInsights.slice(0, 5).map(trend => `- [${trend.impact_level?.toUpperCase() || 'INFO'}] ${trend.title}: ${trend.description?.substring(0, 120) || ''}...`).join("\n")
  : "No current trend data available"}

${userTrends && userTrends.length > 0 ? `
📌 YOUR TRACKED TRENDS:
${userTrends.map(ut => {
  const trend = Array.isArray(ut.career_trend_insights) ? ut.career_trend_insights[0] : ut.career_trend_insights;
  return `- ${trend?.title || "Trend"} ${ut.user_notes ? `(Note: ${ut.user_notes})` : ''}`;
}).join("\n")}
` : ""}

=== END CAREER BRAIN ===

⚠️ PROACTIVE BEHAVIOR RULES:
1. When you see upcoming interviews, PROACTIVELY offer prep help even if not asked
2. When you see urgent tasks, FLAG them and ask if they need prioritization help
3. When you see stalled applications (no recent activity), SUGGEST follow-up actions
4. When you see relevant trends, CONNECT them to user's goals and applications
5. Always consider TIME SENSITIVITY - deadlines matter more than general advice
6. Use REAL DATA from above - reference specific interview dates, task names, companies
`;

      // Build context string
      userContext = `

=== USER PROFILE DATA ===
Name: ${profile?.full_name || "Not set"}
Email: ${profile?.email || "Not set"}
Current Title: ${profile?.current_title || "Not set"}
Bio: ${profile?.bio || "Not set"}
Location: ${profile?.location || "Not set"}
Phone: ${profile?.phone_verified ? "Verified" : "Not verified"}
Email Verified: ${profile?.email_verified ? "Yes" : "No"}
Profile Completion: ${profileStrength?.completion_percentage || 0}%

=== USER ROLES ===
${roles?.map(r => r.role).join(", ") || "No roles assigned"}

=== COMPANY ASSOCIATION ===
${companyData ? `
Company: ${companyData.name}
Role at Company: ${companyMember?.role || "Unknown"}
Industry: ${companyData.industry || "Not specified"}
Company Size: ${companyData.company_size || "Not specified"}
Location: ${companyData.headquarters_location || "Not specified"}
Mission: ${companyData.mission || "Not specified"}
Website: ${companyData.website_url || "Not specified"}
` : "User is not associated with any company"}

=== RECENT APPLICATIONS ===
${applications && applications.length > 0 ? 
  applications.map(app => {
    const stageName = app.stages?.[app.current_stage_index]?.name || "Unknown";
    const jobData = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
    return `- ${jobData?.title || app.position} at ${app.company_name}
  Status: ${app.status} | Stage: ${stageName} (${app.current_stage_index + 1}/${app.stages?.length || 0})
  Applied: ${new Date(app.created_at).toLocaleDateString()}`;
  }).join("\n")
  : "No recent applications"}

=== TASKS & OBJECTIVES ===
Tasks (${tasks?.length || 0} active):
${tasks && tasks.length > 0 ?
  tasks.map(t => `- ${t.title} (${t.status}) - Priority: ${t.priority}`).join("\n")
  : "No active tasks"}

Objectives (${objectives?.length || 0}):
${objectives && objectives.length > 0 ?
  objectives.map(o => `- ${o.title} (${o.status}) - ${o.completion_percentage}% complete`).join("\n")
  : "No active objectives"}

=== UPCOMING BOOKINGS ===
${bookings && bookings.length > 0 ?
  bookings.map(b => {
    const linkData = Array.isArray(b.booking_links) ? b.booking_links[0] : b.booking_links;
    return `- ${linkData?.title || "Meeting"} on ${new Date(b.scheduled_start).toLocaleString()}`;
  }).join("\n")
  : "No upcoming bookings"}

=== AVAILABLE OPPORTUNITIES ===
${availableJobs && availableJobs.length > 0 ?
  availableJobs.map(j => `- ${j.title} (${j.location || "Remote"})`).join("\n")
  : "No new opportunities available"}

=== SOCIAL & CONTENT ===
Posts Created (${userPosts?.length || 0} recent):
${userPosts && userPosts.length > 0 ?
  userPosts.map(p => {
    const likesCount = Array.isArray(p.post_likes) ? p.post_likes[0]?.count || 0 : 0;
    const commentsCount = Array.isArray(p.post_comments) ? p.post_comments[0]?.count || 0 : 0;
    const sharesCount = Array.isArray(p.post_shares) ? p.post_shares[0]?.count || 0 : 0;
    const hasMedia = p.media_urls && Array.isArray(p.media_urls) && p.media_urls.length > 0;
    const mediaInfo = hasMedia ? ` [${p.media_urls.length} media]` : '';
    return `- Posted ${new Date(p.created_at).toLocaleDateString()}: ${p.content?.substring(0, 100)}...${mediaInfo} | ${likesCount} likes, ${commentsCount} comments, ${sharesCount} shares`;
  }).join("\n")
  : "No posts yet"}

Active Stories (${userStories?.length || 0}):
${userStories && userStories.length > 0 ?
  userStories.map(s => `- ${s.story_type} story (${s.views_count} views)`).join("\n")
  : "No active stories"}

Connections: ${connections?.length || 0} connections | ${followersCount || 0} followers

Recent Comments (${recentComments?.length || 0}):
${recentComments && recentComments.length > 0 ?
  recentComments.map(c => `- ${c.content.substring(0, 80)}...`).join("\n")
  : "No recent comments"}

=== ACHIEVEMENTS & PROGRESS ===
Unlocked Achievements (${achievements?.length || 0}):
${achievements && achievements.length > 0 ?
  achievements.map(a => {
    const ach = Array.isArray(a.quantum_achievements) ? a.quantum_achievements[0] : a.quantum_achievements;
    return `- ${ach?.name} (${ach?.rarity}) - ${ach?.category}`;
  }).join("\n")
  : "No achievements unlocked yet"}

Company Achievements (${companyAchievements?.length || 0}):
${companyAchievements && companyAchievements.length > 0 ?
  companyAchievements.map(ca => {
    const ach = Array.isArray(ca.company_achievements) ? ca.company_achievements[0] : ca.company_achievements;
    return `- ${ach?.name}`;
  }).join("\n")
  : "No company achievements"}

Engagement Stats:
${engagementStats ? `
- Current Streak: ${engagementStats.current_streak} days
- Longest Streak: ${engagementStats.longest_streak} days
- Total Posts: ${engagementStats.total_posts}
- Experience Points: ${engagementStats.experience_points}
- Level: ${engagementStats.level || 1}
` : "No engagement data yet"}

=== NETWORK & ACTIVITY ===
Following ${followedCompanies?.length || 0} companies:
${followedCompanies && followedCompanies.length > 0 ?
  followedCompanies.slice(0, 5).map(fc => {
    const company = Array.isArray(fc.companies) ? fc.companies[0] : fc.companies;
    return `- ${company?.name} (${company?.industry || "Industry not set"})`;
  }).join("\n")
  : "Not following any companies"}

Saved Jobs (${savedJobs?.length || 0}):
${savedJobs && savedJobs.length > 0 ?
  savedJobs.map(sj => {
    const job = Array.isArray(sj.jobs) ? sj.jobs[0] : sj.jobs;
    return `- ${job?.title} (${job?.location || "Remote"})`;
  }).join("\n")
  : "No saved jobs"}

=== MESSAGES & COMMUNICATION ===
Active Conversations: ${conversations?.length || 0}
${conversations && conversations.length > 0 ?
  conversations.slice(0, 3).map(c => {
    const conv = Array.isArray(c.conversations) ? c.conversations[0] : c.conversations;
    return `- ${conv?.title || "Untitled"} (Last: ${conv?.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : "Never"})`;
  }).join("\n")
  : "No active conversations"}

=== REFERRALS ===
${referrals ? `
You were referred by: ${referrals.referred_by_type} (Level ${referrals.referral_level})
Joined: ${new Date(referrals.created_at).toLocaleDateString()}
` : "Not referred by anyone"}

Referrals Made: ${sentReferrals?.length || 0} people referred

=== MEETING INSIGHTS ===
${meetingHistory && meetingHistory.length > 0 ?
  meetingHistory.map(m => `- ${m.title} (${m.duration_minutes}min) - ${new Date(m.meeting_date).toLocaleDateString()}
  Summary: ${m.analysis_summary?.substring(0, 100) || "No summary"}...`).join("\n")
  : "No meeting history"}

=== WHATSAPP COMMUNICATIONS ===
Recent WhatsApp Messages (${recentWhatsApp?.length || 0}):
${recentWhatsApp && recentWhatsApp.length > 0 ?
  recentWhatsApp.slice(0, 10).map(m => {
    const conv = Array.isArray(m.conversation) ? m.conversation[0] : m.conversation;
    return `- ${m.direction}: "${m.content?.substring(0, 100)}..." (Contact: ${conv?.contact_name || 'Unknown'}, Sentiment: ${m.sentiment_score || 'N/A'})`;
  }).join("\n")
  : "No WhatsApp messages"}

=== SMS COMMUNICATIONS ===
Recent SMS (${recentSMS?.length || 0}):
${recentSMS && recentSMS.length > 0 ?
  recentSMS.slice(0, 10).map(s => `- ${s.direction}: "${s.content?.substring(0, 80)}..." (${new Date(s.created_at).toLocaleDateString()})`).join("\n")
  : "No SMS messages"}

=== COMPANY INTERACTIONS ===
Recent Phone/LinkedIn/Meetings:
${companyInteractions && companyInteractions.length > 0 ?
  companyInteractions.slice(0, 10).map(i => {
    const company = Array.isArray(i.companies) ? i.companies[0] : i.companies;
    return `- ${i.interaction_type} with ${company?.name || 'Unknown'}: ${i.summary?.substring(0, 100) || 'No summary'}... (Sentiment: ${i.sentiment_score || 'N/A'})`;
  }).join("\n")
  : "No company interactions"}

=== RELATIONSHIP HEALTH ALERTS ===
At-Risk Relationships (${relationshipAlerts?.length || 0}):
${relationshipAlerts && relationshipAlerts.length > 0 ?
  relationshipAlerts.map(r => `- ${r.entity_type} (${r.entity_id?.substring(0, 8)}...): Risk Level ${r.risk_level?.toUpperCase()} - ${r.days_since_contact} days since contact. Avg sentiment: ${r.avg_sentiment_score || 'N/A'}`).join("\n")
  : "No at-risk relationships - all healthy!"}

=== UNIFIED COMMUNICATION TIMELINE ===
Recent Cross-Channel Communications (${unifiedTimeline?.length || 0}):
${unifiedTimeline && unifiedTimeline.length > 0 ?
  unifiedTimeline.slice(0, 15).map(c => `- [${c.channel?.toUpperCase()}] ${c.direction}: ${c.content_preview?.substring(0, 80) || 'No preview'}... (${new Date(c.original_timestamp).toLocaleDateString()})`).join("\n")
  : "No unified communications"}

=== EXTERNAL CONTEXT IMPORTS ===
Recently Imported External Data (${externalImports?.length || 0}):
${externalImports && externalImports.length > 0 ?
  externalImports.map(e => `- ${e.content_type}: "${e.title}" (Linked to ${e.entity_type})
  ${e.ai_summary ? `Summary: ${e.ai_summary.substring(0, 150)}...` : ''}
  ${e.action_items && Array.isArray(e.action_items) && e.action_items.length > 0 ? `Action Items: ${e.action_items.length} items` : ''}
  Urgency: ${e.urgency_level || 'normal'}`).join("\n")
  : "No external imports"}

=== EMAIL INTELLIGENCE ===
Inbox Overview:
- Total Recent: ${recentEmails?.length || 0} emails
- Unread: ${recentEmails?.filter(e => !e.is_read).length || 0} emails
- Important: ${recentEmails?.filter(e => e.inbox_type === 'important').length || 0} emails
- Action Required: ${recentEmails?.filter(e => e.inbox_type === 'action').length || 0} emails
- High Priority (70+): ${recentEmails?.filter(e => e.ai_priority_score && e.ai_priority_score >= 70).length || 0} emails

Recent High-Priority Emails (last 10):
${recentEmails?.filter(e => e.ai_priority_score && e.ai_priority_score >= 70).slice(0, 10).map(email => `
- From: ${email.from_name || email.from_email}
  Subject: ${email.subject}
  Date: ${new Date(email.email_date).toLocaleDateString()}
  Priority: ${email.ai_priority_score}/100${email.ai_priority_reason ? ` (${email.ai_priority_reason})` : ''}
  ${email.ai_summary ? `Summary: ${email.ai_summary.substring(0, 150)}...` : ''}
  ${email.ai_action_items && Array.isArray(email.ai_action_items) && email.ai_action_items.length > 0 ? `Action Items: ${email.ai_action_items.join(', ')}` : ''}
  Status: ${email.is_read ? 'Read' : 'UNREAD'}
`).join('\n') || 'No high-priority emails'}

Action Required Emails (Unread):
${recentEmails?.filter(e => !e.is_read && e.inbox_type === 'action').slice(0, 5).map(email => `
- From: ${email.from_name || email.from_email}
  Subject: ${email.subject}
  Date: ${new Date(email.email_date).toLocaleDateString()}
  ${email.snippet ? `Preview: ${email.snippet.substring(0, 100)}...` : ''}
`).join('\n') || 'All action emails have been read'}

=== CALENDAR & MEETINGS ===
Upcoming Meetings (next 2 weeks):
${upcomingMeetings && upcomingMeetings.length > 0 ? upcomingMeetings.map(m => `
- ${m.title}
  Date: ${new Date(m.start_time).toLocaleString()}
  Duration: ${Math.round((new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / (1000 * 60))} minutes
  ${m.description ? `Description: ${m.description.substring(0, 100)}...` : ''}
  Type: ${m.meeting_type} | Location: ${m.location || m.meeting_url || 'TBD'}
  ${m.attendees && Array.isArray(m.attendees) && m.attendees.length > 0 ? `Attendees: ${m.attendees.length} people` : ''}
  ${m.agenda ? `Agenda: ${m.agenda.substring(0, 100)}...` : 'No agenda set'}
`).join('\n') : 'No upcoming meetings scheduled'}

Recent Meetings (last 7 days):
${recentMeetings && recentMeetings.length > 0 ? recentMeetings.map(m => `
- ${m.title} (${new Date(m.start_time).toLocaleDateString()})
  ${m.ai_summary ? `Summary: ${m.ai_summary.substring(0, 150)}...` : ''}
  ${m.action_items && Array.isArray(m.action_items) && m.action_items.length > 0 ? `Action Items: ${m.action_items.length} items` : ''}
`).join('\n') : 'No recent meetings'}

=== PENDING ACTIONS ===
Pending Feedback: ${feedbackTasks?.length || 0} feedback requests
Recent AI Sessions: ${aiConversations?.length || 0} conversations

===

You have complete access to ALL user data above. When users ask about their activity, posts, achievements, tasks, connections, or ANY aspect of their experience in The Quantum Club, you KNOW the answer. Reference specific data points naturally and confidently.

Use this context to provide personalized, relevant guidance. Reference specific details when appropriate.

${careerBrainContext}`;
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Detect interaction mode from last user message
    let mode = "normal";
    let cleanedMessages = [...messages];
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    
    if (lastUserMessage && typeof lastUserMessage.content === "string") {
      if (lastUserMessage.content.startsWith("[Search:")) {
        mode = "search";
        // Remove the prefix for cleaner processing
        cleanedMessages = messages.map((m: any) => {
          if (m === lastUserMessage) {
            return {
              ...m,
              content: m.content.replace(/^\[Search:\s*/, "").replace(/\]$/, "")
            };
          }
          return m;
        });
      } else if (lastUserMessage.content.startsWith("[Think:")) {
        mode = "think";
        cleanedMessages = messages.map((m: any) => {
          if (m === lastUserMessage) {
            return {
              ...m,
              content: m.content.replace(/^\[Think:\s*/, "").replace(/\]$/, "")
            };
          }
          return m;
        });
      } else if (lastUserMessage.content.startsWith("[Canvas:")) {
        mode = "canvas";
        cleanedMessages = messages.map((m: any) => {
          if (m === lastUserMessage) {
            return {
              ...m,
              content: m.content.replace(/^\[Canvas:\s*/, "").replace(/\]$/, "")
            };
          }
          return m;
        });
      }
    }

    console.log("Detected mode:", mode);

    // Define base tools available to all modes
    const baseTools = [
      {
        type: "function",
        function: {
          name: "navigate_to_page",
          description: "Navigate the user to a specific page in The Quantum Club app. Use this when you need to redirect the user. You can also trigger actions like opening dialogs using query parameters.",
          parameters: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "The route path to navigate to. Examples: '/jobs', '/applications', '/tasks-pilot?action=create' (opens task creation dialog automatically)"
              },
              reason: {
                type: "string",
                description: "Brief explanation of why you're navigating them here"
              }
            },
            required: ["path", "reason"]
          }
        }
      }
    ];

    // Add web search tool for search mode
    const searchTools = mode === "search" ? [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search the web for current information, news, or data. Use this when the user asks about current events, recent developments, or information not in your knowledge base.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to execute"
              }
            },
            required: ["query"]
          }
        }
      }
    ] : [];

    // Import AI action tools
    const { allAITools, executeToolCall } = await import("../_shared/ai-tools.ts");
    
    // Combine all tools
    const tools = [...baseTools, ...searchTools, ...allAITools];

    // Map client-selected model to actual AI model
    let selectedModel = 'google/gemini-2.5-flash'; // Default
    if (clientSelectedModel === 'club-ai-0.1' || clientSelectedModel === 'quantum-0.1') {
      selectedModel = 'google/gemini-2.5-flash';
    } else if (clientSelectedModel === 'google/gemini-2.5-pro') {
      selectedModel = 'google/gemini-2.5-pro';
    } else if (clientSelectedModel === 'google/gemini-2.5-flash') {
      selectedModel = 'google/gemini-2.5-flash';
    } else if (clientSelectedModel === 'openai/gpt-5') {
      selectedModel = 'openai/gpt-5';
    } else if (clientSelectedModel === 'openai/gpt-5-mini') {
      selectedModel = 'openai/gpt-5-mini';
    }

    console.log('Client selected model:', clientSelectedModel, '→ Actual model:', selectedModel);

    let systemPrompt = `You are Club AI, an in-app copilot for The Quantum Club. Your job is to provide professional, highly actionable, and deeply human guidance to users based on all available in-app information. You always operate with the latest context and are aware of user role (Candidate, Partner, Admin) and permissions.

🚨 CRITICAL: YOU HAVE DIRECT ACCESS TO ALL USER DATA
The context below contains REAL DATA from the user's account. When this data is present in your context, you MUST use it and reference it directly. DO NOT say "I don't have access" when the data is clearly provided below.

🧠 YOU HAVE FULL VISIBILITY INTO:
✅ User's email inbox - If "EMAIL INTELLIGENCE" section below contains emails, reference them specifically
✅ Calendar and meetings - If "CALENDAR & MEETINGS" section below contains meetings, reference them specifically  
✅ Tasks, applications, achievements - All user data is provided in the context sections below

📧 EMAIL ACCESS RULES:
- IF the context contains "Recent High-Priority Emails" with actual emails → Reference them by sender, subject, priority
- IF the context shows "Total Recent: X emails" where X > 0 → You have access, use this data
- IF emails section is empty or shows 0 emails → Say "You haven't synced any emails to the platform yet"
- NEVER say "I don't have access for privacy reasons" when email data is clearly in the context

📅 CALENDAR ACCESS RULES:
- IF "Upcoming Meetings" section contains meetings → Reference them with specific times and details
- IF meetings section shows "No upcoming meetings" → Say that specifically
- NEVER claim you don't have access when the data is provided

When users ask about:
- "What do I need to do today?" → Check emails (action required), tasks, and meetings FROM THE CONTEXT BELOW
- "Prepare me for my meeting" → Look up meeting details FROM THE CONTEXT, check related emails
- "What's urgent?" → Flag unread action emails, upcoming meetings in next 24h, high-priority tasks
- "Summarize my day/week" → Combine email priorities + meetings + tasks from context in priority order
- "Any important emails?" → Reference high-priority emails from the EMAIL INTELLIGENCE section below
- "When is my next meeting?" → Provide exact time from CALENDAR & MEETINGS section below

IMPORTANT NAVIGATION CAPABILITIES:
- You can navigate users to any page using the navigate_to_page function
- When confirming actions that require navigation, use the tool AFTER user confirms
- Show step-by-step progress for multi-step workflows
- Format progress as: "Step X of Y: Description... ✅" when complete

For any sensitive or impactful action (accessing profile, changing settings, sending data, etc.), always show a visible and friendly "Confirm" button (use <button>Confirm</button> in your response).

When processing or running actions, always show clear step-by-step feedback with checkmarks (✅) for completed steps.

📝 RESPONSE FORMATTING GUIDELINES:
- ALWAYS use **clear, structured Markdown** in your responses
- Start with a brief intro (1-2 sentences maximum)
- Use **bullet lists** (•) or **numbered lists** (1. 2. 3.) for multi-point guidance
- Use headings (## Heading) to organize longer responses
- Use **bold** sparingly to highlight only the most critical terms or actions
- Use _italic_ even more sparingly for subtle emphasis
- Keep paragraphs SHORT (2-3 sentences max per paragraph)
- Prefer lists over walls of text
- For step-by-step guidance, use numbered lists
- Ensure all markdown is valid (no unmatched ** or _)

EXAMPLE GOOD RESPONSE:
Here's a quick strategy for your job search:

**Immediate Actions:**
• Update your LinkedIn profile with recent achievements
• Set up 3-5 job alerts on key platforms
• Reach out to 2 connections this week

**Next Steps:**
1. Prepare your elevator pitch
2. Research target companies
3. Practice common interview questions

Let me know if you'd like help with any of these!

Never simply echo or repeat prompts—respond in a warm, conversational, and professional tone, explaining your reasoning and adding value with suggestions, summaries, or bite-sized tips.

Guide users actively: clarify broad requests, propose next steps, and when confused, steer them toward useful actions.

At the end of any suggested action, restate what will happen, then show the "Confirm" button.

After any "Confirm" button is clicked, continue to provide step-by-step feedback and use navigation tools when appropriate.

You must always feel attentive, proactive, privacy-aware, and trustworthy—never robotic. Be an executive assistant who truly knows what's happening in their professional life.

⚠️ REMEMBER: If the user's data appears in the context sections below, YOU HAVE ACCESS. Use it directly and confidently.

${conversationHistory}

${userContext}`;

    // Customize based on mode
    if (mode === "search") {
      systemPrompt += `\n\n🌐 SEARCH MODE ACTIVE: The user has activated web search mode. You have access to the web_search tool to find current information, news, and real-time data. Use it proactively when you need up-to-date information or when the user's question requires external knowledge. Always cite sources when presenting search results.`;
    } else if (mode === "think") {
      selectedModel = "google/gemini-2.5-pro"; // Use more powerful model for deep thinking
      systemPrompt += `\n\n🧠 DEEP THINK MODE ACTIVE: The user wants you to think deeply about their question. Take your time to reason through complex problems step-by-step. Break down multi-faceted questions into components, consider multiple perspectives, show your reasoning process, and provide comprehensive, well-thought-out answers. Use chain-of-thought reasoning and explain your logic.`;
    } else if (mode === "canvas") {
      systemPrompt += `\n\n🎨 CANVAS MODE ACTIVE: The user is working on a creative, design, or code project. Focus on helping them build, design, or visualize things. Provide structured, actionable guidance for creating layouts, writing code, designing workflows, or planning visual elements. Think like a creative collaborator and technical architect combined.`;
    }

    // Prepare messages with image and document support
    let formattedMessages: any[] = cleanedMessages;
    let documentContext = "";
    
    // If documents are provided, add them as context
    if (documents && documents.length > 0) {
      documentContext = "\n\n**Attached Documents:**\n";
      documents.forEach((doc) => {
        documentContext += `\n- **${doc.name}** (${doc.type})\n`;
      });
      documentContext += "\nThe user has attached these documents for analysis. Please reference them in your response as needed.";
    }
    
    if (images && images.length > 0) {
      // If images are provided, format the last user message to include them
      formattedMessages = cleanedMessages.map((msg: any, idx: number) => {
        // Add images to the last user message
        if (idx === cleanedMessages.length - 1 && msg.role === "user") {
          const contentParts: any[] = [
            {
              type: "text",
              text: msg.content
            }
          ];
          
          // Add each image
          images.forEach((imageData: string) => {
            contentParts.push({
              type: "image_url",
              image_url: {
                url: imageData // Base64 encoded image data
              }
            });
          });
          
          return {
            ...msg,
            content: contentParts
          };
        }
        return msg;
      });
    }
    
    // If documents exist but no images, add doc context to last user message
    if (documents && documents.length > 0 && (!images || images.length === 0)) {
      formattedMessages = cleanedMessages.map((msg: any, idx: number) => {
        if (idx === cleanedMessages.length - 1 && msg.role === "user") {
          return {
            ...msg,
            content: msg.content + documentContext
          };
        }
        return msg;
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: systemPrompt + (documentContext || "")
          },
          ...formattedMessages,
        ],
        tools: tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Start background task to save conversation to database
    const saveConversation = async () => {
      try {
        // Collect the full AI response by reading the stream
        const reader = response.body?.getReader();
        if (!reader) return;
        
        const decoder = new TextDecoder();
        let fullResponse = "";
        const toolCalls: any[] = [];
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                
                if (delta?.content) {
                  fullResponse += delta.content;
                }
                
                if (delta?.tool_calls) {
                  toolCalls.push(...delta.tool_calls);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
        
        // Save to database
        const newMessages = [
          ...cleanedMessages,
          {
            role: "assistant",
            content: fullResponse,
            timestamp: new Date().toISOString(),
            model: selectedModel,
            mode: mode,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined
          }
        ];
        
        if (conversationId) {
          // Update existing conversation
          await supabase
            .from("ai_conversations")
            .update({
              messages: newMessages,
              context: {
                model: selectedModel,
                mode: mode,
                images_sent: images?.length || 0,
                documents_sent: documents?.length || 0,
                last_interaction: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq("id", conversationId);
        } else if (userId) {
          // Create new conversation
          await supabase
            .from("ai_conversations")
            .insert({
              user_id: userId,
              conversation_type: "club_ai",
              messages: newMessages,
              context: {
                model: selectedModel,
                mode: mode,
                images_sent: images?.length || 0,
                documents_sent: documents?.length || 0,
                first_interaction: new Date().toISOString()
              }
            });
        }
        
        console.log("Conversation saved successfully", {
          userId,
          conversationId,
          messageCount: newMessages.length,
          mode,
          model: selectedModel
        });
      } catch (error) {
        console.error("Error saving conversation:", error);
        // Don't throw - this is a background task
      }
    };
    
    // Clone the response so we can both return it and read it for saving
    const [streamForClient, streamForSaving] = response.body!.tee();
    
    // Start background save (Deno will keep function alive until this completes)
    const savePromise = (async () => {
      const reader = streamForSaving.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      const toolCalls: any[] = [];
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                
                if (delta?.content) {
                  fullResponse += delta.content;
                }
                
                if (delta?.tool_calls) {
                  toolCalls.push(...delta.tool_calls);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
        
        // Save to database
        const newMessages = [
          ...cleanedMessages,
          {
            role: "assistant",
            content: fullResponse,
            timestamp: new Date().toISOString(),
            model: selectedModel,
            mode: mode,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined
          }
        ];
        
        if (conversationId) {
          // Update existing conversation
          await supabase
            .from("ai_conversations")
            .update({
              messages: newMessages,
              context: {
                model: selectedModel,
                mode: mode,
                images_sent: images?.length || 0,
                last_interaction: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq("id", conversationId);
        } else if (userId) {
          // Create new conversation
          await supabase
            .from("ai_conversations")
            .insert({
              user_id: userId,
              conversation_type: "club_ai",
              messages: newMessages,
              context: {
                model: selectedModel,
                mode: mode,
                images_sent: images?.length || 0,
                first_interaction: new Date().toISOString()
              }
            });
        }
        
        console.log("✅ Conversation saved successfully", {
          userId,
          conversationId,
          messageCount: newMessages.length,
          mode,
          model: selectedModel,
          responseLength: fullResponse.length
        });

        // === CREATE SESSION SCORING ===
        if (conversationId && userId) {
          try {
            const responseTime = Date.now() - new Date().getTime(); // Approximate
            const usedTools = toolCalls.length > 0 ? toolCalls.map(tc => tc.function?.name).filter(Boolean) : [];
            
            // Calculate quality score based on response characteristics
            const qualityScore = Math.min(10, 5 + (fullResponse.length > 200 ? 2 : 0) + (toolCalls.length > 0 ? 2 : 0) + (mode !== "normal" ? 1 : 0));
            
            await supabase
              .from("ai_session_scores")
              .insert({
                conversation_id: conversationId,
                user_id: userId,
                quality_score: qualityScore,
                helpfulness_score: null, // User feedback needed
                actionability_score: toolCalls.length > 0 ? 8 : 5,
                context_accuracy_score: null, // User feedback needed
                response_time_ms: responseTime,
                tokens_used: fullResponse.length, // Approximate
                tools_invoked: usedTools,
                outcomes_achieved: [],
                user_sentiment: "neutral",
                metadata: {
                  mode,
                  model: selectedModel,
                  message_count: newMessages.length,
                  images_sent: images?.length || 0
                }
              });
            
            console.log("✅ Session score recorded");
          } catch (scoreError) {
            console.error("⚠️ Failed to record session score:", scoreError);
          }
        }

        // === CREATE CAREER CONTEXT SNAPSHOT ===
        if (userId && activeApplicationsWithStages && upcomingInterviews) {
          try {
            await supabase
              .from("career_context_snapshots")
              .insert({
                user_id: userId,
                active_applications: activeApplicationsWithStages,
                upcoming_interviews: upcomingInterviews,
                pending_tasks: urgentTasks || [],
                skill_gaps: [],
                career_goals: [],
                network_insights: {},
                market_position: {},
                next_best_actions: [],
                urgency_flags: [
                  ...(upcomingInterviews.length > 0 ? ["interviews_scheduled"] : []),
                  ...(urgentTasks && urgentTasks.length > 0 ? ["urgent_tasks_pending"] : [])
                ]
              });
            
            console.log("✅ Career context snapshot created");
          } catch (snapshotError) {
            console.error("⚠️ Failed to create career snapshot:", snapshotError);
          }
        }
      } catch (error) {
        console.error("❌ Error saving conversation:", error);
        // Don't throw - this is a background task
      }
    })();
    
    // Don't await - let it run in background while we stream to client
    savePromise.catch(err => console.error("Background save error:", err));
    
    return new Response(streamForClient, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("club-ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
