import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, insightType = 'daily_briefing' } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company analytics data
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, status, title')
      .eq('company_id', companyId);

    const jobIds = jobs?.map(j => j.id) || [];
    
    const [
      { data: applications },
      { data: metrics },
      { data: healthScore }
    ] = await Promise.all([
      supabase.from('applications')
        .select('id, status, current_stage_index, applied_at, updated_at, job_id')
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false })
        .limit(100),
      supabase.from('hiring_metrics_weekly')
        .select('*')
        .eq('company_id', companyId)
        .order('week', { ascending: false })
        .limit(4),
      supabase.rpc('calculate_company_health_score', { 
        p_company_id: companyId,
        p_period_days: 30 
      })
    ]);

    // Calculate key stats
    const activeApps = applications?.filter(a => 
      !['hired', 'rejected', 'withdrawn'].includes(a.status)
    ) || [];
    
    const staleApps = activeApps.filter(a => {
      const appliedDate = new Date(a.applied_at);
      const hoursSinceApplied = (Date.now() - appliedDate.getTime()) / (1000 * 60 * 60);
      return a.current_stage_index === 0 && hoursSinceApplied > 48;
    });
    
    const avgTimeToHire = metrics?.[0]?.avg_days_to_hire || 0;
    const totalApps = metrics?.[0]?.total_applications || 0;
    const hires = metrics?.[0]?.hires || 0;
    const hireRate = totalApps > 0 ? (hires / totalApps * 100) : 0;

    // Build context for AI
    const context = `You are QUIN, The Quantum Club's AI hiring assistant. Generate a ${insightType} for this partner company.

CURRENT METRICS:
- Health Score: ${healthScore}/100
- Active Applications: ${activeApps.length}
- Applications needing attention: ${staleApps.length} (>48hrs without response)
- Active Jobs: ${jobs?.filter(j => j.status === 'published').length || 0}
- Avg Time to Hire: ${avgTimeToHire.toFixed(1)} days
- Hire Rate: ${hireRate.toFixed(1)}%
- Weekly applications: ${totalApps}
- Weekly hires: ${hires}

TASK: Generate 3-5 actionable insights with:
1. What's happening (observation)
2. Why it matters (impact)
3. What to do next (specific action)

Focus on: urgent issues, opportunities, predictions, and best practices.
Be concise, specific, and always action-oriented. Use a professional, discreet tone.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are QUIN, a concise AI hiring assistant for The Quantum Club. Provide actionable, specific insights in a professional tone.' 
          },
          { role: 'user', content: context }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_insights',
            description: 'Generate structured hiring insights',
            parameters: {
              type: 'object',
              properties: {
                insights: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      observation: { type: 'string' },
                      impact: { type: 'string' },
                      action: { type: 'string' },
                      urgency: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                      category: { type: 'string', enum: ['response_time', 'pipeline', 'opportunity', 'prediction', 'best_practice'] }
                    },
                    required: ['title', 'observation', 'impact', 'action', 'urgency', 'category']
                  }
                }
              },
              required: ['insights']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_insights' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI request failed: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const insights = JSON.parse(toolCall.function.arguments).insights;

    // Store insights in database
    const insertPromises = insights.map((insight: any) =>
      supabase.from('partner_ai_insights').insert({
        company_id: companyId,
        insight_type: insightType,
        title: insight.title,
        content: `${insight.observation}\n\n**Impact:** ${insight.impact}\n\n**Action:** ${insight.action}`,
        confidence_score: 0.85,
        impact_level: insight.urgency,
        data_points: {
          category: insight.category,
          metrics: { 
            healthScore, 
            activeApps: activeApps.length, 
            staleApps: staleApps.length,
            avgTimeToHire,
            hireRate: hireRate.toFixed(1)
          }
        },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    );

    await Promise.all(insertPromises);

    // Generate smart alerts
    await supabase.rpc('generate_smart_alerts', { p_company_id: companyId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights, 
        healthScore,
        metrics: {
          activeApps: activeApps.length,
          staleApps: staleApps.length,
          avgTimeToHire,
          hireRate: hireRate.toFixed(1)
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in generate-partner-insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
