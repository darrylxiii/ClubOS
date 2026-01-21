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
    const { import_id, step } = await req.json();

    if (!import_id) {
      throw new Error("import_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the import record
    const { data: importRecord, error: fetchError } = await supabase
      .from("external_context_imports")
      .select("*")
      .eq("id", import_id)
      .single();

    if (fetchError || !importRecord) {
      throw new Error("Import record not found");
    }

    console.log(`Processing import: ${importRecord.title} (${importRecord.content_type})`);

    // Step 1: Transcribe if audio/video
    if (importRecord.file_url && importRecord.content_type === "call_recording") {
      await supabase
        .from("external_context_imports")
        .update({ processing_status: "transcribing", transcription_status: "in_progress" })
        .eq("id", import_id);

      // For now, skip actual transcription - would need Whisper API integration
      // Mark as needing manual transcription or use existing raw_content
      await supabase
        .from("external_context_imports")
        .update({
          transcription_status: importRecord.raw_content ? "completed" : "pending_manual",
        })
        .eq("id", import_id);
    }

    // Step 2: Parse WhatsApp export if applicable
    if (importRecord.content_type === "whatsapp_export" && importRecord.raw_content) {
      const messages = parseWhatsAppExport(importRecord.raw_content);
      await supabase
        .from("external_context_imports")
        .update({
          parsed_content: { messages, message_count: messages.length },
        })
        .eq("id", import_id);
    }

    // Step 3: AI Analysis
    await supabase
      .from("external_context_imports")
      .update({ processing_status: "analyzing", analysis_status: "in_progress" })
      .eq("id", import_id);

    const contentToAnalyze = importRecord.raw_content ||
      (importRecord.parsed_content?.messages?.map((m: any) => `${m.sender}: ${m.content}`).join("\n"));

    if (contentToAnalyze) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

      if (LOVABLE_API_KEY) {
        try {
          const analysisPrompt = `Analyze this ${importRecord.content_type.replace("_", " ")} content and extract:
1. A concise summary (max 200 words)
2. Action items or follow-ups needed (as a JSON array of strings)
3. Key topics discussed (as a JSON array of 3-5 topic strings)
4. Overall sentiment (-1 to 1 scale) and label (positive/neutral/negative)
5. Urgency level (low/normal/high/urgent)

Content to analyze:
${contentToAnalyze.substring(0, 8000)}

Respond in this exact JSON format:
{
  "summary": "...",
  "action_items": ["...", "..."],
  "key_topics": ["...", "..."],
  "sentiment_score": 0.5,
  "sentiment_label": "positive",
  "urgency_level": "normal"
}`;

          const aiResponse = await fetch("https://api.lovable.dev/ai/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: analysisPrompt }],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const responseText = aiData.choices?.[0]?.message?.content || "";

            // Parse JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0]);

              await supabase
                .from("external_context_imports")
                .update({
                  ai_summary: analysis.summary,
                  action_items: analysis.action_items || [],
                  key_topics: analysis.key_topics || [],
                  sentiment_score: analysis.sentiment_score,
                  sentiment_label: analysis.sentiment_label,
                  urgency_level: analysis.urgency_level || importRecord.urgency_level,
                  analysis_status: "completed",
                })
                .eq("id", import_id);
            }
          }
        } catch (aiError) {
          console.error("AI analysis error:", aiError);
        }
      }
    }

    // Step 4: Sync to unified_communications
    const communicationData = {
      source_table: "external_context_imports",
      source_id: import_id,
      entity_type: importRecord.entity_type,
      entity_id: importRecord.entity_id,
      channel: mapContentTypeToChannel(importRecord.content_type),
      direction: "inbound",
      subject: importRecord.title,
      content_preview: importRecord.ai_summary || importRecord.raw_content?.substring(0, 200),
      sentiment_score: importRecord.sentiment_score,
      original_timestamp: importRecord.original_date || importRecord.created_at,
      metadata: {
        content_type: importRecord.content_type,
        source_platform: importRecord.source_platform,
        duration_minutes: importRecord.duration_minutes,
        participants: importRecord.participants,
        linked_meeting_id: importRecord.metadata?.linked_meeting_id,
        linked_company_id: importRecord.metadata?.linked_company_id,
        linked_job_id: importRecord.metadata?.linked_job_id,
        secondary_entity: importRecord.secondary_entity_type ? {
          type: importRecord.secondary_entity_type,
          id: importRecord.secondary_entity_id,
        } : null,
      },
    };

    await supabase.from("unified_communications").upsert(communicationData, {
      onConflict: "source_table,source_id",
    });

    // Step 5: Create tasks from action items
    const actionItems = importRecord.action_items || [];
    if (actionItems.length > 0) {
      const tasks = actionItems.map((item: string) => ({
        title: item.substring(0, 100),
        description: `Auto-created from ${importRecord.content_type.replace("_", " ")}: ${importRecord.title}`,
        task_type: "communication_followup",
        priority: importRecord.urgency_level === "urgent" ? "high" : "medium",
        status: "pending",
        source_type: "external_import",
        source_id: import_id,
        metadata: {
          entity_type: importRecord.entity_type,
          entity_id: importRecord.entity_id,
          content_type: importRecord.content_type,
        },
      }));

      await supabase.from("pilot_tasks").insert(tasks);
    }

    // Step 6: Update relationship scores
    try {
      await supabase.functions.invoke("update-relationship-scores", {
        body: {
          entity_type: importRecord.entity_type,
          entity_id: importRecord.entity_id,
        },
      });
    } catch (e) {
      console.error("Failed to update relationship scores:", e);
    }

    // Step 7: Mark as completed
    await supabase
      .from("external_context_imports")
      .update({
        processing_status: "completed",
        analysis_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", import_id);

    // Step 8: Generate and Store Embeddings for RAG
    if (importRecord.ai_summary) {
      try {
        const embeddingContent = `Import: ${importRecord.title}
Type: ${importRecord.content_type}
Summary: ${importRecord.ai_summary}
Topics: ${(importRecord.key_topics || []).join(", ")}
Action Items: ${(actionItems || []).join(", ")}`;

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const embeddingResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "text-embedding-3-small",
              input: embeddingContent,
              encoding_format: "float"
            })
          });

          if (embeddingResp.ok) {
            const embeddingData = await embeddingResp.json();
            const embedding = embeddingData.data[0].embedding;

            await supabase.from("intelligence_embeddings").insert({
              entity_type: importRecord.entity_type,
              entity_id: importRecord.entity_id,
              content: embeddingContent,
              embedding: embedding,
              metadata: {
                source: "external_import",
                import_id: import_id,
                title: importRecord.title,
                original_date: importRecord.original_date,
                job_id: importRecord.metadata?.linked_job_id || (importRecord.secondary_entity_type === 'job' ? importRecord.secondary_entity_id : undefined),
                company_id: importRecord.metadata?.linked_company_id || (importRecord.secondary_entity_type === 'company' ? importRecord.secondary_entity_id : undefined),
                meeting_id: importRecord.metadata?.linked_meeting_id,
                secondary_entity_type: importRecord.secondary_entity_type,
                secondary_entity_id: importRecord.secondary_entity_id
              }
            });
            console.log("Successfully generated and stored embedding for import");
          } else {
            console.error("Failed to generate embedding:", await embeddingResp.text());
          }
        }
      } catch (embedError) {
        console.error("Embedding generation error:", embedError);
        // Don't fail the whole process if embedding fails, just log it
      }
    }

    // Log to activity feed
    await supabase.from("activity_feed").insert({
      event_type: "external_content_imported",
      event_data: {
        import_id,
        title: importRecord.title,
        content_type: importRecord.content_type,
        entity_type: importRecord.entity_type,
        entity_id: importRecord.entity_id,
        action_items_count: actionItems.length,
      },
      user_id: importRecord.uploaded_by,
      visibility: "internal",
    });

    return new Response(
      JSON.stringify({
        success: true,
        import_id,
        summary: importRecord.ai_summary,
        action_items_created: actionItems.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Process external import error:", error);

    // Update import with error status
    try {
      const { import_id } = await req.json();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from("external_context_imports")
        .update({
          processing_status: "failed",
          error_message: error.message,
        })
        .eq("id", import_id);
    } catch (e) {
      console.error("Failed to update error status:", e);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Parse WhatsApp export format
function parseWhatsAppExport(content: string): Array<{ timestamp: string; sender: string; content: string }> {
  const messages: Array<{ timestamp: string; sender: string; content: string }> = [];
  const lines = content.split("\n");

  // Common WhatsApp export format: [DD/MM/YYYY, HH:MM:SS] Sender: Message
  const regex = /\[?(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]?\s*-?\s*([^:]+):\s*(.+)/i;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      messages.push({
        timestamp: `${match[1]} ${match[2]}`,
        sender: match[3].trim(),
        content: match[4].trim(),
      });
    }
  }

  return messages;
}

// Helper: Map content type to communication channel
function mapContentTypeToChannel(contentType: string): string {
  const mapping: Record<string, string> = {
    call_recording: "phone",
    whatsapp_export: "whatsapp",
    linkedin_export: "linkedin",
    email_thread: "email",
    meeting_notes: "meeting",
    document: "document",
    other: "other",
  };
  return mapping[contentType] || "other";
}
