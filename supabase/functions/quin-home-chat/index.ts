import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { fetchUserContext, buildCompactContextString } from "../_shared/user-context-fetcher.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Role priority for determining primary context
const ROLE_PRIORITY = ['admin', 'strategist', 'partner', 'user'];

function getHighestRole(roles: string[]): string {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return 'user';
}

// ===== ROLE-SPECIFIC CONTEXT FETCHERS =====

async function fetchPartnerContext(supabase: any, userId: string, companyId: string) {
  const [
    companyResult,
    jobsResult,
    applicationsResult,
    teamResult,
    bookingsResult,
    dealsResult,
  ] = await Promise.all([
    supabase.from('companies').select('id, name, industry, company_size, headquarters_location, mission, culture_highlights, tech_stack, benefits').eq('id', companyId).single(),
    supabase.from('jobs').select('id, title, location, employment_type, is_active, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(15),
    supabase.from('applications').select('id, position, company_name, status, current_stage_index, stages, user_id, created_at').eq('company_name', '').limit(0), // Will be fetched via jobs
    supabase.from('company_members').select('user_id, role, is_active, profiles(full_name, email, current_title)').eq('company_id', companyId).eq('is_active', true).limit(20),
    supabase.from('bookings').select('id, status, scheduled_start, booking_links(title)').gte('scheduled_start', new Date().toISOString()).order('scheduled_start', { ascending: true }).limit(10),
    supabase.from('deal_pipeline').select('id, deal_name, stage, deal_value, probability, expected_close_date').eq('company_id', companyId).order('created_at', { ascending: false }).limit(10),
  ]);

  // Fetch applications to company jobs
  const jobIds = (jobsResult.data || []).map((j: any) => j.id);
  let companyApplications: any[] = [];
  if (jobIds.length > 0) {
    const { data } = await supabase
      .from('applications')
      .select('id, position, company_name, status, current_stage_index, stages, created_at, profiles:user_id(full_name)')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false })
      .limit(20);
    companyApplications = data || [];
  }

  // Fetch relationship health for company
  const { data: relationships } = await supabase
    .from('communication_relationship_scores')
    .select('*')
    .eq('entity_type', 'company')
    .eq('entity_id', companyId)
    .limit(5);

  const activeJobs = (jobsResult.data || []).filter((j: any) => j.is_active);
  const pipelineByStage: Record<string, number> = {};
  companyApplications.forEach((app: any) => {
    const stage = app.stages?.[app.current_stage_index]?.name || 'Unknown';
    pipelineByStage[stage] = (pipelineByStage[stage] || 0) + 1;
  });

  return `
=== PARTNER CONTEXT (Company: ${companyResult.data?.name || 'Unknown'}) ===

COMPANY PROFILE:
Industry: ${companyResult.data?.industry || 'N/A'} | Size: ${companyResult.data?.company_size || 'N/A'}
Location: ${companyResult.data?.headquarters_location || 'N/A'}
Mission: ${companyResult.data?.mission || 'N/A'}
Culture: ${JSON.stringify(companyResult.data?.culture_highlights || []).substring(0, 200)}
Tech Stack: ${JSON.stringify(companyResult.data?.tech_stack || []).substring(0, 200)}

ACTIVE JOBS (${activeJobs.length}):
${activeJobs.slice(0, 10).map((j: any) => `• ${j.title} (${j.location || 'Remote'})`).join('\n') || 'No active jobs'}

HIRING PIPELINE:
${Object.entries(pipelineByStage).map(([stage, count]) => `• ${stage}: ${count} candidates`).join('\n') || 'No active pipeline'}

RECENT APPLICATIONS (${companyApplications.length}):
${companyApplications.slice(0, 10).map((a: any) => {
  const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
  return `• ${profile?.full_name || 'Unknown'} → ${a.position} (${a.status})`;
}).join('\n') || 'No applications'}

TEAM (${(teamResult.data || []).length} members):
${(teamResult.data || []).slice(0, 10).map((m: any) => {
  const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
  return `• ${p?.full_name || 'Unknown'} - ${m.role}`;
}).join('\n') || 'No team members'}

DEAL PIPELINE:
${(dealsResult.data || []).map((d: any) => `• ${d.deal_name}: ${d.stage} (€${d.deal_value || 0}) - ${d.probability || 0}%`).join('\n') || 'No deals'}

UPCOMING INTERVIEWS:
${(bookingsResult.data || []).slice(0, 5).map((b: any) => {
  const link = Array.isArray(b.booking_links) ? b.booking_links[0] : b.booking_links;
  return `• ${link?.title || 'Meeting'} - ${new Date(b.scheduled_start).toLocaleString()}`;
}).join('\n') || 'None scheduled'}

RELATIONSHIP HEALTH:
${(relationships || []).map((r: any) => `• Risk: ${r.risk_level} - ${r.days_since_contact} days since contact`).join('\n') || 'All healthy'}
`;
}

async function fetchAdminContext(supabase: any) {
  const [
    userCountResult,
    companyCountResult,
    activeJobsResult,
    recentApplicationsResult,
    revenueResult,
    crmResult,
    systemHealthResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('applications').select('status').order('created_at', { ascending: false }).limit(100),
    supabase.from('deal_pipeline').select('deal_value, stage, probability').limit(50),
    supabase.from('crm_prospects').select('id, company_name, status, score, last_contact_at').order('score', { ascending: false }).limit(10),
    supabase.from('edge_function_metrics').select('function_name, avg_duration_ms, error_rate, invocation_count').order('invocation_count', { ascending: false }).limit(10),
  ]);

  // Application status breakdown
  const statusBreakdown: Record<string, number> = {};
  (recentApplicationsResult.data || []).forEach((a: any) => {
    statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1;
  });

  // Revenue calculation
  const totalPipeline = (revenueResult.data || []).reduce((sum: number, d: any) => sum + (d.deal_value || 0), 0);
  const weightedPipeline = (revenueResult.data || []).reduce((sum: number, d: any) => sum + ((d.deal_value || 0) * (d.probability || 0) / 100), 0);

  return `
=== ADMIN PLATFORM OVERVIEW ===

PLATFORM STATS:
• Total Users: ${userCountResult.count || 0}
• Total Companies: ${companyCountResult.count || 0}
• Active Jobs: ${activeJobsResult.count || 0}

APPLICATION PIPELINE (last 100):
${Object.entries(statusBreakdown).map(([status, count]) => `• ${status}: ${count}`).join('\n')}

REVENUE PIPELINE:
• Total Pipeline Value: €${totalPipeline.toLocaleString()}
• Weighted Pipeline: €${Math.round(weightedPipeline).toLocaleString()}
• Active Deals: ${(revenueResult.data || []).length}

TOP CRM PROSPECTS:
${(crmResult.data || []).slice(0, 5).map((p: any) => `• ${p.company_name} - Score: ${p.score || 0} (${p.status})`).join('\n') || 'No prospects'}

SYSTEM HEALTH:
${(systemHealthResult.data || []).slice(0, 5).map((m: any) => `• ${m.function_name}: ${m.avg_duration_ms}ms avg, ${(m.error_rate * 100).toFixed(1)}% errors, ${m.invocation_count} calls`).join('\n') || 'No metrics available'}
`;
}

// ===== ROLE-SPECIFIC SYSTEM PROMPTS =====

function getCandidateSystemPrompt() {
  return `You are QUIN, the personal career intelligence assistant for The Quantum Club. You are embedded directly on the user's home dashboard.

PERSONALITY: Supportive career advisor. Calm, discreet, competent. No exclamation points.
FOCUS: Upcoming interviews, application status, tasks, job discovery, profile optimization, interview prep.

PROACTIVE RULES:
- If the user has upcoming interviews → Offer prep help immediately
- If applications are stalled → Suggest follow-up actions  
- If tasks are urgent → Flag them and offer prioritization
- If profile is incomplete → Nudge completion with specific suggestions
- Always end with ONE clear next action

TONE: Warm but professional. Reference specific data points naturally.`;
}

function getPartnerSystemPrompt() {
  return `You are QUIN, the recruitment operations intelligence for The Quantum Club. You are the partner's strategic dashboard assistant.

PERSONALITY: Professional operations advisor. Data-driven, executive tone. No exclamation points.
FOCUS: Hiring pipeline, candidate pipeline, SLA tracking, team performance, deal pipeline, interview scheduling.

PROACTIVE RULES:
- If candidates need attention (stalled pipeline) → Flag them with specific names
- If SLAs are at risk → Alert with timeline
- If new applications arrived → Summarize quality and fit
- If deals are nearing close → Surface next steps
- Always include pipeline metrics in context

TONE: Executive briefing style. Concise, actionable, data-rich.`;
}

function getAdminSystemPrompt() {
  return `You are QUIN, the platform intelligence commander for The Quantum Club. You have full visibility across the entire platform.

PERSONALITY: Strategic analyst. Analytical, concise. No exclamation points.
FOCUS: Platform health, revenue trends, user engagement, system performance, CRM pipeline, partner engagement.

PROACTIVE RULES:
- If system errors are elevated → Alert immediately
- If revenue pipeline changed → Surface trends
- If user growth metrics shift → Provide analysis
- If partner engagement drops → Flag at-risk relationships
- Always provide one strategic recommendation

TONE: C-suite briefing style. Numbers first, context second, action third.`;
}

// ===== TOOL GATING BY ROLE =====

const CANDIDATE_TOOLS = [
  'search_jobs', 'analyze_job_fit', 'apply_to_job', 'generate_cover_letter',
  'create_task', 'suggest_next_task', 'analyze_task_load',
  'generate_interview_questions', 'research_company', 'create_interview_briefing',
  'draft_message', 'schedule_meeting', 'find_free_slots', 'check_meeting_conflicts',
  'navigate_to_page'
];

const PARTNER_TOOLS = [
  'create_task', 'suggest_next_task', 'analyze_task_load',
  'draft_message', 'schedule_meeting', 'find_free_slots', 'check_meeting_conflicts',
  'search_talent_pool', 'get_candidates_needing_attention', 'get_candidate_move_probability',
  'search_communications', 'get_entity_communication_summary', 'get_relationship_health',
  'log_candidate_touchpoint', 'navigate_to_page'
];

const ADMIN_TOOLS = [
  ...CANDIDATE_TOOLS, ...PARTNER_TOOLS,
  'reschedule_meeting', 'cancel_meeting', 'update_candidate_tier',
  'analyze_conversation_sentiment', 'reschedule_tasks', 'bulk_create_tasks'
];

function filterToolsByRole(allTools: any[], role: string): any[] {
  let allowedNames: string[];
  switch (role) {
    case 'admin': allowedNames = ADMIN_TOOLS; break;
    case 'strategist': allowedNames = ADMIN_TOOLS; break; // Strategists get admin-level tools
    case 'partner': allowedNames = PARTNER_TOOLS; break;
    default: allowedNames = CANDIDATE_TOOLS;
  }
  
  return allTools.filter(tool => allowedNames.includes(tool.function?.name));
}

// ===== ROLE-SPECIFIC QUICK SUGGESTIONS =====

function getQuickSuggestions(role: string): string {
  switch (role) {
    case 'admin':
    case 'strategist':
      return `\n\nSUGGESTED QUICK ACTIONS FOR ADMIN:
• "Platform health check" → System metrics overview
• "Revenue this month" → Pipeline and deals summary
• "Active searches overview" → All open positions and pipeline
• "At-risk relationships" → Companies/candidates needing attention`;
    case 'partner':
      return `\n\nSUGGESTED QUICK ACTIONS FOR PARTNER:
• "Pipeline summary" → Current hiring pipeline status
• "Who needs attention?" → Candidates requiring follow-up
• "Interview schedule today" → Today's interviews
• "Candidate recommendations" → Best-fit candidates for open roles`;
    default:
      return `\n\nSUGGESTED QUICK ACTIONS:
• "What should I do today?" → Prioritized action list
• "Prepare me for my next interview" → Interview prep
• "Find matching jobs" → Job recommendations
• "How is my profile?" → Profile strength analysis`;
  }
}

// ===== MAIN HANDLER =====

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify token
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const roles = (rolesData || []).map((r: any) => r.role);
    const primaryRole = getHighestRole(roles);

    console.log(`[quin-home-chat] User ${userId} | Role: ${primaryRole} | Roles: ${roles.join(',')}`);

    // Fetch user context (base context for all roles)
    const { userContext, aiMemory } = await fetchUserContext(supabase, userId);
    let baseContext = buildCompactContextString(userContext, aiMemory);

    // Add role-specific context
    let roleContext = '';
    if (primaryRole === 'partner' && userContext.company?.id) {
      roleContext = await fetchPartnerContext(supabase, userId, userContext.company.id);
    } else if (primaryRole === 'admin' || primaryRole === 'strategist') {
      roleContext = await fetchAdminContext(supabase);
      // Admins also get partner context if they have a company
      if (userContext.company?.id) {
        roleContext += await fetchPartnerContext(supabase, userId, userContext.company.id);
      }
    }

    // Get role-specific system prompt
    let systemPromptBase: string;
    switch (primaryRole) {
      case 'admin':
      case 'strategist':
        systemPromptBase = getAdminSystemPrompt();
        break;
      case 'partner':
        systemPromptBase = getPartnerSystemPrompt();
        break;
      default:
        systemPromptBase = getCandidateSystemPrompt();
    }

    const systemPrompt = `${systemPromptBase}

Current Date/Time: ${new Date().toISOString()}
User: ${userContext.profile?.full_name || 'Unknown'} (${primaryRole})

${baseContext}

${roleContext}

${getQuickSuggestions(primaryRole)}

📝 RESPONSE FORMATTING:
- Use clear, structured Markdown
- Keep responses concise (dashboard context, not full page)
- Use bullet lists for multi-point items
- Bold only the most critical terms
- Always end with ONE actionable next step
- Never use exclamation points`;

    // Get AI tools, filter by role
    const { allAITools, executeToolCall } = await import("../_shared/ai-tools.ts");
    
    const navigationTool = {
      type: "function",
      function: {
        name: "navigate_to_page",
        description: "Navigate the user to a specific page in The Quantum Club app.",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "The route path to navigate to" },
            reason: { type: "string", description: "Brief explanation" }
          },
          required: ["path", "reason"]
        }
      }
    };

    const roleFilteredTools = filterToolsByRole(allAITools, primaryRole);
    const tools = [navigationTool, ...roleFilteredTools];

    // Call AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tee stream for client + background save
    const [streamForClient, streamForSaving] = response.body!.tee();

    // Background save
    const savePromise = (async () => {
      try {
        const reader = streamForSaving.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) fullResponse += content;
            } catch {}
          }
        }

        const newMessages = [
          ...messages,
          { role: "assistant", content: fullResponse, timestamp: new Date().toISOString() }
        ];

        if (conversationId) {
          await supabase.from("ai_conversations").update({
            messages: newMessages,
            context: { source: 'quin_home', role: primaryRole },
            updated_at: new Date().toISOString()
          }).eq("id", conversationId);
        } else {
          await supabase.from("ai_conversations").insert({
            user_id: userId,
            conversation_type: "quin_home",
            messages: newMessages,
            context: { source: 'quin_home', role: primaryRole }
          });
        }
        console.log("✅ QUIN home conversation saved");
      } catch (e) {
        console.error("⚠️ Failed to save conversation:", e);
      }
    })();

    savePromise.catch(err => console.error("Background save error:", err));

    return new Response(streamForClient, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("quin-home-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
