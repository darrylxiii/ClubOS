interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleExtractCommunicationTasks({ supabase, payload }: ActionContext) {
    const { source_table, source_id, batch_mode } = payload;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
    }

    // If batch mode, process pending queue items
    if (batch_mode) {
        const { data: queueItems, error: queueError } = await supabase
            .from("communication_task_queue")
            .select("*")
            .eq("processing_status", "pending")
            .order("priority", { ascending: false })
            .order("created_at", { ascending: true })
            .limit(10);

        if (queueError) throw new Error(`Queue fetch error: ${queueError.message}`);

        const results = [];
        for (const item of queueItems || []) {
            // Mark as processing
            await supabase
                .from("communication_task_queue")
                .update({ processing_status: "processing" })
                .eq("id", item.id);

            try {
                const result = await processMessage(supabase, LOVABLE_API_KEY, item.source_table, item.source_id);
                await supabase
                    .from("communication_task_queue")
                    .update({
                        processing_status: "completed",
                        result,
                        processed_at: new Date().toISOString()
                    })
                    .eq("id", item.id);
                results.push({ id: item.id, success: true, result });
            } catch (err) {
                await supabase
                    .from("communication_task_queue")
                    .update({
                        processing_status: "failed",
                        error_message: err instanceof Error ? err.message : "Unknown error",
                        processed_at: new Date().toISOString()
                    })
                    .eq("id", item.id);
                results.push({ id: item.id, success: false, error: err instanceof Error ? err.message : "Unknown" });
            }
        }

        return { processed: results.length, results };
    }

    // Single message processing
    if (!source_table || !source_id) {
        throw new Error("source_table and source_id required");
    }

    const result = await processMessage(supabase, LOVABLE_API_KEY, source_table, source_id);
    return result;
}

async function processMessage(supabase: any, apiKey: string, sourceTable: string, sourceId: string) {
    // Fetch the message based on source
    let message: any = null;
    let context: any = {};

    if (sourceTable === "whatsapp_messages") {
        const { data } = await supabase
            .from("whatsapp_messages")
            .select(`
        *,
        conversation:whatsapp_conversations(
          contact_name, contact_phone, candidate_id, prospect_id, company_id, assigned_to
        )
      `)
            .eq("id", sourceId)
            .single();
        message = data;

        if (message?.conversation) {
            const conv = message.conversation;
            context = {
                contact_name: conv.contact_name,
                candidate_id: conv.candidate_id,
                prospect_id: conv.prospect_id,
                company_id: conv.company_id,
                assigned_to: conv.assigned_to,
                channel: "whatsapp"
            };
        }
    } else if (sourceTable === "sms_messages") {
        const { data } = await supabase
            .from("sms_messages")
            .select("*")
            .eq("id", sourceId)
            .single();
        message = data;
        context = {
            candidate_id: message?.candidate_id,
            prospect_id: message?.prospect_id,
            company_id: message?.company_id,
            owner_id: message?.owner_id,
            channel: "sms"
        };
    } else if (sourceTable === "company_interactions") {
        const { data } = await supabase
            .from("company_interactions")
            .select("*, companies(name)")
            .eq("id", sourceId)
            .single();
        message = data;
        context = {
            company_id: message?.company_id,
            company_name: message?.companies?.name,
            owner_id: message?.user_id,
            channel: message?.interaction_type
        };
    }

    if (!message) {
        throw new Error(`Message not found: ${sourceTable}/${sourceId}`);
    }

    // Extract content
    const content = message.content || message.summary || message.notes || "";
    if (!content || content.length < 10) {
        return { tasks: [], reason: "Content too short for task extraction" };
    }

    // Call AI to extract tasks
    const prompt = `Analyze this ${context.channel || sourceTable} communication and extract any action items or follow-ups needed.

Communication:
"${content}"

Context:
- Channel: ${context.channel || sourceTable}
- Contact: ${context.contact_name || "Unknown"}
- Direction: ${message.direction || "unknown"}
- Sentiment: ${message.sentiment_score || "neutral"}
- Intent: ${message.intent_classification || "general"}

For each action item, determine:
1. Task title (concise, actionable, starts with verb)
2. Priority (high/medium/low based on urgency and sentiment)
3. Category (follow_up, request, complaint, question, scheduling, documentation)
4. Due date suggestion (today, tomorrow, this_week, next_week, or null if unclear)
5. Brief reason why this needs action

Return JSON with structure:
{
  "tasks": [
    {
      "title": "...",
      "priority": "high|medium|low",
      "category": "...",
      "suggested_due": "today|tomorrow|this_week|next_week|null",
      "reason": "..."
    }
  ],
  "has_actionable_items": true/false
}

If no clear action items, return empty tasks array with has_actionable_items: false.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
                { role: "system", content: "You are a task extraction assistant. Extract actionable items from communications. Return valid JSON only." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3,
        }),
    });

    if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "{}";

    // Parse AI response
    let extractedTasks: any;
    try {
        // Clean up potential markdown
        const jsonStr = aiContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        extractedTasks = JSON.parse(jsonStr);
    } catch {
        return { tasks: [], reason: "Failed to parse AI response" };
    }

    if (!extractedTasks.has_actionable_items || !extractedTasks.tasks?.length) {
        return { tasks: [], reason: "No actionable items found" };
    }

    // Determine task owner
    let ownerId = context.assigned_to || context.owner_id;

    // If no owner, try to find the strategist for the candidate/company
    if (!ownerId && context.candidate_id) {
        const { data: candidate } = await supabase
            .from("candidate_profiles")
            .select("strategist_id")
            .eq("id", context.candidate_id)
            .single();
        ownerId = candidate?.strategist_id;
    }

    // Calculate due dates
    const now = new Date();
    const dueDateMap: Record<string, Date> = {
        today: now,
        tomorrow: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        this_week: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        next_week: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
    };

    // Create tasks
    const createdTasks = [];
    for (const task of extractedTasks.tasks) {
        const dueDate = task.suggested_due && dueDateMap[task.suggested_due]
            ? dueDateMap[task.suggested_due].toISOString()
            : null;

        const { data: newTask, error } = await supabase
            .from("pilot_tasks")
            .insert({
                title: task.title,
                description: `Auto-extracted from ${context.channel || sourceTable} message.\n\nReason: ${task.reason}`,
                task_type: "communication_followup",
                priority: task.priority,
                status: "pending",
                due_date: dueDate,
                user_id: ownerId,
                entity_type: context.candidate_id ? "candidate" : context.company_id ? "company" : context.prospect_id ? "prospect" : null,
                entity_id: context.candidate_id || context.company_id || context.prospect_id,
                source: sourceTable,
                source_id: sourceId,
                metadata: {
                    category: task.category,
                    auto_generated: true,
                    channel: context.channel,
                    original_content: content.substring(0, 200),
                }
            })
            .select()
            .single();

        if (!error) {
            createdTasks.push(newTask);
        }
    }

    // Log to activity feed
    if (createdTasks.length > 0) {
        await supabase.from("activity_feed").insert({
            event_type: "tasks_auto_generated",
            user_id: ownerId,
            company_id: context.company_id,
            event_data: {
                source_table: sourceTable,
                source_id: sourceId,
                tasks_created: createdTasks.length,
                task_ids: createdTasks.map(t => t.id),
            },
            visibility: "internal"
        });
    }

    return {
        tasks: createdTasks,
        extracted_count: extractedTasks.tasks.length,
        created_count: createdTasks.length,
    };
}
