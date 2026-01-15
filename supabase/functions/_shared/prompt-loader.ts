// Shared utility for fetching LLM prompts from the database
// This allows admins to edit prompts without code changes

interface PromptTemplate {
    system_prompt: string;
    user_prompt_template?: string;
    model: string;
    temperature: number;
    max_tokens?: number;
}

// Fallback prompts in case DB fetch fails
const FALLBACK_PROMPTS: Record<string, PromptTemplate> = {
    'recruitment.calibration.system': {
        system_prompt: `You are the Calibration Engine for a high-precision recruitment OS.
Your inputs are:
1. Job Description (Text)
2. Intake Notes (Text/JSON)

Your output MUST be a valid JSON object adhering strictly to the provided Schema.
NO markdown formatting. Just the raw JSON string.

RULES:
- "rejection_gates" must be binary and aggressive.
- "scoring_weights" must reflect the JD's emphasis.
- "competitors" should be inferred from the context.

Schema:
{{schema}}`,
        user_prompt_template: `JOB TITLE: {{job_title}}

JOB DESCRIPTION:
{{job_description}}

INTAKE NOTES:
{{intake_notes}}`,
        model: 'gpt-4o',
        temperature: 0.2
    },
    'recruitment.analyzer.tier1': {
        system_prompt: `You are a Strict Gatekeeper.
Candidate Profile:
{{candidate}}

Rejection Gates:
{{gates}}

Task: Evaluate if the candidate FAILS any gate.
Output JSON: { "pass": boolean, "failed_gate_reason": "string or null" }`,
        model: 'gpt-4o-mini',
        temperature: 0.0
    },
    'recruitment.analyzer.tier2': {
        system_prompt: `You are an Expert Recruiter performing deep candidate analysis.
Candidate Profile:
{{candidate}}

Job Configuration:
{{config}}

Task:
1. Score the candidate (0-100) based on "scoring_weights".
2. Extract "Evidence" bullets (direct quotes from their profile).
3. Identify Risks (gaps, short tenures, missing skills).
4. Generate 3 Interview Questions that probe the risks.

Output JSON:
{
  "total_score": number,
  "evidence": { "technical": "...", "soft_skills": "...", "leadership": "..." },
  "risks": ["..."],
  "interview_questions": ["..."]
}`,
        model: 'gpt-4o',
        temperature: 0.0
    }
};

/**
 * Fetches a prompt template from the database by slug.
 * Falls back to hardcoded defaults if the database call fails.
 */
export async function getPromptTemplate(
    supabase: any,
    slug: string
): Promise<PromptTemplate> {
    try {
        const { data, error } = await supabase
            .from('llm_prompt_templates')
            .select('system_prompt, user_prompt_template, model, temperature, max_tokens')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            console.warn(`[getPromptTemplate] Prompt "${slug}" not found in DB, using fallback.`);
            return FALLBACK_PROMPTS[slug] || {
                system_prompt: 'You are a helpful assistant.',
                model: 'gpt-4o-mini',
                temperature: 0.5
            };
        }

        return data as PromptTemplate;
    } catch (e) {
        console.error(`[getPromptTemplate] Error fetching "${slug}":`, e);
        return FALLBACK_PROMPTS[slug] || {
            system_prompt: 'You are a helpful assistant.',
            model: 'gpt-4o-mini',
            temperature: 0.5
        };
    }
}

/**
 * Replaces {{variable}} placeholders in a template string with actual values.
 */
export function interpolateTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
}
