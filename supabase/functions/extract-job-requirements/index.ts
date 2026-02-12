import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { job_id, batch_mode = false, limit = 20 } = await req.json();

    let jobsToProcess: any[] = [];

    if (batch_mode) {
      // Find jobs with description but empty requirements
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, description, requirements, nice_to_have, experience_level, seniority_level')
        .not('description', 'is', null)
        .or('requirements.is.null,requirements.eq.[]')
        .limit(limit);

      if (error) throw error;
      jobsToProcess = data || [];
    } else if (job_id) {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, description, requirements, nice_to_have, experience_level, seniority_level')
        .eq('id', job_id)
        .single();

      if (error) throw error;
      if (data) jobsToProcess = [data];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either job_id or batch_mode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: any[] = [];

    for (const job of jobsToProcess) {
      try {
        if (!job.description || job.description.length < 50) continue;

        const prompt = `Analyze this job posting and extract structured skill requirements.

Job Title: ${job.title || 'Unknown'}
Experience Level: ${job.experience_level || 'Not specified'}
Seniority: ${job.seniority_level || 'Not specified'}

Job Description:
${job.description.substring(0, 3000)}

Extract must-have and nice-to-have skills/requirements.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: 'You are an expert job requirements analyzer. Extract specific, actionable skill requirements from job descriptions.' },
              { role: 'user', content: prompt }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'extract_requirements',
                description: 'Extract must-have and nice-to-have skills from a job description',
                parameters: {
                  type: 'object',
                  properties: {
                    must_have: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Critical skills required for the role'
                    },
                    nice_to_have: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Bonus skills that would be advantageous'
                    },
                    salary_period: {
                      type: 'string',
                      enum: ['annual', 'monthly', 'daily', 'hourly'],
                      description: 'Salary period if mentioned in the JD'
                    }
                  },
                  required: ['must_have', 'nice_to_have'],
                  additionalProperties: false
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'extract_requirements' } }
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            console.warn('Rate limited, stopping batch');
            break;
          }
          console.warn(`AI extraction failed for job ${job.id}: ${aiResponse.status}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) continue;

        const parsed = JSON.parse(toolCall.function.arguments);
        const mustHave = parsed.must_have || [];
        const niceToHave = parsed.nice_to_have || [];
        const salaryPeriod = parsed.salary_period;

        // Update job
        const updateData: any = {
          requirements: mustHave,
          nice_to_have: niceToHave,
        };
        if (salaryPeriod) {
          updateData.salary_period = salaryPeriod;
        }

        await supabase
          .from('jobs')
          .update(updateData)
          .eq('id', job.id);

        results.push({
          job_id: job.id,
          title: job.title,
          must_have_count: mustHave.length,
          nice_to_have_count: niceToHave.length,
          salary_period: salaryPeriod || 'not_detected',
        });

      } catch (parseError) {
        console.warn(`Failed to process job ${job.id}:`, parseError);
        results.push({ job_id: job.id, error: String(parseError) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobs_processed: jobsToProcess.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-job-requirements:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
