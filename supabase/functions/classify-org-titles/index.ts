import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// =============================================
// Server-side rule-based classifier (mirrors src/lib/titleClassifier.ts)
// =============================================
const DEPARTMENT_RULES: Array<{ pattern: RegExp; department: string }> = [
  { pattern: /\b(ceo|chief executive)\b/i, department: 'Executive' },
  { pattern: /\b(cto|chief technology|chief technical)\b/i, department: 'Engineering' },
  { pattern: /\b(cfo|chief financial)\b/i, department: 'Finance' },
  { pattern: /\b(coo|chief operating)\b/i, department: 'Operations' },
  { pattern: /\b(cpo|chief product)\b/i, department: 'Product' },
  { pattern: /\b(cmo|chief marketing)\b/i, department: 'Marketing' },
  { pattern: /\b(cro|chief revenue)\b/i, department: 'Sales' },
  { pattern: /\b(chro|chief human|chief people)\b/i, department: 'People & HR' },
  { pattern: /\b(founder|co-?founder)\b/i, department: 'Executive' },
  { pattern: /\b(software|engineer|developer|sre|devops|backend|frontend|fullstack|full-stack|swe|architect|platform|infrastructure|cloud|qa|quality assurance|test engineer|sdet|mobile|ios|android|machine learning|ml engineer|ai engineer)\b/i, department: 'Engineering' },
  { pattern: /\b(data scientist|data analyst|data engineer|analytics engineer|bi analyst|business intelligence)\b/i, department: 'Data & Analytics' },
  { pattern: /\b(product manager|product owner|product lead|program manager)\b/i, department: 'Product' },
  { pattern: /\b(designer|ux|ui|user experience|creative director|art director|brand design)\b/i, department: 'Design' },
  { pattern: /\b(sales|account executive|bdr|sdr|business development|revenue|pre-?sales|solution engineer|sales engineer)\b/i, department: 'Sales' },
  { pattern: /\b(marketing|brand|content|growth|seo|sem|demand gen|pr\b|public relations|communications|social media|copywriter|product marketing)\b/i, department: 'Marketing' },
  { pattern: /\b(customer success|csm|client success|account manager|customer experience|support engineer|technical support|customer support)\b/i, department: 'Customer Success' },
  { pattern: /\b(human resources|hr\b|people|talent acquisition|recruiter|recruiting|recruitment|compensation|benefits|payroll)\b/i, department: 'People & HR' },
  { pattern: /\b(finance|financial|accountant|accounting|controller|treasury|tax|fp&a)\b/i, department: 'Finance' },
  { pattern: /\b(legal|lawyer|attorney|counsel|compliance|regulatory|privacy officer)\b/i, department: 'Legal' },
  { pattern: /\b(operations|ops\b|supply chain|logistics|procurement|facilities|project manager|scrum master|agile coach|delivery manager)\b/i, department: 'Operations' },
  { pattern: /\b(it\b|information technology|system admin|sysadmin|network|helpdesk)\b/i, department: 'IT' },
  { pattern: /\b(security engineer|appsec|infosec|ciso)\b/i, department: 'Security' },
  { pattern: /\b(research|r&d|scientist|researcher)\b/i, department: 'Research' },
];

const SENIORITY_RULES: Array<{ pattern: RegExp; level: string; isDM: boolean }> = [
  { pattern: /\b(ceo|cto|cfo|coo|cpo|cmo|cro|chro|ciso|chief|founder|co-?founder|president|managing director)\b/i, level: 'C-Suite', isDM: true },
  { pattern: /\b(vp\b|vice president|svp|evp)\b/i, level: 'VP', isDM: true },
  { pattern: /\b(director|head of)\b/i, level: 'Director', isDM: true },
  { pattern: /\b(senior manager|group manager)\b/i, level: 'Senior Manager', isDM: true },
  { pattern: /\b(manager|team lead|tech lead|engineering lead)\b/i, level: 'Manager', isDM: false },
  { pattern: /\b(principal|staff|distinguished|fellow)\b/i, level: 'Principal/Staff', isDM: false },
  { pattern: /\b(senior|sr\.?)\b/i, level: 'Senior IC', isDM: false },
  { pattern: /\b(junior|jr\.?|intern|trainee)\b/i, level: 'Junior', isDM: false },
];

function classifyTitleRuleBased(title: string): { department: string | null; seniority: string | null; isDM: boolean } {
  let department: string | null = null;
  for (const rule of DEPARTMENT_RULES) {
    if (rule.pattern.test(title)) { department = rule.department; break; }
  }
  let seniority: string | null = null;
  let isDM = false;
  for (const rule of SENIORITY_RULES) {
    if (rule.pattern.test(title)) { seniority = rule.level; isDM = rule.isDM; break; }
  }
  if (department && !seniority) seniority = 'IC';
  return { department, seniority, isDM };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { companyId, scanJobId } = await req.json();
    if (!companyId) throw new Error('companyId is required');

    // Get all unclassified people at this company
    const { data: people, error: peopleError } = await supabase
      .from('company_people')
      .select('id, current_title')
      .eq('company_id', companyId)
      .is('title_classification_method', null)
      .not('current_title', 'is', null);

    if (peopleError) throw new Error(`Failed to fetch people: ${peopleError.message}`);
    if (!people || people.length === 0) {
      // Mark scan as completed if applicable
      if (scanJobId) {
        await supabase.from('company_scan_jobs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', scanJobId);
      }
      return new Response(JSON.stringify({ success: true, classified: 0, aiClassified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Phase 1: Rule-based classification
    const ruleClassified: Array<{ id: string; dept: string; seniority: string | null; isDM: boolean }> = [];
    const needsAI: Array<{ id: string; title: string }> = [];

    for (const person of people) {
      const result = classifyTitleRuleBased(person.current_title);
      if (result.department) {
        ruleClassified.push({ id: person.id, dept: result.department, seniority: result.seniority, isDM: result.isDM });
      } else {
        needsAI.push({ id: person.id, title: person.current_title });
      }
    }

    // Batch update rule-classified
    for (const item of ruleClassified) {
      await supabase.from('company_people')
        .update({
          department_inferred: item.dept,
          seniority_level: item.seniority,
          is_decision_maker: item.isDM,
          title_classification_method: 'rule_based',
        })
        .eq('id', item.id);
    }

    // Phase 2: AI classification for ambiguous titles
    let aiClassified = 0;
    if (needsAI.length > 0 && lovableKey) {
      // Batch up to 100 titles in one AI call
      const batch = needsAI.slice(0, 100);
      const titlesText = batch.map((t, i) => `${i + 1}. "${t.title}"`).join('\n');

      const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          tools: [{
            type: 'function',
            function: {
              name: 'classify_titles',
              description: 'Classify job titles into departments and seniority levels.',
              parameters: {
                type: 'object',
                properties: {
                  classifications: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        index: { type: 'number', description: 'The 1-based index of the title' },
                        department: { type: 'string', description: 'Department: Engineering, Product, Design, Data & Analytics, Sales, Business Development, Marketing, Customer Success, Support, People & HR, Finance, Legal, Operations, IT, Security, Research, Executive, or Other' },
                        seniority: { type: 'string', description: 'Seniority: C-Suite, VP, Director, Senior Manager, Manager, Principal/Staff, Senior IC, IC, or Junior' },
                        is_decision_maker: { type: 'boolean' },
                      },
                      required: ['index', 'department', 'seniority', 'is_decision_maker'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['classifications'],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'classify_titles' } },
          messages: [
            {
              role: 'system',
              content: 'You classify job titles into departments and seniority levels for an organizational chart. Be precise. Use only the provided department and seniority options.',
            },
            {
              role: 'user',
              content: `Classify these job titles:\n\n${titlesText}`,
            },
          ],
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            const classifications = parsed.classifications || [];

            for (const cls of classifications) {
              const idx = cls.index - 1;
              if (idx >= 0 && idx < batch.length) {
                await supabase.from('company_people')
                  .update({
                    department_inferred: cls.department,
                    seniority_level: cls.seniority,
                    is_decision_maker: cls.is_decision_maker,
                    title_classification_method: 'ai_inferred',
                  })
                  .eq('id', batch[idx].id);
                aiClassified++;
              }
            }
          } catch (parseErr) {
            console.error('AI response parse error:', parseErr);
          }
        }
      } else {
        const errText = await aiRes.text();
        console.error('AI classification error:', aiRes.status, errText);
      }
    }

    // Mark scan job as completed
    if (scanJobId) {
      await supabase.from('company_scan_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', scanJobId);
    }

    return new Response(JSON.stringify({
      success: true,
      total: people.length,
      ruleClassified: ruleClassified.length,
      aiClassified,
      unclassified: needsAI.length - aiClassified,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('classify-org-titles error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
