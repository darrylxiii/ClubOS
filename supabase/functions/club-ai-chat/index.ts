import { createHandler } from '../_shared/handler.ts';
import { allAITools, executeToolCall } from '../_shared/ai-tools.ts';
import { buildUserContext } from '../_shared/context-builder.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { messages, userId, conversationId, images, documents, selectedModel: clientSelectedModel } = await req.json() as {
    messages: Record<string, unknown>[];
    userId?: string;
    conversationId?: string;
    images?: string[];
    documents?: Array<{ name: string; type: string; content: string }>;
    selectedModel?: string;
  };

  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");

  // Build user context via shared module (keeps this file small)
  const { userContext, careerBrainContext, conversationHistory, upcomingInterviews, urgentTasks, activeApplicationsWithStages } =
    await buildUserContext(ctx.supabase, userId, conversationId);

  // Detect interaction mode
  let mode = "normal";
  let cleanedMessages = [...messages];
  const lastUserMessage = messages.filter((m: Record<string, unknown>) => m.role === "user").pop();

  if (lastUserMessage && typeof lastUserMessage.content === "string") {
    if (lastUserMessage.content.startsWith("[Search:")) {
      mode = "search";
      cleanedMessages = messages.map((m: Record<string, unknown>) => m === lastUserMessage ? { ...m, content: (m.content as string).replace(/^\[Search:\s*/, "").replace(/\]$/, "") } : m);
    } else if (lastUserMessage.content.startsWith("[Think:")) {
      mode = "think";
      cleanedMessages = messages.map((m: Record<string, unknown>) => m === lastUserMessage ? { ...m, content: (m.content as string).replace(/^\[Think:\s*/, "").replace(/\]$/, "") } : m);
    } else if (lastUserMessage.content.startsWith("[Canvas:")) {
      mode = "canvas";
      cleanedMessages = messages.map((m: Record<string, unknown>) => m === lastUserMessage ? { ...m, content: (m.content as string).replace(/^\[Canvas:\s*/, "").replace(/\]$/, "") } : m);
    }
  }

  // Truncate to last 15 messages
  if (cleanedMessages.length > 15) {
    cleanedMessages = cleanedMessages.slice(-15);
  }

  // Fetch user roles for tool gating
  const userRolesForGating = userId
    ? (await ctx.supabase.from('user_roles').select('role').eq('user_id', userId)).data?.map((r: Record<string, unknown>) => r.role as string) || []
    : [];
  const isAdminUser = userRolesForGating.includes('admin') || userRolesForGating.includes('strategist');
  const isPartnerUser = userRolesForGating.includes('partner');

  // Role-based tool filtering
  const candidateExcludedTools = ['search_talent_pool', 'get_candidate_move_probability', 'get_candidates_needing_attention', 'log_candidate_touchpoint', 'update_candidate_tier', 'search_communications', 'get_entity_communication_summary', 'get_relationship_health'];
  const partnerExcludedTools = ['search_talent_pool', 'apply_to_job', 'generate_cover_letter', 'update_candidate_tier', 'get_candidate_move_probability'];

  let filteredAITools = allAITools;
  if (!isAdminUser && !isPartnerUser) {
    filteredAITools = allAITools.filter((t: Record<string, unknown>) => !candidateExcludedTools.includes((t.function as Record<string, unknown>)?.name as string));
  } else if (isPartnerUser && !isAdminUser) {
    filteredAITools = allAITools.filter((t: Record<string, unknown>) => !partnerExcludedTools.includes((t.function as Record<string, unknown>)?.name as string));
  }

  const baseTools = [{ type: "function", function: { name: "navigate_to_page", description: "Navigate to a page in the app.", parameters: { type: "object", properties: { path: { type: "string" }, reason: { type: "string" } }, required: ["path", "reason"] } } }];

  // Intent-based tool filtering: only expand tool set when message signals specific intent
  const lastMsgText = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content.toLowerCase() : '';
  const wantsCalendar = /schedule|meeting|book|calendar|slot|reschedule|cancel meet/.test(lastMsgText);
  const wantsMessaging = /\bemail|message|draft|send|follow.?up|reply\b/.test(lastMsgText);
  const wantsSearch = mode === "search";
  const wantsJobs = /job|apply|opportunit|position|role|vacancy/.test(lastMsgText);
  const wantsTalent = isAdminUser && /candidate|talent|pool|source|shortlist/.test(lastMsgText);
  const wantsTasks = /task|todo|remind|priority|workload|deadline/.test(lastMsgText);

  // Core default tools always sent (4 tools, ~600 tokens)
  const CORE_TOOL_NAMES = new Set(['search_jobs', 'create_task', 'search_talent_pool', 'navigate_to_page']);
  // Conditionally expand based on intent
  const CALENDAR_TOOL_NAMES = new Set(['schedule_meeting', 'find_free_slots', 'check_meeting_conflicts', 'reschedule_meeting', 'cancel_meeting', 'create_booking_link', 'suggest_meeting_times']);
  const MESSAGING_TOOL_NAMES = new Set(['draft_message', 'send_message', 'schedule_follow_up', 'analyze_conversation_sentiment']);
  const JOB_TOOL_NAMES = new Set(['analyze_job_fit', 'apply_to_job', 'generate_cover_letter', 'generate_interview_questions', 'research_company', 'create_interview_briefing']);
  const TALENT_TOOL_NAMES = new Set(['get_candidate_move_probability', 'get_candidates_needing_attention', 'log_candidate_touchpoint', 'update_candidate_tier', 'search_communications', 'get_entity_communication_summary', 'get_relationship_health']);
  const TASK_TOOL_NAMES = new Set(['bulk_create_tasks', 'reschedule_tasks', 'suggest_next_task', 'analyze_task_load']);

  const intentFilteredTools = filteredAITools.filter((t: Record<string, unknown>) => {
    const name = (t.function as Record<string, unknown>)?.name as string;
    if (CORE_TOOL_NAMES.has(name)) return true;
    if (wantsCalendar && CALENDAR_TOOL_NAMES.has(name)) return true;
    if (wantsMessaging && MESSAGING_TOOL_NAMES.has(name)) return true;
    if ((wantsJobs || wantsCalendar) && JOB_TOOL_NAMES.has(name)) return true;
    if (wantsTalent && TALENT_TOOL_NAMES.has(name)) return true;
    if (wantsTasks && TASK_TOOL_NAMES.has(name)) return true;
    return false;
  });

  const searchTools = wantsSearch ? [{ type: "function", function: { name: "web_search", description: "Search web for current info.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }] : [];
  const tools = [...baseTools, ...searchTools, ...intentFilteredTools];

  // Model selection
  let selectedModel = 'gemini-2.5-flash-lite';
  if (clientSelectedModel === 'gemini-2.5-pro') selectedModel = 'gemini-2.5-pro';
  else if (clientSelectedModel === 'gemini-2.5-flash') selectedModel = 'gemini-2.5-flash';
  else if (clientSelectedModel === 'gemini-2.5-pro') selectedModel = 'gemini-2.5-pro';
  else if (clientSelectedModel === 'gemini-2.5-flash') selectedModel = 'gemini-2.5-flash';

  if (mode === "think") selectedModel = "gemini-2.5-pro";

  const roleInstruction = isAdminUser
    ? `You are speaking with an ADMIN/STRATEGIST. You have FULL platform data access: financial, talent, pipeline, CRM, partner, operations.`
    : isPartnerUser
    ? `You are speaking with a PARTNER. You have company-scoped data. Be professional and data-driven.`
    : `You are speaking with a CANDIDATE. Be supportive, encouraging, and actionable.`;

  let systemPrompt = `You are Club AI, an in-app copilot for The Quantum Club. Provide professional, highly actionable, and deeply human guidance based on all available in-app information. Powered by QUIN.

CRITICAL: YOU HAVE DIRECT ACCESS TO ALL USER DATA PROVIDED IN THE CONTEXT BELOW. Use it. Never say "I don't have access" when data is present.

RESPONSE FORMAT: Use clear structured Markdown. Bullet lists over walls of text. Short paragraphs. Bold only critical terms. For sensitive actions, show <button>Confirm</button>.

ROLE: ${roleInstruction}

${conversationHistory}

${userContext}`;

  if (mode === "search") systemPrompt += `\n\nSEARCH MODE ACTIVE: Use the web_search tool to find current information. Cite sources.`;
  else if (mode === "think") systemPrompt += `\n\nDEEP THINK MODE ACTIVE: Reason step-by-step. Show your logic. Be comprehensive.`;
  else if (mode === "canvas") systemPrompt += `\n\nCANVAS MODE ACTIVE: Think like a creative collaborator and technical architect.`;

  // Handle images and documents
  let formattedMessages: Record<string, unknown>[] = cleanedMessages;
  let documentContext = "";
  if (documents && documents.length > 0) {
    documentContext = `\n\n**Attached Documents:** ${documents.map((d) => d.name).join(', ')}`;
  }
  if (images && images.length > 0) {
    formattedMessages = cleanedMessages.map((msg: Record<string, unknown>, idx: number) => {
      if (idx === cleanedMessages.length - 1 && msg.role === "user") {
        return { ...msg, content: [{ type: "text", text: msg.content }, ...images.map((imageData: string) => ({ type: "image_url", image_url: { url: imageData } }))] };
      }
      return msg;
    });
  } else if (documents && documents.length > 0) {
    formattedMessages = cleanedMessages.map((msg: Record<string, unknown>, idx: number) => {
      if (idx === cleanedMessages.length - 1 && msg.role === "user") return { ...msg, content: msg.content + documentContext };
      return msg;
    });
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GOOGLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedModel,
      messages: [{ role: "system", content: systemPrompt + (documentContext || "") }, ...formattedMessages],
      tools,
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402) return new Response(JSON.stringify({ error: "API quota exceeded. Please check your Google API billing." }), { status: 402, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } });
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } });
  }

  const [streamForClient, streamForSaving] = response.body!.tee();

  // Background save
  const savePromise = (async () => {
    const reader = streamForSaving.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    const toolCalls: Record<string, unknown>[] = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) fullResponse += delta.content;
              if (delta?.tool_calls) toolCalls.push(...delta.tool_calls);
            } catch (_e) { /* skip */ }
          }
        }
      }

      const newMessages = [...cleanedMessages, { role: "assistant", content: fullResponse, timestamp: new Date().toISOString(), model: selectedModel, mode, tool_calls: toolCalls.length > 0 ? toolCalls : undefined }];
      const contextMeta = { model: selectedModel, mode, images_sent: images?.length || 0, documents_sent: documents?.length || 0, last_interaction: new Date().toISOString() };

      if (conversationId) {
        await ctx.supabase.from("ai_conversations").update({ messages: newMessages, context: contextMeta, updated_at: new Date().toISOString() }).eq("id", conversationId);
      } else if (userId) {
        await ctx.supabase.from("ai_conversations").insert({ user_id: userId, conversation_type: "club_ai", messages: newMessages, context: { ...contextMeta, first_interaction: new Date().toISOString() } });
      }
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  })();

  savePromise.catch(err => console.error("Background save error:", err));

  return new Response(streamForClient, { headers: { ...ctx.corsHeaders, "Content-Type": "text/event-stream" } });
}));
