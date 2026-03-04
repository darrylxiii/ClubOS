import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[analyze-outreach-copy] Starting analysis...');

    // 1. Get all sequence steps with enough data (>50 sends)
    const { data: steps, error: stepsError } = await supabase
      .from('instantly_sequence_steps')
      .select('*, crm_campaigns!inner(name, status)')
      .gte('sent_count', 50)
      .order('reply_rate', { ascending: false });

    if (stepsError) {
      console.error('[analyze-outreach-copy] Error fetching steps:', stepsError);
      // Fallback: try without join
      const { data: fallbackSteps, error: fallbackError } = await supabase
        .from('instantly_sequence_steps')
        .select('*')
        .gte('sent_count', 50)
        .order('reply_rate', { ascending: false });

      if (fallbackError) throw fallbackError;
      if (!fallbackSteps || fallbackSteps.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: 'No steps with sufficient data yet', learnings: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const allSteps = steps || [];
    
    if (allSteps.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No steps with sufficient data yet', learnings: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[analyze-outreach-copy] Analyzing ${allSteps.length} steps`);

    // 2. Extract subject line patterns
    const subjectPatterns = analyzeSubjectLines(allSteps);

    // 3. Extract body copy patterns (if body_text available)
    const bodyPatterns = analyzeBodyCopy(allSteps);

    // 4. Extract timing/sequence patterns
    const sequencePatterns = analyzeSequenceStructure(allSteps);

    // 5. Get reply sentiment distribution per campaign
    const { data: replySentiments } = await supabase
      .from('crm_email_replies')
      .select('campaign_id, classification')
      .not('campaign_id', 'is', null);

    const sentimentPatterns = analyzeSentiments(replySentiments || []);

    // 6. Combine all learnings
    const allLearnings = [
      ...subjectPatterns,
      ...bodyPatterns,
      ...sequencePatterns,
      ...sentimentPatterns,
    ];

    // 7. Use AI to synthesize higher-level insights if we have enough data
    let aiInsights: any[] = [];
    if (lovableApiKey && allSteps.length >= 5) {
      aiInsights = await generateAIInsights(lovableApiKey, allSteps, allLearnings);
    }

    const finalLearnings = [...allLearnings, ...aiInsights];

    // 8. Upsert learnings into crm_outreach_learnings
    let upsertCount = 0;
    for (const learning of finalLearnings) {
      const { error: upsertError } = await supabase
        .from('crm_outreach_learnings')
        .upsert({
          learning_type: learning.learning_type,
          pattern: learning.pattern,
          evidence: learning.evidence,
          sample_size: learning.sample_size,
          confidence_score: learning.confidence_score,
          performance_lift: learning.performance_lift,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'learning_type,pattern',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        // If unique constraint doesn't exist, just insert
        await supabase
          .from('crm_outreach_learnings')
          .insert({
            learning_type: learning.learning_type,
            pattern: learning.pattern,
            evidence: learning.evidence,
            sample_size: learning.sample_size,
            confidence_score: learning.confidence_score,
            performance_lift: learning.performance_lift,
            is_active: true,
          });
      }
      upsertCount++;
    }

    console.log(`[analyze-outreach-copy] Complete: ${upsertCount} learnings saved`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        learnings: upsertCount,
        steps_analyzed: allSteps.length,
        patterns: {
          subject: subjectPatterns.length,
          body: bodyPatterns.length,
          sequence: sequencePatterns.length,
          sentiment: sentimentPatterns.length,
          ai: aiInsights.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[analyze-outreach-copy] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeSubjectLines(steps: any[]) {
  const learnings: any[] = [];
  const stepsWithSubjects = steps.filter(s => s.subject_line);

  if (stepsWithSubjects.length < 3) return learnings;

  // Sort by open rate
  const sorted = [...stepsWithSubjects].sort((a, b) => (b.open_rate || 0) - (a.open_rate || 0));
  const topQuartile = sorted.slice(0, Math.ceil(sorted.length / 4));
  const bottomQuartile = sorted.slice(-Math.ceil(sorted.length / 4));

  const avgTopOpenRate = topQuartile.reduce((s, t) => s + (t.open_rate || 0), 0) / topQuartile.length;
  const avgBottomOpenRate = bottomQuartile.reduce((s, t) => s + (t.open_rate || 0), 0) / bottomQuartile.length;

  // Pattern: Question mark in subject
  const withQuestion = stepsWithSubjects.filter(s => s.subject_line?.includes('?'));
  const withoutQuestion = stepsWithSubjects.filter(s => !s.subject_line?.includes('?'));
  if (withQuestion.length >= 3 && withoutQuestion.length >= 3) {
    const qAvg = withQuestion.reduce((s, t) => s + (t.open_rate || 0), 0) / withQuestion.length;
    const noQAvg = withoutQuestion.reduce((s, t) => s + (t.open_rate || 0), 0) / withoutQuestion.length;
    if (qAvg > noQAvg) {
      learnings.push({
        learning_type: 'subject_pattern',
        pattern: 'Subject lines with questions outperform statements',
        evidence: {
          with_question_avg_open: Math.round(qAvg * 10) / 10,
          without_question_avg_open: Math.round(noQAvg * 10) / 10,
          examples: withQuestion.slice(0, 3).map((s: any) => s.subject_line),
        },
        sample_size: stepsWithSubjects.length,
        confidence_score: Math.min(95, 50 + stepsWithSubjects.length * 2),
        performance_lift: Math.round((qAvg - noQAvg) * 10) / 10,
      });
    }
  }

  // Pattern: Short vs long subjects
  const shortSubjects = stepsWithSubjects.filter(s => (s.subject_line?.length || 0) <= 40);
  const longSubjects = stepsWithSubjects.filter(s => (s.subject_line?.length || 0) > 40);
  if (shortSubjects.length >= 3 && longSubjects.length >= 3) {
    const shortAvg = shortSubjects.reduce((s, t) => s + (t.open_rate || 0), 0) / shortSubjects.length;
    const longAvg = longSubjects.reduce((s, t) => s + (t.open_rate || 0), 0) / longSubjects.length;
    const winner = shortAvg > longAvg ? 'short' : 'long';
    learnings.push({
      learning_type: 'subject_pattern',
      pattern: `${winner === 'short' ? 'Shorter' : 'Longer'} subject lines (${winner === 'short' ? '≤40' : '>40'} chars) perform better`,
      evidence: {
        short_avg_open: Math.round(shortAvg * 10) / 10,
        long_avg_open: Math.round(longAvg * 10) / 10,
      },
      sample_size: stepsWithSubjects.length,
      confidence_score: Math.min(90, 45 + stepsWithSubjects.length * 2),
      performance_lift: Math.round(Math.abs(shortAvg - longAvg) * 10) / 10,
    });
  }

  // Top performing subject lines
  if (topQuartile.length > 0) {
    learnings.push({
      learning_type: 'subject_pattern',
      pattern: 'Top performing subject lines by open rate',
      evidence: {
        top_subjects: topQuartile.slice(0, 5).map((s: any) => ({
          subject: s.subject_line,
          open_rate: Math.round((s.open_rate || 0) * 10) / 10,
          reply_rate: Math.round((s.reply_rate || 0) * 10) / 10,
          sent: s.sent_count,
        })),
        avg_top_open_rate: Math.round(avgTopOpenRate * 10) / 10,
        avg_bottom_open_rate: Math.round(avgBottomOpenRate * 10) / 10,
      },
      sample_size: stepsWithSubjects.length,
      confidence_score: Math.min(95, 60 + topQuartile.length * 5),
      performance_lift: Math.round((avgTopOpenRate - avgBottomOpenRate) * 10) / 10,
    });
  }

  return learnings;
}

function analyzeBodyCopy(steps: any[]) {
  const learnings: any[] = [];
  const stepsWithBody = steps.filter(s => s.body_text);

  if (stepsWithBody.length < 3) return learnings;

  // Sort by reply rate
  const sorted = [...stepsWithBody].sort((a, b) => (b.reply_rate || 0) - (a.reply_rate || 0));
  const topQuartile = sorted.slice(0, Math.ceil(sorted.length / 4));

  // Pattern: Body length
  const shortBodies = stepsWithBody.filter(s => (s.body_text?.length || 0) <= 300);
  const longBodies = stepsWithBody.filter(s => (s.body_text?.length || 0) > 300);
  if (shortBodies.length >= 2 && longBodies.length >= 2) {
    const shortAvg = shortBodies.reduce((s, t) => s + (t.reply_rate || 0), 0) / shortBodies.length;
    const longAvg = longBodies.reduce((s, t) => s + (t.reply_rate || 0), 0) / longBodies.length;
    const winner = shortAvg > longAvg ? 'concise' : 'detailed';
    learnings.push({
      learning_type: 'body_pattern',
      pattern: `${winner === 'concise' ? 'Concise' : 'Detailed'} email bodies (${winner === 'concise' ? '≤300' : '>300'} chars) get more replies`,
      evidence: {
        concise_avg_reply: Math.round(shortAvg * 10) / 10,
        detailed_avg_reply: Math.round(longAvg * 10) / 10,
      },
      sample_size: stepsWithBody.length,
      confidence_score: Math.min(85, 40 + stepsWithBody.length * 3),
      performance_lift: Math.round(Math.abs(shortAvg - longAvg) * 10) / 10,
    });
  }

  // Top performing body copies
  if (topQuartile.length > 0) {
    learnings.push({
      learning_type: 'body_pattern',
      pattern: 'Top performing email bodies by reply rate',
      evidence: {
        top_bodies: topQuartile.slice(0, 3).map((s: any) => ({
          preview: s.body_text?.substring(0, 150) + '...',
          reply_rate: Math.round((s.reply_rate || 0) * 10) / 10,
          open_rate: Math.round((s.open_rate || 0) * 10) / 10,
          sent: s.sent_count,
          step: s.step_number,
        })),
      },
      sample_size: stepsWithBody.length,
      confidence_score: Math.min(90, 50 + topQuartile.length * 5),
      performance_lift: null,
    });
  }

  return learnings;
}

function analyzeSequenceStructure(steps: any[]) {
  const learnings: any[] = [];

  // Group by campaign
  const byCampaign: Record<string, any[]> = {};
  for (const step of steps) {
    const key = step.campaign_id || step.external_campaign_id;
    if (!byCampaign[key]) byCampaign[key] = [];
    byCampaign[key].push(step);
  }

  // Find which step number gets the most replies
  const stepReplyRates: Record<number, number[]> = {};
  for (const step of steps) {
    if (!stepReplyRates[step.step_number]) stepReplyRates[step.step_number] = [];
    stepReplyRates[step.step_number].push(step.reply_rate || 0);
  }

  const stepAvgs = Object.entries(stepReplyRates)
    .map(([step, rates]) => ({
      step: parseInt(step),
      avg_reply_rate: rates.reduce((a, b) => a + b, 0) / rates.length,
      sample_size: rates.length,
    }))
    .sort((a, b) => b.avg_reply_rate - a.avg_reply_rate);

  if (stepAvgs.length >= 2) {
    learnings.push({
      learning_type: 'sequence_structure',
      pattern: `Step ${stepAvgs[0].step} in sequences produces the highest average reply rate`,
      evidence: {
        step_breakdown: stepAvgs.map(s => ({
          step: s.step,
          avg_reply_rate: Math.round(s.avg_reply_rate * 10) / 10,
          sample_size: s.sample_size,
        })),
      },
      sample_size: steps.length,
      confidence_score: Math.min(90, 50 + stepAvgs[0].sample_size * 5),
      performance_lift: Math.round((stepAvgs[0].avg_reply_rate - stepAvgs[stepAvgs.length - 1].avg_reply_rate) * 10) / 10,
    });
  }

  return learnings;
}

function analyzeSentiments(replies: any[]) {
  const learnings: any[] = [];

  if (replies.length < 10) return learnings;

  const sentimentCounts: Record<string, number> = {};
  for (const reply of replies) {
    const cls = reply.classification || 'unknown';
    sentimentCounts[cls] = (sentimentCounts[cls] || 0) + 1;
  }

  const total = replies.length;
  const breakdown = Object.entries(sentimentCounts)
    .map(([sentiment, count]) => ({
      sentiment,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  learnings.push({
    learning_type: 'timing',
    pattern: 'Reply sentiment distribution across all campaigns',
    evidence: { breakdown, total_replies: total },
    sample_size: total,
    confidence_score: Math.min(95, 60 + total),
    performance_lift: null,
  });

  return learnings;
}

async function generateAIInsights(apiKey: string, steps: any[], existingLearnings: any[]) {
  try {
    const prompt = `Analyze these cold outreach email performance metrics and extract actionable patterns.

Steps data (top 20 by reply rate):
${JSON.stringify(steps.slice(0, 20).map(s => ({
  subject: s.subject_line,
  body_preview: s.body_text?.substring(0, 200),
  step: s.step_number,
  sent: s.sent_count,
  open_rate: s.open_rate,
  reply_rate: s.reply_rate,
  click_rate: s.click_rate,
})), null, 2)}

Existing patterns found:
${JSON.stringify(existingLearnings.map(l => l.pattern), null, 2)}

Return a JSON array of 2-4 NEW insights not already covered above. Each insight should be:
{
  "pattern": "one sentence description",
  "evidence_summary": "brief supporting data",
  "confidence": number (0-100),
  "lift": number or null
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are an expert cold email analyst. Return only valid JSON arrays.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const insights = JSON.parse(jsonMatch[0]);
    return insights.map((insight: any) => ({
      learning_type: 'body_pattern',
      pattern: insight.pattern,
      evidence: { ai_generated: true, summary: insight.evidence_summary },
      sample_size: steps.length,
      confidence_score: Math.min(85, insight.confidence || 50),
      performance_lift: insight.lift,
    }));
  } catch (error) {
    console.error('[analyze-outreach-copy] AI insights error:', error);
    return [];
  }
}
