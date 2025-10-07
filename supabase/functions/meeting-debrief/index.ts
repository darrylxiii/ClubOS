import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  recordingId: z.string().uuid('Invalid recording ID format'),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters',
          details: validationResult.error.issues 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { recordingId } = validationResult.data;

    console.log('Processing recording:', recordingId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get recording details
    const { data: recording, error: fetchError } = await supabase
      .from('meeting_recordings')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (fetchError || !recording) {
      throw new Error('Recording not found');
    }

    // Update status to processing
    await supabase
      .from('meeting_recordings')
      .update({ analysis_status: 'processing' })
      .eq('id', recordingId);

    // Download audio file from storage
    console.log('Downloading audio file from:', recording.recording_url);
    const audioResponse = await fetch(recording.recording_url);
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio file');
    }
    
    const audioBlob = await audioResponse.blob();
    console.log('Audio file downloaded, size:', audioBlob.size);

    // Transcribe with OpenAI Whisper
    console.log('Starting transcription...');
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('OpenAI transcription error:', errorText);
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcript = transcriptionResult.text;
    console.log('Transcription completed, length:', transcript.length);

    // Analyze with Lovable AI
    console.log('Starting AI analysis...');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
    }

    const analysisPrompt = `You are an expert career coach analyzing an interview recording.

Interview Details:
- Company: ${recording.company_name || 'Unknown'}
- Position: ${recording.position || 'Unknown'}
- Type: ${recording.meeting_type || 'Unknown'}
- Date: ${recording.meeting_date}

Interview Transcript:
${transcript}

Provide a comprehensive analysis in the following JSON format:
{
  "whatWentWell": ["point 1", "point 2", "point 3"],
  "redFlags": ["flag 1", "flag 2"],
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "followUpEmailDraft": "Professional email draft thanking them and highlighting key discussion points",
  "actionItems": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "category": "follow-up|research|preparation|networking",
      "estimatedDuration": 30
    }
  ],
  "overallSentiment": "positive|neutral|negative",
  "improvementAreas": ["area 1", "area 2"]
}

Focus on:
1. Specific achievements and strengths demonstrated
2. Any concerns or weaknesses that emerged
3. Concrete action items for follow-up
4. Professional, personalized follow-up email
5. Areas for improvement in future interviews`;

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert career coach and interview analyst. Provide detailed, actionable insights."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!analysisResponse.ok) {
      if (analysisResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (analysisResponse.status === 402) {
        throw new Error("Payment required. Please add credits to your workspace.");
      }
      const errorText = await analysisResponse.text();
      console.error("AI analysis error:", errorText);
      throw new Error("AI analysis failed");
    }

    const analysisData = await analysisResponse.json();
    const analysisText = analysisData.choices[0].message.content;
    console.log('AI analysis completed');

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", analysisText);
      throw new Error("Failed to parse analysis results");
    }

    // Create tasks from action items
    console.log('Creating tasks from action items...');
    const tasks = analysis.actionItems || [];
    const taskInserts = tasks.map((task: any) => ({
      user_id: recording.user_id,
      title: task.title,
      description: task.description,
      priority: task.priority || 'medium',
      task_type: 'follow_up',
      status: 'pending',
      estimated_duration_minutes: task.estimatedDuration || 30,
      application_id: recording.id,
      company_name: recording.company_name,
      position: recording.position,
      metadata: {
        category: task.category || 'follow-up',
        source: 'meeting_debrief'
      }
    }));

    if (taskInserts.length > 0) {
      const { error: taskError } = await supabase
        .from('tasks')
        .insert(taskInserts);

      if (taskError) {
        console.error('Error creating tasks:', taskError);
      } else {
        console.log(`Created ${taskInserts.length} tasks`);
      }
    }

    // Save results to database
    console.log('Saving analysis results...');
    const { error: updateError } = await supabase
      .from('meeting_recordings')
      .update({
        transcript: transcript,
        ai_analysis: analysis,
        follow_up_draft: analysis.followUpEmailDraft,
        analyzed_at: new Date().toISOString(),
        analysis_status: 'completed'
      })
      .eq('id', recordingId);

    if (updateError) {
      console.error('Error saving analysis:', updateError);
      throw updateError;
    }

    console.log('Analysis complete!');

    return new Response(
      JSON.stringify({
        success: true,
        transcript,
        analysis,
        tasksCreated: taskInserts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in meeting-debrief:', error);
    
    // Update status to failed if we have recordingId
    try {
      const rawBody = await req.clone().json();
      const validationResult = requestSchema.safeParse(rawBody);
      if (validationResult.success) {
        const { recordingId } = validationResult.data;
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('meeting_recordings')
          .update({ analysis_status: 'failed' })
          .eq('id', recordingId);
      }
    } catch (e) {
      console.error('Error updating failed status:', e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});