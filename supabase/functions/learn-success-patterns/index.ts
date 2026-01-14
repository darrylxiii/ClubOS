import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

interface SuccessPattern {
  pattern_type: string;
  industry: string | null;
  company_size: string | null;
  seniority_level: string | null;
  pattern_description: string;
  example_content: string | null;
  success_rate: number;
  sample_size: number;
  learned_from: string[];
  tags: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mode = 'analyze', lookback_days = 90 } = await req.json().catch(() => ({}));

    console.log('[Success Patterns] Learning patterns, mode:', mode, 'lookback:', lookback_days);

    const patterns: SuccessPattern[] = [];
    const since = new Date(Date.now() - lookback_days * 24 * 60 * 60 * 1000).toISOString();

    // 1. Analyze successful placements
    const { data: hiredApplications } = await supabase
      .from('applications')
      .select(`
        id, job_id, candidate_id, status, created_at, updated_at,
        jobs(title, company_id, seniority_level, companies(industry, employee_count))
      `)
      .eq('status', 'hired')
      .gte('updated_at', since);

    if (hiredApplications && hiredApplications.length > 0) {
      // Calculate time-to-hire patterns
      const timeToHireByIndustry: Record<string, number[]> = {};
      const timeToHireBySeniority: Record<string, number[]> = {};

      for (const app of hiredApplications) {
        const timeToHire = Math.floor(
          (new Date(app.updated_at).getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const jobData = app.jobs as { title?: string; company_id?: string; seniority_level?: string; companies?: { industry?: string } } | null;
        const industry = jobData?.companies?.industry || 'unknown';
        const seniority = jobData?.seniority_level || 'unknown';

        if (!timeToHireByIndustry[industry]) timeToHireByIndustry[industry] = [];
        if (!timeToHireBySeniority[seniority]) timeToHireBySeniority[seniority] = [];

        timeToHireByIndustry[industry].push(timeToHire);
        timeToHireBySeniority[seniority].push(timeToHire);
      }

      // Create timing patterns
      for (const [industry, times] of Object.entries(timeToHireByIndustry)) {
        if (times.length >= 3) {
          const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
          patterns.push({
            pattern_type: 'timing_pattern',
            industry,
            company_size: null,
            seniority_level: null,
            pattern_description: `Average time-to-hire in ${industry}: ${Math.round(avgTime)} days`,
            example_content: `Based on ${times.length} successful placements`,
            success_rate: 1.0,
            sample_size: times.length,
            learned_from: hiredApplications
              .filter(a => (a.jobs as { companies?: { industry?: string } } | null)?.companies?.industry === industry)
              .map(a => a.id),
            tags: ['timing', 'industry', industry.toLowerCase()]
          });
        }
      }

      for (const [seniority, times] of Object.entries(timeToHireBySeniority)) {
        if (times.length >= 3) {
          const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
          patterns.push({
            pattern_type: 'timing_pattern',
            industry: null,
            company_size: null,
            seniority_level: seniority,
            pattern_description: `Average time-to-hire for ${seniority} roles: ${Math.round(avgTime)} days`,
            example_content: `Based on ${times.length} successful placements`,
            success_rate: 1.0,
            sample_size: times.length,
            learned_from: hiredApplications
              .filter(a => (a.jobs as { seniority_level?: string } | null)?.seniority_level === seniority)
              .map(a => a.id),
            tags: ['timing', 'seniority', seniority.toLowerCase()]
          });
        }
      }
    }

    // 2. Analyze interaction patterns that lead to success
    const { data: successfulCompanies } = await supabase
      .from('companies')
      .select('id, name, industry')
      .in('id', 
        (hiredApplications || [])
          .map(a => (a.jobs as { company_id?: string } | null)?.company_id)
          .filter((id): id is string => Boolean(id))
      );

    if (successfulCompanies) {
      for (const company of successfulCompanies) {
        // Get interaction patterns for successful companies
        const { data: interactions } = await supabase
          .from('company_interactions')
          .select('interaction_type, sentiment_score')
          .eq('company_id', company.id);

        if (interactions && interactions.length >= 5) {
          // Count interaction types
          const typeCounts: Record<string, number> = {};
          let totalSentiment = 0;
          
          for (const i of interactions) {
            typeCounts[i.interaction_type] = (typeCounts[i.interaction_type] || 0) + 1;
            totalSentiment += i.sentiment_score || 0;
          }

          const avgSentiment = totalSentiment / interactions.length;
          const dominantType = Object.entries(typeCounts)
            .sort(([, a], [, b]) => b - a)[0];

          if (dominantType) {
            patterns.push({
              pattern_type: 'relationship_building',
              industry: company.industry,
              company_size: null,
              seniority_level: null,
              pattern_description: `Successful relationships often involve ${dominantType[0]} interactions (${Math.round(dominantType[1] / interactions.length * 100)}% of touchpoints)`,
              example_content: `Company: ${company.name}, Avg sentiment: ${avgSentiment.toFixed(2)}`,
              success_rate: avgSentiment > 0 ? Math.min(1, avgSentiment) : 0.5,
              sample_size: interactions.length,
              learned_from: [company.id],
              tags: ['relationship', dominantType[0], company.industry?.toLowerCase() || 'unknown']
            });
          }
        }
      }
    }

    // 3. Analyze conversion rates by source
    const { data: allApplications } = await supabase
      .from('applications')
      .select('id, status, application_source, created_at')
      .gte('created_at', since);

    if (allApplications && allApplications.length > 0) {
      const sourceStats: Record<string, { total: number; hired: number }> = {};
      
      for (const app of allApplications) {
        const source = app.application_source || 'unknown';
        if (!sourceStats[source]) sourceStats[source] = { total: 0, hired: 0 };
        sourceStats[source].total++;
        if (app.status === 'hired') sourceStats[source].hired++;
      }

      for (const [source, stats] of Object.entries(sourceStats)) {
        if (stats.total >= 5) {
          const conversionRate = stats.hired / stats.total;
          patterns.push({
            pattern_type: 'outreach_template',
            industry: null,
            company_size: null,
            seniority_level: null,
            pattern_description: `${source} source has ${(conversionRate * 100).toFixed(1)}% conversion rate`,
            example_content: `${stats.hired} hires from ${stats.total} applications`,
            success_rate: conversionRate,
            sample_size: stats.total,
            learned_from: allApplications
              .filter(a => a.application_source === source)
              .map(a => a.id),
            tags: ['source', 'conversion', source.toLowerCase()]
          });
        }
      }
    }

    // 4. Analyze stakeholder engagement patterns
    const { data: stakeholderData } = await supabase
      .from('company_stakeholders')
      .select(`
        id, role, influence_score, company_id,
        company_interactions(interaction_type, created_at)
      `)
      .gte('created_at', since);

    if (stakeholderData) {
      const rolePatterns: Record<string, { count: number; avgInfluence: number; interactions: number }> = {};
      
      for (const stakeholder of stakeholderData) {
        const role = normalizeRole(stakeholder.role || 'unknown');
        if (!rolePatterns[role]) rolePatterns[role] = { count: 0, avgInfluence: 0, interactions: 0 };
        
        rolePatterns[role].count++;
        rolePatterns[role].avgInfluence += stakeholder.influence_score || 0;
        rolePatterns[role].interactions += (stakeholder.company_interactions || []).length;
      }

      for (const [role, stats] of Object.entries(rolePatterns)) {
        if (stats.count >= 3) {
          patterns.push({
            pattern_type: 'relationship_building',
            industry: null,
            company_size: null,
            seniority_level: null,
            pattern_description: `${role} stakeholders average ${(stats.avgInfluence / stats.count).toFixed(2)} influence score with ${Math.round(stats.interactions / stats.count)} interactions each`,
            example_content: `Based on ${stats.count} stakeholders`,
            success_rate: stats.avgInfluence / stats.count,
            sample_size: stats.count,
            learned_from: stakeholderData
              .filter(s => normalizeRole(s.role || '') === role)
              .map(s => s.id),
            tags: ['stakeholder', 'engagement', role.toLowerCase()]
          });
        }
      }
    }

    // Insert patterns
    if (patterns.length > 0) {
      const { error } = await supabase
        .from('success_patterns')
        .upsert(
          patterns.map(p => ({
            ...p,
            learned_from: JSON.stringify(p.learned_from),
            is_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'pattern_type,pattern_description' }
        );

      if (error) {
        console.error('[Success Patterns] Insert error:', error);
      }
    }

    console.log('[Success Patterns] Learned', patterns.length, 'patterns');

    return new Response(
      JSON.stringify({
        success: true,
        patterns_learned: patterns.length,
        breakdown: {
          timing: patterns.filter(p => p.pattern_type === 'timing_pattern').length,
          relationship: patterns.filter(p => p.pattern_type === 'relationship_building').length,
          outreach: patterns.filter(p => p.pattern_type === 'outreach_template').length
        },
        top_patterns: patterns
          .sort((a, b) => b.success_rate - a.success_rate)
          .slice(0, 5)
          .map(p => ({
            type: p.pattern_type,
            description: p.pattern_description,
            success_rate: p.success_rate,
            sample_size: p.sample_size
          }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Success Patterns] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function normalizeRole(role: string): string {
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('ceo') || roleLower.includes('chief executive')) return 'CEO';
  if (roleLower.includes('cto') || roleLower.includes('chief technology')) return 'CTO';
  if (roleLower.includes('cfo') || roleLower.includes('chief financial')) return 'CFO';
  if (roleLower.includes('coo') || roleLower.includes('chief operating')) return 'COO';
  if (roleLower.includes('chro') || roleLower.includes('chief human') || roleLower.includes('chief people')) return 'CHRO';
  if (roleLower.includes('vp') || roleLower.includes('vice president')) return 'VP';
  if (roleLower.includes('director')) return 'Director';
  if (roleLower.includes('head of') || roleLower.includes('head')) return 'Head';
  if (roleLower.includes('manager')) return 'Manager';
  if (roleLower.includes('recruiter') || roleLower.includes('talent')) return 'Talent/HR';
  if (roleLower.includes('founder') || roleLower.includes('owner')) return 'Founder';
  
  return 'Other';
}
