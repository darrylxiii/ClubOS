import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!googleApiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  const { job_id, batch_mode = false, limit = 20 } = await req.json();

    let jobsToProcess: any[] = [];

    if (batch_mode) {
      // Find jobs with description but empty requirements
      const { data, error } = await ctx.supabase
        .from('jobs')
        .select('id, title, description, requirements, nice_to_have, experience_level, seniority_level')
        .not('description', 'is', null)
        .or('requirements.is.null,requirements.eq.[]')
        .limit(limit);

      if (error) throw error;
      jobsToProcess = data || [];
    } else if (job_id) {
      const { data, error } = await ctx.supabase
        .from('jobs')
        .select('id, title, description, requirements, nice_to_have, experience_level, seniority_level')
        .eq('id', job_id)
        .single();

      if (error) throw error;
      if (data) jobsToProcess = [data];
    } else {
      return new Response(
        JSON.stringify({ error: 'Either job_id or batch_mode is required' }),
        { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
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

        const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gemini-3-flash-preview',
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

        await ctx.supabase
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
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );

}));
