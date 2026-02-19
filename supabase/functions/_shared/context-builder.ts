import { createClient } from "npm:@supabase/supabase-js@2";

export interface BuiltContext {
  userContext: string;
  careerBrainContext: string;
  conversationHistory: string;
  upcomingInterviews: any[];
  urgentTasks: any[];
  activeApplicationsWithStages: any[];
}

export async function buildUserContext(
  supabase: ReturnType<typeof createClient>,
  userId: string | undefined,
  conversationId: string | undefined,
): Promise<BuiltContext> {
  let conversationHistory = "";
  let userContext = "";
  let careerBrainContext = "";
  let upcomingInterviews: any[] = [];
  let activeApplicationsWithStages: any[] = [];
  let urgentTasks: any[] = [];

  // Fetch conversation history — TRUNCATED to last 15 messages
  if (conversationId) {
    const { data: conversation } = await supabase
      .from("ai_conversations")
      .select("messages, context")
      .eq("id", conversationId)
      .single();

    if (conversation && Array.isArray(conversation.messages) && conversation.messages.length > 0) {
      const truncated = conversation.messages.slice(-15);
      conversationHistory = `
=== CONVERSATION HISTORY (last ${truncated.length} messages) ===
${truncated.map((msg: any) =>
  `${msg.role.toUpperCase()}: ${typeof msg.content === 'string' ? msg.content.substring(0, 300) : ''}`
).join("\n")}
===
`;
    }
  }

  if (!userId) return { userContext, careerBrainContext, conversationHistory, upcomingInterviews, urgentTasks, activeApplicationsWithStages };

  // === PREDICTIVE SIGNALS ===
  const { data: activeSignals } = await supabase
    .from("predictive_signals").select("*").eq("is_active", true)
    .gt("signal_strength", 0.6).order("detected_at", { ascending: false }).limit(10);

  let predictiveSignalsContext = "";
  if (activeSignals && activeSignals.length > 0) {
    predictiveSignalsContext = `
⚠️ PREDICTIVE SIGNALS DETECTED (High Confidence):
${activeSignals.map((s: any) => `• [${s.signal_type?.toUpperCase()}] ${s.entity_type} - Strength: ${Math.round((s.signal_strength || 0) * 100)}%
  Evidence: ${JSON.stringify(s.evidence)?.substring(0, 150)}...
  Recommended: ${Array.isArray(s.recommended_actions) ? s.recommended_actions[0] : 'Take action'}`).join('\n')}
`;
  }

  // === SUCCESS PATTERNS ===
  const { data: successPatterns } = await supabase
    .from("success_patterns").select("*").eq("is_active", true)
    .gt("confidence_score", 0.6).order("success_rate", { ascending: false }).limit(5);

  let successPatternsContext = "";
  if (successPatterns && successPatterns.length > 0) {
    successPatternsContext = `
📊 PROVEN SUCCESS PATTERNS (Data-Driven):
${successPatterns.map((p: any) => `• [${p.pattern_type?.toUpperCase()}] ${p.pattern_description?.substring(0, 100)}...
  Success Rate: ${Math.round((p.success_rate || 0) * 100)}% (n=${p.sample_size || 1})
  Confidence: ${Math.round((p.confidence_score || 0) * 100)}%`).join('\n')}
`;
  }

  // === PARALLEL FETCH: Core user data ===
  const [
    aiMemoryRes, trendInsightsRes, userTrendsRes, profileRes, rolesRes,
    companyMemberRes, applicationsRes, tasksRes, objectivesRes, bookingsRes,
    availableJobsRes, profileStrengthRes,
  ] = await Promise.all([
    supabase.from("ai_memory").select("*").eq("user_id", userId)
      .or("expires_at.is.null,expires_at.gt.now()").order("relevance_score", { ascending: false }).limit(20),
    supabase.from("career_trend_insights").select("*")
      .or("valid_until.is.null,valid_until.gt.now()").order("impact_level", { ascending: false }).limit(10),
    supabase.from("user_trend_subscriptions").select("*, career_trend_insights(*)")
      .eq("user_id", userId).eq("is_relevant", true),
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("company_members").select(`role, is_active, companies!inner(id, name, slug, description, industry, company_size, website_url, headquarters_location, mission, vision, values, culture_highlights, tech_stack, benefits)`)
      .eq("user_id", userId).eq("is_active", true).maybeSingle(),
    supabase.from("applications").select("id, position, company_name, status, current_stage_index, created_at, updated_at, stages, jobs(id, title, description, location, employment_type)")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
    supabase.from("unified_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("club_objectives").select("*").or(`created_by.eq.${userId},owners.cs.{${userId}}`).order("created_at", { ascending: false }).limit(10),
    supabase.from("bookings").select("id, status, scheduled_start, scheduled_end, booking_links(title, description)")
      .eq("user_id", userId).gte("scheduled_start", new Date().toISOString()).order("scheduled_start", { ascending: true }).limit(5),
    supabase.from("jobs").select("id, title, location, employment_type, created_at").eq("status", "published").order("created_at", { ascending: false }).limit(10),
    supabase.from("profile_strength_stats").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const aiMemory = aiMemoryRes.data || [];
  const trendInsights = trendInsightsRes.data || [];
  const userTrends = userTrendsRes.data || [];
  const profile = profileRes.data;
  const roles = rolesRes.data || [];
  const companyMember = companyMemberRes.data;
  const applications = applicationsRes.data || [];
  const tasks = tasksRes.data || [];
  const objectives = objectivesRes.data || [];
  const bookings = bookingsRes.data || [];
  const availableJobs = availableJobsRes.data || [];
  const profileStrength = profileStrengthRes.data;
  const companyData = Array.isArray(companyMember?.companies) ? companyMember?.companies[0] : companyMember?.companies;

  // === PARALLEL FETCH: Social & comms ===
  const nowISO = new Date().toISOString();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAhead = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    userPostsRes, userStoriesRes, connectionsRes, followersCountRes, recentCommentsRes,
    achievementsRes, companyAchievementsRes, conversationsRes, referralsRes, sentReferralsRes,
    engagementStatsRes, followedCompaniesRes, savedJobsRes, meetingHistoryRes, feedbackTasksRes,
    aiConversationsRes, recentWhatsAppRes, recentSMSRes, companyInteractionsRes,
    relationshipAlertsRes, unifiedTimelineRes, externalImportsRes, recentEmailsRes,
    upcomingMeetingsRes, recentMeetingsRes,
  ] = await Promise.all([
    supabase.from("posts").select("id, content, media_urls, created_at, ai_summary, poll_question, post_likes(count), post_comments(count), post_shares(count)").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("stories").select("id, story_type, created_at, views_count").eq("user_id", userId).gte("expires_at", nowISO).order("created_at", { ascending: false }).limit(10),
    supabase.from("social_connections").select("status, connected_user_id").eq("user_id", userId).eq("status", "accepted"),
    supabase.from("social_connections").select("*", { count: "exact", head: true }).eq("connected_user_id", userId).eq("status", "accepted"),
    supabase.from("comments").select("content, created_at, post_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("user_quantum_achievements").select("unlocked_at, progress, quantum_achievements(name, description, category, rarity)").eq("user_id", userId).order("unlocked_at", { ascending: false }).limit(15),
    supabase.from("company_achievement_earners").select("earned_at, company_achievements(name, description)").eq("user_id", userId).order("earned_at", { ascending: false }).limit(10),
    supabase.from("conversation_participants").select("conversations(id, title, created_at, last_message_at)").eq("user_id", userId).limit(10),
    supabase.from("referral_network").select("referred_by_type, referral_level, created_at").eq("user_id", userId).maybeSingle(),
    supabase.from("referral_network").select("*").eq("referred_by", userId),
    supabase.from("user_engagement").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("company_followers").select("companies(name, slug, industry)").eq("follower_id", userId),
    supabase.from("saved_jobs").select("saved_at, jobs(id, title, location, employment_type)").eq("user_id", userId).order("saved_at", { ascending: false }).limit(10),
    supabase.from("meeting_recordings").select("title, meeting_date, duration_minutes, analysis_summary").eq("user_id", userId).order("meeting_date", { ascending: false }).limit(5),
    supabase.from("closed_pipelines").select("*").eq("user_id", userId).eq("feedback_completed", false),
    supabase.from("ai_conversations").select("conversation_type, created_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(5),
    supabase.from('whatsapp_messages').select("content, direction, sentiment_score, intent_classification, created_at, conversation:whatsapp_conversations(contact_name, contact_phone, candidate_id)").order('created_at', { ascending: false }).limit(50),
    supabase.from('sms_messages').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('company_interactions').select("interaction_type, direction, summary, sentiment_score, interaction_date, duration_minutes, next_action, companies(name)").order('interaction_date', { ascending: false }).limit(30),
    supabase.from('communication_relationship_scores').select('*').in('risk_level', ['high', 'critical']).order('days_since_contact', { ascending: false }).limit(10),
    supabase.from('unified_communications').select('*').order('original_timestamp', { ascending: false }).limit(100),
    supabase.from('external_context_imports').select('*').eq('processing_status', 'completed').order('created_at', { ascending: false }).limit(20),
    supabase.from("emails").select("id, subject, from_email, from_name, snippet, email_date, is_read, is_starred, ai_category, ai_priority_score, ai_priority_reason, inbox_type, ai_summary, ai_action_items, has_attachments, status").eq("user_id", userId).is("deleted_at", null).order("email_date", { ascending: false }).limit(50),
    supabase.from("meetings").select("id, title, description, start_time, end_time, location, meeting_type, status, meeting_url, attendees, agenda, notes").gte("start_time", nowISO).lte("start_time", twoWeeksAhead).order("start_time", { ascending: true }).limit(20),
    supabase.from("meetings").select("id, title, start_time, end_time, status, ai_summary, action_items").gte("start_time", oneWeekAgo).lt("start_time", nowISO).order("start_time", { ascending: false }).limit(10),
  ]);

  const userPosts = userPostsRes.data || [];
  const userStories = userStoriesRes.data || [];
  const connections = connectionsRes.data || [];
  const followersCount = followersCountRes.count || 0;
  const recentComments = recentCommentsRes.data || [];
  const achievements = achievementsRes.data || [];
  const companyAchievements = companyAchievementsRes.data || [];
  const conversationsData = conversationsRes.data || [];
  const referrals = referralsRes.data;
  const sentReferrals = sentReferralsRes.data || [];
  const engagementStats = engagementStatsRes.data;
  const followedCompanies = followedCompaniesRes.data || [];
  const savedJobs = savedJobsRes.data || [];
  const meetingHistory = meetingHistoryRes.data || [];
  const feedbackTasks = feedbackTasksRes.data || [];
  const aiConversations = aiConversationsRes.data || [];
  const recentWhatsApp = recentWhatsAppRes.data || [];
  const recentSMS = recentSMSRes.data || [];
  const companyInteractions = companyInteractionsRes.data || [];
  const relationshipAlerts = relationshipAlertsRes.data || [];
  const unifiedTimeline = unifiedTimelineRes.data || [];
  const externalImports = externalImportsRes.data || [];
  const recentEmails = recentEmailsRes.data || [];
  const upcomingMeetings = upcomingMeetingsRes.data || [];
  const recentMeetings = recentMeetingsRes.data || [];
  const now = new Date();
  const nowForCalendar = now;

  // Build derived arrays
  upcomingInterviews = (bookings || []).filter((b: any) => {
    const start = new Date(b.scheduled_start);
    const daysUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 7;
  }).map((b: any) => {
    const linkData = Array.isArray(b.booking_links) ? b.booking_links[0] : b.booking_links;
    return {
      title: linkData?.title || "Interview",
      date: b.scheduled_start,
      daysUntil: Math.ceil((new Date(b.scheduled_start).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    };
  });

  activeApplicationsWithStages = (applications || []).filter((app: any) => app.status === "active").map((app: any) => {
    const jobData = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
    const currentStage = app.stages?.[app.current_stage_index];
    return { position: jobData?.title || app.position, company: app.company_name, stage: currentStage?.name || "Unknown", stageIndex: app.current_stage_index, totalStages: app.stages?.length || 0 };
  });

  urgentTasks = (tasks || []).filter((t: any) => t.status !== "completed" && (t.priority === "high" || t.priority === "urgent")).map((t: any) => ({ title: t.title, priority: t.priority, dueDate: t.due_date }));

  // Build Career Brain Context
  careerBrainContext = `
=== 🧠 CAREER BRAIN: DEEP CONTEXTUAL AWARENESS ===

🎯 AI MEMORY & LEARNED PREFERENCES:
${aiMemory.length > 0 ? aiMemory.map((mem: any) => `- [${mem.memory_type.toUpperCase()}] ${mem.content} (Relevance: ${mem.relevance_score})`).join("\n") : "No learned preferences yet"}

⚡ URGENT ITEMS REQUIRING ATTENTION:
${upcomingInterviews.length > 0 ? `📅 UPCOMING INTERVIEWS (Next 7 days):\n${upcomingInterviews.map((int: any) => `  • ${int.title} in ${int.daysUntil} day${int.daysUntil !== 1 ? 's' : ''} (${new Date(int.date).toLocaleDateString()})`).join("\n")}` : ""}
${urgentTasks.length > 0 ? `🚨 HIGH-PRIORITY TASKS:\n${urgentTasks.map((t: any) => `  • ${t.title} (${t.priority})`).join("\n")}` : ""}
${activeApplicationsWithStages.length > 0 ? `📊 ACTIVE APPLICATION PIPELINES:\n${activeApplicationsWithStages.map((app: any) => `  • ${app.position} at ${app.company} - Stage ${app.stageIndex + 1}/${app.totalStages}: ${app.stage}`).join("\n")}` : ""}
${recentEmails.filter((e: any) => !e.is_read && e.inbox_type === 'action').length > 0 ? `📧 URGENT EMAIL: ${recentEmails.filter((e: any) => !e.is_read && e.inbox_type === 'action').length} unread action emails` : ""}
${upcomingMeetings.filter((m: any) => { const h = (new Date(m.start_time).getTime() - nowForCalendar.getTime()) / (1000 * 60 * 60); return h > 0 && h < 24; }).length > 0 ? `📅 MEETINGS IN NEXT 24 HOURS:\n${upcomingMeetings.filter((m: any) => { const h = (new Date(m.start_time).getTime() - nowForCalendar.getTime()) / (1000 * 60 * 60); return h > 0 && h < 24; }).map((m: any) => `  • ${m.title} at ${new Date(m.start_time).toLocaleTimeString()}`).join("\n")}` : ""}

🌐 MARKET & TREND INSIGHTS:
${trendInsights.length > 0 ? trendInsights.slice(0, 5).map((trend: any) => `- [${trend.impact_level?.toUpperCase() || 'INFO'}] ${trend.title}: ${trend.description?.substring(0, 120) || ''}...`).join("\n") : "No current trend data"}

${userTrends.length > 0 ? `📌 YOUR TRACKED TRENDS:\n${userTrends.map((ut: any) => { const trend = Array.isArray(ut.career_trend_insights) ? ut.career_trend_insights[0] : ut.career_trend_insights; return `- ${trend?.title || "Trend"} ${ut.user_notes ? `(Note: ${ut.user_notes})` : ''}`; }).join("\n")}` : ""}

=== END CAREER BRAIN ===

${predictiveSignalsContext}
${successPatternsContext}

⚠️ PROACTIVE BEHAVIOR RULES:
1. When you see upcoming interviews, PROACTIVELY offer prep help even if not asked
2. When you see urgent tasks, FLAG them and ask if they need prioritization help
3. When you see stalled applications (no recent activity), SUGGEST follow-up actions
4. When you see relevant trends, CONNECT them to user's goals
5. Always consider TIME SENSITIVITY - deadlines matter more than general advice
6. Use REAL DATA from above - reference specific interview dates, task names, companies
`;

  // Build main user context string
  userContext = `
=== USER PROFILE DATA ===
Name: ${profile?.full_name || "Not set"}
Email: ${profile?.email || "Not set"}
Current Title: ${profile?.current_title || "Not set"}
Bio: ${profile?.bio?.substring(0, 200) || "Not set"}
Location: ${profile?.location || "Not set"}
Profile Completion: ${profileStrength?.completion_percentage || 0}%

=== USER ROLES ===
${roles.map((r: any) => r.role).join(", ") || "No roles assigned"}

=== COMPANY ASSOCIATION ===
${companyData ? `Company: ${companyData.name}\nRole: ${companyMember?.role || "Unknown"}\nIndustry: ${companyData.industry || "N/A"}` : "Not associated with any company"}

=== RECENT APPLICATIONS ===
${applications.length > 0 ?
  applications.map((app: any) => {
    const stageName = app.stages?.[app.current_stage_index]?.name || "Unknown";
    const jobData = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
    return `- ${jobData?.title || app.position} at ${app.company_name} | ${app.status} | Stage: ${stageName} (${app.current_stage_index + 1}/${app.stages?.length || 0}) | ${new Date(app.created_at).toLocaleDateString()}`;
  }).join("\n") : "No recent applications"}

=== TASKS & OBJECTIVES ===
Tasks (${tasks.length} active):
${tasks.length > 0 ? tasks.map((t: any) => `- ${t.title} (${t.status}) - Priority: ${t.priority}`).join("\n") : "No active tasks"}

Objectives (${objectives.length}):
${objectives.length > 0 ? objectives.map((o: any) => `- ${o.title} (${o.status}) - ${o.completion_percentage}% complete`).join("\n") : "No active objectives"}

=== UPCOMING BOOKINGS ===
${bookings.length > 0 ? bookings.map((b: any) => { const linkData = Array.isArray(b.booking_links) ? b.booking_links[0] : b.booking_links; return `- ${linkData?.title || "Meeting"} on ${new Date(b.scheduled_start).toLocaleString()}`; }).join("\n") : "No upcoming bookings"}

=== AVAILABLE OPPORTUNITIES ===
${availableJobs.length > 0 ? availableJobs.map((j: any) => `- ${j.title} (${j.location || "Remote"})`).join("\n") : "No new opportunities"}

=== SOCIAL & CONTENT ===
Posts: ${userPosts.length} recent | Stories: ${userStories.length} active
Connections: ${connections.length} | Followers: ${followersCount}
Achievements: ${achievements.length} unlocked

=== EMAIL INTELLIGENCE ===
Inbox: ${recentEmails.length} recent | Unread: ${recentEmails.filter((e: any) => !e.is_read).length} | Action Required: ${recentEmails.filter((e: any) => e.inbox_type === 'action').length}
High Priority Emails:
${recentEmails.filter((e: any) => e.ai_priority_score && e.ai_priority_score >= 70).slice(0, 5).map((email: any) => `- From: ${email.from_name || email.from_email} | Subject: ${email.subject} | Priority: ${email.ai_priority_score}/100 | ${email.is_read ? 'Read' : 'UNREAD'}`).join('\n') || 'No high-priority emails'}

=== CALENDAR & MEETINGS ===
Upcoming (${upcomingMeetings.length}):
${upcomingMeetings.slice(0, 5).map((m: any) => `- ${m.title} | ${new Date(m.start_time).toLocaleString()} | ${m.location || m.meeting_url || 'TBD'}`).join('\n') || 'No upcoming meetings'}

Recent (${recentMeetings.length}):
${recentMeetings.slice(0, 3).map((m: any) => `- ${m.title} (${new Date(m.start_time).toLocaleDateString()})${m.ai_summary ? ` | ${m.ai_summary.substring(0, 100)}...` : ''}`).join('\n') || 'No recent meetings'}

=== RELATIONSHIP HEALTH ===
At-Risk: ${relationshipAlerts.length} relationships
${relationshipAlerts.slice(0, 5).map((r: any) => `- Risk ${r.risk_level?.toUpperCase()}: ${r.days_since_contact} days since contact`).join('\n') || 'All healthy'}

=== PENDING ACTIONS ===
Feedback Requests: ${feedbackTasks?.length || 0} | AI Sessions: ${aiConversations?.length || 0}

${careerBrainContext}`;

  // Role-based enrichment
  const userRoles = (roles || []).map((r: any) => r.role);
  const isAdmin = userRoles.includes('admin');
  const isStrategist = userRoles.includes('strategist');
  const isPartner = userRoles.includes('partner');
  const companyId = companyData?.id;

  if (isAdmin || isStrategist) {
    userContext += await buildAdminContext(supabase);
  } else if (isPartner && companyId) {
    userContext += await buildPartnerContext(supabase, companyId);
  } else {
    // Candidate: add salary benchmarks
    const { data: salaryBenchmarks } = await supabase
      .from('salary_benchmarks').select('role_title, location, salary_min, salary_max, currency, sample_size, experience_years').limit(10);
    if (salaryBenchmarks && salaryBenchmarks.length > 0) {
      userContext += `\n=== SALARY BENCHMARKS ===\n${salaryBenchmarks.map((b: any) => `- ${b.role_title} (${b.location || 'Global'}, ${b.experience_years || '?'}y): ${b.currency || '€'}${b.salary_min?.toLocaleString() || 'N/A'} – ${b.salary_max?.toLocaleString() || 'N/A'}`).join('\n')}\n`;
    }
  }

  return { userContext, careerBrainContext, conversationHistory, upcomingInterviews, urgentTasks, activeApplicationsWithStages };
}

async function buildAdminContext(supabase: ReturnType<typeof createClient>): Promise<string> {
  const [
    placementFeesRes, moneybirdInvoicesRes, moneybirdMetricsRes, partnerInvoicesRes,
    crmProspectsRes, referralPayoutsRes, candidateProfilesRes, kpiMetricsRes,
    allJobsRes, allApplicationsRes, platformStatsRes, candidateOffersRes,
    candidateShortlistsRes, candidateScorecardsRes, interviewFeedbackRes,
    candidateInteractionsRes, candidateNotesRes, dossierSharesRes,
  ] = await Promise.all([
    supabase.from('placement_fees').select('*, jobs(title), companies:partner_company_id(name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('moneybird_sales_invoices').select('*').order('invoice_date', { ascending: false }).limit(100),
    supabase.from('moneybird_financial_metrics').select('*').order('created_at', { ascending: false }).limit(1),
    supabase.from('partner_invoices').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('crm_prospects').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('referral_payouts').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('candidate_profiles').select('id, full_name, current_title, current_company, talent_tier, move_probability, location, availability_status, last_activity_at, tier_score').order('last_activity_at', { ascending: false }).limit(100),
    supabase.from('kpi_metrics').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('jobs').select('id, title, status, location, employment_type, created_at, salary_min, salary_max, currency, job_fee_type, job_fee_percentage, job_fee_fixed, target_hire_count, hired_count, deal_stage, deal_probability, deal_value_override, club_sync_status, is_continuous, companies:company_id(name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('applications').select('id, position, company_name, status, current_stage_index, stages, created_at, user_id, job_id').order('created_at', { ascending: false }).limit(200),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('candidate_offers').select('id, candidate_id, job_id, status, total_compensation, base_salary, sent_at, responded_at, offer_type').order('sent_at', { ascending: false }).limit(50),
    supabase.from('candidate_shortlists').select('id, candidate_id, job_id, company_id, priority, notes, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('candidate_scorecards').select('id, application_id, overall_rating, recommendation, status, submitted_at, submitted_by').order('submitted_at', { ascending: false }).limit(50),
    supabase.from('interview_feedback').select('id, application_id, overall_rating, recommendation, status, submitted_at, interviewer_name').order('submitted_at', { ascending: false }).limit(50),
    supabase.from('candidate_interactions').select('id, candidate_id, interaction_type, title, summary, ai_sentiment, created_at').order('created_at', { ascending: false }).limit(50),
    supabase.from('candidate_notes').select('id, candidate_id, note_type, title, content, pinned, created_at').order('created_at', { ascending: false }).limit(30),
    supabase.from('dossier_shares').select('id, candidate_id, shared_by, expires_at, view_count, is_revoked, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  const placementFees = placementFeesRes.data || [];
  const moneybirdInvoices = moneybirdInvoicesRes.data || [];
  const moneybirdMetrics = moneybirdMetricsRes.data?.[0];
  const crmProspects = crmProspectsRes.data || [];
  const candidateProfiles = candidateProfilesRes.data || [];
  const kpiMetrics = kpiMetricsRes.data || [];
  const allJobs = allJobsRes.data || [];
  const allApps = allApplicationsRes.data || [];
  const totalUsers = platformStatsRes.count || 0;
  const candidateOffers = candidateOffersRes.data || [];
  const candidateShortlists = candidateShortlistsRes.data || [];
  const candidateScorecards = candidateScorecardsRes.data || [];
  const interviewFeedback = interviewFeedbackRes.data || [];
  const candidateInteractions = candidateInteractionsRes.data || [];
  const candidateNotes = candidateNotesRes.data || [];
  const dossierShares = dossierSharesRes.data || [];

  // Aggregations
  const feesByStatus: Record<string, { count: number; total: number }> = {};
  placementFees.forEach((f: any) => {
    const s = f.status || 'unknown';
    if (!feesByStatus[s]) feesByStatus[s] = { count: 0, total: 0 };
    feesByStatus[s].count++; feesByStatus[s].total += (f.fee_amount || 0);
  });
  const crmByStage: Record<string, { count: number; dealValue: number }> = {};
  crmProspects.forEach((p: any) => {
    const s = p.stage || 'unknown';
    if (!crmByStage[s]) crmByStage[s] = { count: 0, dealValue: 0 };
    crmByStage[s].count++; crmByStage[s].dealValue += (p.deal_value || 0);
  });
  const appsByJob: Record<string, any[]> = {};
  allApps.forEach((a: any) => { if (a.job_id) { if (!appsByJob[a.job_id]) appsByJob[a.job_id] = []; appsByJob[a.job_id].push(a); } });
  const offersByJob: Record<string, any[]> = {};
  candidateOffers.forEach((o: any) => { if (o.job_id) { if (!offersByJob[o.job_id]) offersByJob[o.job_id] = []; offersByJob[o.job_id].push(o); } });
  const shortlistsByJob: Record<string, any[]> = {};
  candidateShortlists.forEach((s: any) => { if (s.job_id) { if (!shortlistsByJob[s.job_id]) shortlistsByJob[s.job_id] = []; shortlistsByJob[s.job_id].push(s); } });
  const calcFee = (j: any): string => {
    if (j.deal_value_override) return `€${j.deal_value_override.toLocaleString()} (override)`;
    if (j.job_fee_type === 'fixed' && j.job_fee_fixed) return `€${j.job_fee_fixed.toLocaleString()} (fixed)`;
    const salaryBase = j.salary_max || j.salary_min || 0; const pct = j.job_fee_percentage || 20;
    if (salaryBase > 0) return `${pct}% (~€${Math.round(salaryBase * pct / 100).toLocaleString()})`;
    return 'N/A';
  };
  let totalRating = 0; let ratedCount = 0;
  const scorecardsByRec: Record<string, number> = {};
  candidateScorecards.forEach((sc: any) => {
    const rec = sc.recommendation || 'unknown';
    scorecardsByRec[rec] = (scorecardsByRec[rec] || 0) + 1;
    if (sc.overall_rating) { totalRating += sc.overall_rating; ratedCount++; }
  });

  return `

=== ADMIN: FINANCIAL & REVENUE DATA ===
PLACEMENT FEES (${placementFees.length}):
${Object.entries(feesByStatus).map(([status, data]) => `  ${status}: ${data.count} fees, total €${data.total.toLocaleString()}`).join('\n')}
Recent: ${placementFees.slice(0, 5).map((f: any) => { const job = Array.isArray(f.jobs) ? f.jobs[0] : f.jobs; const co = Array.isArray(f.companies) ? f.companies[0] : f.companies; return `${job?.title || 'N/A'} → ${co?.name || 'N/A'}: €${f.fee_amount || 0} (${f.status})`; }).join(', ')}

MONEYBIRD: ${moneybirdInvoices.length} invoices | ${moneybirdMetrics ? `Revenue €${moneybirdMetrics.total_revenue || 0}, Outstanding €${moneybirdMetrics.total_outstanding || 0}` : 'No metrics'}
CRM (${crmProspects.length}): ${Object.entries(crmByStage).map(([s, d]) => `${s}: ${d.count} (€${d.dealValue.toLocaleString()})`).join(', ')}
Partner Invoices: ${partnerInvoicesRes.data?.length || 0} | Referral Payouts: ${referralPayoutsRes.data?.length || 0}
=== END ADMIN FINANCIAL ===

=== ADMIN: TALENT POOL ===
Total Candidates: ${candidateProfiles.length}
By Tier: ${['hot', 'warm', 'strategic', 'pool', 'dormant'].map(t => `${t}: ${candidateProfiles.filter((c: any) => c.talent_tier === t).length}`).join(', ')}
Top 10: ${candidateProfiles.slice(0, 10).map((c: any) => `${c.full_name} (${c.talent_tier})`).join(', ')}
=== END ADMIN TALENT ===

=== ADMIN: PLATFORM KPIs ===
Users: ${totalUsers} | Active Jobs: ${allJobs.filter((j: any) => j.status === 'published').length}/${allJobs.length} | Applications: ${allApps.length}
KPIs: ${kpiMetrics.slice(0, 10).map((k: any) => `${k.kpi_name}: ${k.value}`).join(', ')}
=== END ADMIN KPIs ===

=== ADMIN: JOBS PIPELINE ===
${allJobs.slice(0, 20).map((j: any) => {
  const co = Array.isArray(j.companies) ? j.companies[0] : j.companies;
  const jobApps = appsByJob[j.id] || [];
  const jobOffers = offersByJob[j.id] || [];
  const jobShortlists = shortlistsByJob[j.id] || [];
  return `- ${j.title} @ ${co?.name || 'N/A'} (${j.status}) | Apps: ${jobApps.length} | Shortlisted: ${jobShortlists.length} | Offers: ${jobOffers.length} | Fee: ${calcFee(j)}`;
}).join('\n')}
=== END ADMIN JOBS ===

=== ADMIN: OFFERS & TALENT INTELLIGENCE ===
Offers: ${candidateOffers.length} | Scorecards: ${candidateScorecards.length} (avg ${ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 'N/A'}/5) | Feedback: ${interviewFeedback.length}
Shortlists: ${candidateShortlists.length} | Interactions: ${candidateInteractions.length} | Notes: ${candidateNotes.length}
Dossiers: ${dossierShares.length} (active: ${dossierShares.filter((d: any) => !d.is_revoked).length})
=== END ADMIN OFFERS ===
`;
}

async function buildPartnerContext(supabase: ReturnType<typeof createClient>, companyId: string): Promise<string> {
  const [
    companyJobsRes, companyFeesRes, companyInvoicesRes, companyMembersRes,
    companyKpisRes, companyOffersRes, companyShortlistsRes, companyFeedbackRes,
  ] = await Promise.all([
    supabase.from('jobs').select('id, title, status, location, salary_min, salary_max, currency, job_fee_type, job_fee_percentage, job_fee_fixed, target_hire_count, hired_count, club_sync_status').eq('company_id', companyId).order('created_at', { ascending: false }).limit(30),
    supabase.from('placement_fees').select('*').eq('partner_company_id', companyId).order('created_at', { ascending: false }).limit(20),
    supabase.from('partner_invoices').select('*').eq('partner_company_id', companyId).order('created_at', { ascending: false }).limit(30),
    supabase.from('company_members').select('id, role, is_active, user_id, job_title, profiles!inner(full_name, email)').eq('company_id', companyId).eq('is_active', true),
    supabase.from('kpi_metrics').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
    supabase.from('candidate_offers').select('id, candidate_id, job_id, status, total_compensation, base_salary, sent_at, responded_at').order('sent_at', { ascending: false }).limit(30),
    supabase.from('candidate_shortlists').select('id, candidate_id, job_id, priority, notes').eq('company_id', companyId).order('created_at', { ascending: false }).limit(30),
    supabase.from('interview_feedback').select('id, application_id, overall_rating, recommendation, status, submitted_at, interviewer_name').order('submitted_at', { ascending: false }).limit(30),
  ]);

  const companyJobs = companyJobsRes.data || [];
  const companyFees = companyFeesRes.data || [];
  const companyInvoices = companyInvoicesRes.data || [];
  const companyTeam = companyMembersRes.data || [];
  const companyKpis = companyKpisRes.data || [];

  return `

=== PARTNER: COMPANY PIPELINE ===
Jobs (${companyJobs.filter((j: any) => j.status === 'published').length} active / ${companyJobs.length} total):
${companyJobs.map((j: any) => `- ${j.title} (${j.status}) | ${j.location || 'Remote'} | Club Sync: ${j.club_sync_status || 'N/A'}`).join('\n')}
=== END PARTNER PIPELINE ===

=== PARTNER: FINANCIALS ===
Fees: ${companyFees.length} | Invoices: ${companyInvoices.length}
${companyFees.slice(0, 5).map((f: any) => `- ${f.candidate_name || 'N/A'}: €${f.fee_amount || 0} (${f.status})`).join('\n')}
=== END PARTNER FINANCIALS ===

=== PARTNER: OFFERS & FEEDBACK ===
Offers: ${companyOffersRes.data?.length || 0} | Shortlisted: ${companyShortlistsRes.data?.length || 0} | Feedback entries: ${companyFeedbackRes.data?.length || 0}
=== END PARTNER OFFERS ===

=== PARTNER: TEAM (${companyTeam.length} members) ===
${companyTeam.map((m: any) => { const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles; return `- ${profile?.full_name || 'N/A'} (${m.role || 'Member'})${m.job_title ? ` - ${m.job_title}` : ''}`; }).join('\n')}
=== END PARTNER TEAM ===

=== PARTNER: KPIs ===
${companyKpis.slice(0, 10).map((k: any) => `- ${k.kpi_name}: ${k.value}`).join('\n') || 'No KPIs available'}
=== END PARTNER KPIs ===
`;
}
