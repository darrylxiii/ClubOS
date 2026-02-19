import { createClient } from "npm:@supabase/supabase-js@2";

// === 5-MINUTE IN-MEMORY ADMIN CONTEXT CACHE ===
// Keyed by user ID; TTL prevents stale data while saving 12 DB queries per chat message
const adminContextCache = new Map<string, { context: string; ts: number }>();
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    .gt("signal_strength", 0.6).order("detected_at", { ascending: false }).limit(5);

  let predictiveSignalsContext = "";
  if (activeSignals && activeSignals.length > 0) {
    predictiveSignalsContext = `
⚠️ PREDICTIVE SIGNALS DETECTED (High Confidence):
${activeSignals.map((s: any) => `• [${s.signal_type?.toUpperCase()}] ${s.entity_type} - Strength: ${Math.round((s.signal_strength || 0) * 100)}%
  Recommended: ${Array.isArray(s.recommended_actions) ? s.recommended_actions[0] : 'Take action'}`).join('\n')}
`;
  }

  // === SUCCESS PATTERNS ===
  const { data: successPatterns } = await supabase
    .from("success_patterns").select("*").eq("is_active", true)
    .gt("confidence_score", 0.6).order("success_rate", { ascending: false }).limit(3);

  let successPatternsContext = "";
  if (successPatterns && successPatterns.length > 0) {
    successPatternsContext = `
📊 PROVEN SUCCESS PATTERNS:
${successPatterns.map((p: any) => `• [${p.pattern_type?.toUpperCase()}] ${p.pattern_description?.substring(0, 80)}... (${Math.round((p.success_rate || 0) * 100)}% success)`).join('\n')}
`;
  }

  // === PARALLEL FETCH: Core user data ===
  const [
    aiMemoryRes, trendInsightsRes, profileRes, rolesRes,
    companyMemberRes, applicationsRes, tasksRes, objectivesRes, bookingsRes,
    availableJobsRes, profileStrengthRes,
  ] = await Promise.all([
    // AI memory: trim to 10, content capped at 150 chars each
    supabase.from("ai_memory").select("memory_type, content, relevance_score").eq("user_id", userId)
      .or("expires_at.is.null,expires_at.gt.now()").order("relevance_score", { ascending: false }).limit(10),
    // Trend insights: only top 5
    supabase.from("career_trend_insights").select("title, description, impact_level")
      .or("valid_until.is.null,valid_until.gt.now()").order("impact_level", { ascending: false }).limit(5),
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("company_members").select(`role, is_active, companies!inner(id, name, slug, industry)`)
      .eq("user_id", userId).eq("is_active", true).maybeSingle(),
    supabase.from("applications").select("id, position, company_name, status, current_stage_index, created_at, updated_at, stages, jobs(id, title)")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("unified_tasks").select("title, status, priority, due_date").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("club_objectives").select("title, status, completion_percentage").or(`created_by.eq.${userId},owners.cs.{${userId}}`).order("created_at", { ascending: false }).limit(5),
    supabase.from("bookings").select("id, status, scheduled_start, scheduled_end, booking_links(title, description)")
      .eq("user_id", userId).gte("scheduled_start", new Date().toISOString()).order("scheduled_start", { ascending: true }).limit(5),
    supabase.from("jobs").select("id, title, location, employment_type").eq("status", "published").order("created_at", { ascending: false }).limit(5),
    supabase.from("profile_strength_stats").select("completion_percentage").eq("user_id", userId).maybeSingle(),
  ]);

  const aiMemory = aiMemoryRes.data || [];
  const trendInsights = trendInsightsRes.data || [];
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

  // === PARALLEL FETCH: Social & comms (reduced limits) ===
  const nowISO = new Date().toISOString();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAhead = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    userPostsRes, connectionsRes, followersCountRes,
    achievementsRes, recentWhatsAppRes, recentSMSRes, companyInteractionsRes,
    relationshipAlertsRes, unifiedTimelineRes, externalImportsRes, recentEmailsRes,
    upcomingMeetingsRes, recentMeetingsRes,
  ] = await Promise.all([
    // Posts: 5 (down from 20)
    supabase.from("posts").select("id, content, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("social_connections").select("status").eq("user_id", userId).eq("status", "accepted"),
    supabase.from("social_connections").select("*", { count: "exact", head: true }).eq("connected_user_id", userId).eq("status", "accepted"),
    supabase.from("user_quantum_achievements").select("unlocked_at, quantum_achievements(name, category)").eq("user_id", userId).order("unlocked_at", { ascending: false }).limit(5),
    // WhatsApp: 10 (down from 50), fewer fields
    supabase.from('whatsapp_messages').select("content, direction, created_at, conversation:whatsapp_conversations(contact_name)").order('created_at', { ascending: false }).limit(10),
    // SMS: 5 (down from 30)
    supabase.from('sms_messages').select('body, direction, created_at').order('created_at', { ascending: false }).limit(5),
    // Company interactions: 10 (down from 30)
    supabase.from('company_interactions').select("interaction_type, summary, sentiment_score, interaction_date, companies(name)").order('interaction_date', { ascending: false }).limit(10),
    supabase.from('communication_relationship_scores').select('risk_level, days_since_contact').in('risk_level', ['high', 'critical']).order('days_since_contact', { ascending: false }).limit(5),
    // Unified comms: 20 (down from 100)
    supabase.from('unified_communications').select('channel, direction, subject, snippet, created_at').order('original_timestamp', { ascending: false }).limit(20),
    // External imports: 5 (down from 20)
    supabase.from('external_context_imports').select('source_type, title, created_at').eq('processing_status', 'completed').order('created_at', { ascending: false }).limit(5),
    // Emails: 10 action/unread only (down from 50), fewer fields
    supabase.from("emails").select("id, subject, from_name, from_email, email_date, is_read, ai_priority_score, inbox_type").eq("user_id", userId).is("deleted_at", null).order("email_date", { ascending: false }).limit(10),
    supabase.from("meetings").select("id, title, start_time, end_time, location, meeting_type, meeting_url").gte("start_time", nowISO).lte("start_time", twoWeeksAhead).order("start_time", { ascending: true }).limit(10),
    supabase.from("meetings").select("id, title, start_time, status, ai_summary").gte("start_time", oneWeekAgo).lt("start_time", nowISO).order("start_time", { ascending: false }).limit(5),
  ]);

  const userPosts = userPostsRes.data || [];
  const connections = connectionsRes.data || [];
  const followersCount = followersCountRes.count || 0;
  const achievements = achievementsRes.data || [];
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
${aiMemory.length > 0 ? aiMemory.map((mem: any) => `- [${mem.memory_type?.toUpperCase()}] ${String(mem.content).substring(0, 150)} (Rel: ${mem.relevance_score})`).join("\n") : "No learned preferences yet"}

⚡ URGENT ITEMS REQUIRING ATTENTION:
${upcomingInterviews.length > 0 ? `📅 UPCOMING INTERVIEWS (Next 7 days):\n${upcomingInterviews.map((int: any) => `  • ${int.title} in ${int.daysUntil} day${int.daysUntil !== 1 ? 's' : ''} (${new Date(int.date).toLocaleDateString()})`).join("\n")}` : ""}
${urgentTasks.length > 0 ? `🚨 HIGH-PRIORITY TASKS:\n${urgentTasks.map((t: any) => `  • ${t.title} (${t.priority})`).join("\n")}` : ""}
${activeApplicationsWithStages.length > 0 ? `📊 ACTIVE PIPELINES:\n${activeApplicationsWithStages.map((app: any) => `  • ${app.position} at ${app.company} - Stage ${app.stageIndex + 1}/${app.totalStages}: ${app.stage}`).join("\n")}` : ""}
${recentEmails.filter((e: any) => !e.is_read && e.inbox_type === 'action').length > 0 ? `📧 URGENT EMAIL: ${recentEmails.filter((e: any) => !e.is_read && e.inbox_type === 'action').length} unread action emails` : ""}

🌐 MARKET & TREND INSIGHTS:
${trendInsights.length > 0 ? trendInsights.map((trend: any) => `- [${trend.impact_level?.toUpperCase() || 'INFO'}] ${trend.title}: ${trend.description?.substring(0, 100) || ''}...`).join("\n") : "No current trend data"}

=== END CAREER BRAIN ===

${predictiveSignalsContext}
${successPatternsContext}

⚠️ PROACTIVE BEHAVIOR RULES:
1. When you see upcoming interviews, PROACTIVELY offer prep help even if not asked
2. When you see urgent tasks, FLAG them and ask if they need prioritization help
3. When you see stalled applications, SUGGEST follow-up actions
4. Always consider TIME SENSITIVITY - deadlines matter more than general advice
5. Use REAL DATA from above - reference specific interview dates, task names, companies
`;

  // Build main user context string
  userContext = `
=== USER PROFILE DATA ===
Name: ${profile?.full_name || "Not set"}
Email: ${profile?.email || "Not set"}
Current Title: ${profile?.current_title || "Not set"}
Bio: ${profile?.bio?.substring(0, 150) || "Not set"}
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
    return `- ${jobData?.title || app.position} at ${app.company_name} | ${app.status} | Stage: ${stageName} | ${new Date(app.created_at).toLocaleDateString()}`;
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
Posts: ${userPosts.length} recent | Connections: ${connections.length} | Followers: ${followersCount}
Achievements: ${achievements.length} unlocked

=== EMAIL INTELLIGENCE ===
Recent: ${recentEmails.length} | Unread: ${recentEmails.filter((e: any) => !e.is_read).length} | Action Required: ${recentEmails.filter((e: any) => e.inbox_type === 'action').length}
High Priority:
${recentEmails.filter((e: any) => e.ai_priority_score && e.ai_priority_score >= 70).slice(0, 3).map((email: any) => `- From: ${email.from_name || email.from_email} | ${email.subject?.substring(0, 60)} | ${email.is_read ? 'Read' : 'UNREAD'}`).join('\n') || 'No high-priority emails'}

=== CALENDAR & MEETINGS ===
Upcoming (${upcomingMeetings.length}):
${upcomingMeetings.slice(0, 5).map((m: any) => `- ${m.title} | ${new Date(m.start_time).toLocaleString()} | ${m.location || m.meeting_url || 'TBD'}`).join('\n') || 'No upcoming meetings'}

Recent (${recentMeetings.length}):
${recentMeetings.slice(0, 3).map((m: any) => `- ${m.title} (${new Date(m.start_time).toLocaleDateString()})${m.ai_summary ? ` | ${m.ai_summary.substring(0, 80)}...` : ''}`).join('\n') || 'No recent meetings'}

=== RELATIONSHIP HEALTH ===
At-Risk: ${relationshipAlerts.length} relationships
${relationshipAlerts.slice(0, 3).map((r: any) => `- Risk ${r.risk_level?.toUpperCase()}: ${r.days_since_contact} days since contact`).join('\n') || 'All healthy'}

=== COMMUNICATIONS SUMMARY ===
Recent WhatsApp: ${recentWhatsApp.length} | Recent SMS: ${recentSMS.length} | Unified Timeline: ${unifiedTimeline.length} entries
Company Interactions: ${companyInteractions.length} | External Imports: ${externalImports.length}

${careerBrainContext}`;

  // Role-based enrichment
  const userRoles = (roles || []).map((r: any) => r.role);
  const isAdmin = userRoles.includes('admin');
  const isStrategist = userRoles.includes('strategist');
  const isPartner = userRoles.includes('partner');
  const companyId = companyData?.id;

  if (isAdmin || isStrategist) {
    userContext += await buildAdminContext(supabase, userId);
  } else if (isPartner && companyId) {
    userContext += await buildPartnerContext(supabase, companyId);
  } else {
    // Candidate: add salary benchmarks
    const { data: salaryBenchmarks } = await supabase
      .from('salary_benchmarks').select('role_title, location, salary_min, salary_max, currency').limit(5);
    if (salaryBenchmarks && salaryBenchmarks.length > 0) {
      userContext += `\n=== SALARY BENCHMARKS ===\n${salaryBenchmarks.map((b: any) => `- ${b.role_title} (${b.location || 'Global'}): ${b.currency || '€'}${b.salary_min?.toLocaleString() || 'N/A'} – ${b.salary_max?.toLocaleString() || 'N/A'}`).join('\n')}\n`;
    }
  }

  return { userContext, careerBrainContext, conversationHistory, upcomingInterviews, urgentTasks, activeApplicationsWithStages };
}

async function buildAdminContext(supabase: ReturnType<typeof createClient>, userId = 'global'): Promise<string> {
  // 5-minute in-memory cache: skip 12 DB queries + 1,500–3,000 tokens on cache hit
  const cached = adminContextCache.get(userId);
  if (cached && Date.now() - cached.ts < ADMIN_CACHE_TTL_MS) {
    return cached.context;
  }
  const [
    placementFeesRes, moneybirdMetricsRes,
    crmProspectsRes, candidateProfilesRes, kpiMetricsRes,
    allJobsRes, allApplicationsRes, platformStatsRes, candidateOffersRes,
    candidateShortlistsRes, candidateScorecardsRes, interviewFeedbackRes,
  ] = await Promise.all([
    // Fees: 20 (down from 50)
    supabase.from('placement_fees').select('status, fee_amount, jobs(title), companies:partner_company_id(name)').order('created_at', { ascending: false }).limit(20),
    // Moneybird: only latest metrics row (skip 100 individual invoices)
    supabase.from('moneybird_financial_metrics').select('*').order('created_at', { ascending: false }).limit(1),
    // CRM: 20 (down from 50)
    supabase.from('crm_prospects').select('stage, deal_value, company_name, contact_name').order('created_at', { ascending: false }).limit(20),
    // Candidates: 30, fewer fields (down from 100)
    supabase.from('candidate_profiles').select('full_name, talent_tier, availability_status').order('last_activity_at', { ascending: false }).limit(30),
    supabase.from('kpi_metrics').select('kpi_name, value').order('created_at', { ascending: false }).limit(20),
    supabase.from('jobs').select('id, title, status, location, salary_min, salary_max, currency, job_fee_type, job_fee_percentage, job_fee_fixed, deal_value_override, companies:company_id(name)').order('created_at', { ascending: false }).limit(30),
    // Applications: 50 (down from 200)
    supabase.from('applications').select('id, position, company_name, status, current_stage_index, job_id').order('created_at', { ascending: false }).limit(50),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('candidate_offers').select('id, job_id, status, total_compensation, sent_at').order('sent_at', { ascending: false }).limit(20),
    supabase.from('candidate_shortlists').select('id, job_id, priority').order('created_at', { ascending: false }).limit(20),
    supabase.from('candidate_scorecards').select('overall_rating, recommendation').order('submitted_at', { ascending: false }).limit(20),
    supabase.from('interview_feedback').select('overall_rating, recommendation, status').order('submitted_at', { ascending: false }).limit(20),
  ]);

  const placementFees = placementFeesRes.data || [];
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
  const appsByJob: Record<string, number> = {};
  allApps.forEach((a: any) => { if (a.job_id) { appsByJob[a.job_id] = (appsByJob[a.job_id] || 0) + 1; } });
  const calcFee = (j: any): string => {
    if (j.deal_value_override) return `€${j.deal_value_override.toLocaleString()} (override)`;
    if (j.job_fee_type === 'fixed' && j.job_fee_fixed) return `€${j.job_fee_fixed.toLocaleString()} (fixed)`;
    const salaryBase = j.salary_max || j.salary_min || 0; const pct = j.job_fee_percentage || 20;
    if (salaryBase > 0) return `${pct}% (~€${Math.round(salaryBase * pct / 100).toLocaleString()})`;
    return 'N/A';
  };
  let totalRating = 0; let ratedCount = 0;
  candidateScorecards.forEach((sc: any) => {
    if (sc.overall_rating) { totalRating += sc.overall_rating; ratedCount++; }
  });

  const adminCtx = `

=== ADMIN: FINANCIAL & REVENUE DATA ===
PLACEMENT FEES (${placementFees.length}):
${Object.entries(feesByStatus).map(([status, data]) => `  ${status}: ${data.count} fees, total €${data.total.toLocaleString()}`).join('\n')}
MONEYBIRD: ${moneybirdMetrics ? `Revenue €${moneybirdMetrics.total_revenue || 0}, Outstanding €${moneybirdMetrics.total_outstanding || 0}` : 'No metrics'}
CRM (${crmProspects.length}): ${Object.entries(crmByStage).map(([s, d]) => `${s}: ${d.count} (€${d.dealValue.toLocaleString()})`).join(', ')}
=== END ADMIN FINANCIAL ===

=== ADMIN: TALENT POOL ===
Total Candidates: ${candidateProfiles.length}
By Tier: ${['hot', 'warm', 'strategic', 'pool', 'dormant'].map(t => `${t}: ${candidateProfiles.filter((c: any) => c.talent_tier === t).length}`).join(', ')}
Top 10: ${candidateProfiles.slice(0, 10).map((c: any) => `${c.full_name} (${c.talent_tier})`).join(', ')}
=== END ADMIN TALENT ===

=== ADMIN: PLATFORM KPIs ===
Users: ${totalUsers} | Active Jobs: ${allJobs.filter((j: any) => j.status === 'published').length}/${allJobs.length} | Applications: ${allApps.length}
Offers: ${candidateOffers.length} | Shortlists: ${candidateShortlists.length} | Scorecards: ${candidateScorecards.length} (avg ${ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 'N/A'}/5) | Interview Feedback: ${interviewFeedback.length}
KPIs: ${kpiMetrics.slice(0, 10).map((k: any) => `${k.kpi_name}: ${k.value}`).join(', ')}
=== END ADMIN KPIs ===

=== ADMIN: JOBS PIPELINE ===
${allJobs.slice(0, 15).map((j: any) => {
  const co = Array.isArray(j.companies) ? j.companies[0] : j.companies;
  const jobAppCount = appsByJob[j.id] || 0;
  return `- ${j.title} @ ${co?.name || 'N/A'} (${j.status}) | Apps: ${jobAppCount} | Fee: ${calcFee(j)}`;
}).join('\n')}
=== END ADMIN JOBS ===
`;

  // Cache for 5 minutes — skips 12 DB queries + 1,500–3,000 tokens on subsequent messages
  adminContextCache.set(userId, { context: adminCtx, ts: Date.now() });
  return adminCtx;
}

async function buildPartnerContext(supabase: ReturnType<typeof createClient>, companyId: string): Promise<string> {
  const [
    companyJobsRes, companyFeesRes, companyMembersRes,
    companyShortlistsRes, companyFeedbackRes,
  ] = await Promise.all([
    supabase.from('jobs').select('id, title, status, location, club_sync_status').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
    supabase.from('placement_fees').select('candidate_name, fee_amount, status').eq('partner_company_id', companyId).order('created_at', { ascending: false }).limit(10),
    supabase.from('company_members').select('role, is_active, job_title, profiles!inner(full_name)').eq('company_id', companyId).eq('is_active', true),
    supabase.from('candidate_shortlists').select('job_id, priority').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20),
    supabase.from('interview_feedback').select('overall_rating, recommendation, status').order('submitted_at', { ascending: false }).limit(20),
  ]);

  const companyJobs = companyJobsRes.data || [];
  const companyFees = companyFeesRes.data || [];
  const companyTeam = companyMembersRes.data || [];

  return `

=== PARTNER: COMPANY PIPELINE ===
Jobs (${companyJobs.filter((j: any) => j.status === 'published').length} active / ${companyJobs.length} total):
${companyJobs.slice(0, 10).map((j: any) => `- ${j.title} (${j.status}) | Club Sync: ${j.club_sync_status || 'N/A'}`).join('\n')}
=== END PARTNER PIPELINE ===

=== PARTNER: FINANCIALS ===
Fees: ${companyFees.length}
${companyFees.slice(0, 5).map((f: any) => `- ${f.candidate_name || 'N/A'}: €${f.fee_amount || 0} (${f.status})`).join('\n')}
=== END PARTNER FINANCIALS ===

=== PARTNER: TEAM (${companyTeam.length} members) ===
${companyTeam.slice(0, 10).map((m: any) => { const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles; return `- ${profile?.full_name || 'N/A'} (${m.role || 'Member'})${m.job_title ? ` - ${m.job_title}` : ''}`; }).join('\n')}
=== END PARTNER TEAM ===

=== PARTNER: HIRING ACTIVITY ===
Shortlists: ${companyShortlistsRes.data?.length || 0} | Feedback: ${companyFeedbackRes.data?.length || 0}
=== END PARTNER HIRING ===
`;
}
