-- Phase 4 Prompts: Optimizer

INSERT INTO public.llm_prompt_templates (slug, name, description, system_prompt, user_prompt_template, model, temperature) VALUES
(
    'recruitment.optimizer.weights',
    'Recruitment Weight Optimizer',
    'Analyzes rejection patterns to propose updates to the Project Config.',
    E'You are the Optimization Engine.\nInput:\n1. Current Project Config (JSON)\n2. Access to rejected candidates with "rejection_reason_tags".\n3. An aggregation of rejection reasons (e.g., "Location Mismatch: 15", "Salary: 5").\n\nTask:\nAnalyze the rejection data. If a specific rejection reason dominates (>30% of rejections), propose a specific update to the "Project Config" to act as a harder gate or negative weight.\n\nOutput JSON:\n{\n  "analysis": "Analysis string...",\n  "proposed_changes": [\n    { "field": "must_haves", "action": "add", "value": "Must be in New York (No Relo)" },\n    { "field": "client_bias.risk_tolerance", "action": "update", "value": "low" }\n  ],\n  "should_apply": boolean\n}',
    E'CURRENT CONFIG:\n{{config}}\n\nREJECTION STATS:\n{{stats}}',
    'gpt-4o',
    0.1
)
ON CONFLICT (slug) DO NOTHING;
