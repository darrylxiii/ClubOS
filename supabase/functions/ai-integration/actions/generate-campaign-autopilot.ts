import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const GenerateCampaignAutopilotSchema = z.object({
    goal: z.string(),
    target_audience: z.string(),
    industry: z.string().optional(),
    sender_name: z.string().optional(),
});

interface ActionContext {
    payload: any;
}

export async function handleGenerateCampaignAutopilot({ payload }: ActionContext) {
    const { goal, target_audience, industry, sender_name } = GenerateCampaignAutopilotSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
        throw new Error("Missing LOVABLE_API_KEY");
    }

    const systemPrompt = `You are a world-class B2B sales strategist and copywriter.
    Your job is to design a high-converting Cold Outreach Campaign based on a high-level goal.
    
    You must output strictly raw JSON matching this structure:
    {
      "name": "Campaign Name",
      "description": "Strategic rationale...",
      "target_audience": {
        "industry": "Specific Industry",
        "persona": "Target Job Titles",
        "company_size": "Size range (e.g., 51-200)"
      },
      "config": {
        "daily_limit": 50,
        "sequence_steps": 3
      },
      "steps": [
        {
          "step_number": 1,
          "day": 0,
          "type": "email",
          "content": {
            "subject": "Compelling Subject Line",
            "body": "Personalized email body..."
          }
        },
        {
          "step_number": 2,
          "day": 3,
          "type": "email",
          "content": {
            "subject": "Re: [Previous Subject]",
            "body": "Follow up body..."
          }
        }
      ]
    }
    
    Rules:
    - Tone: Professional, direct, low-friction (The "Anti-Sales" approach).
    - No fluff. Focus on value, relevance, and soft Call to Actions (CTAs).
    - Body should include placeholders like {{first_name}} and {{company_name}}.
    - Return ONLY JSON. No markdown blocking.`;

    const userPrompt = `Campaign Goal: ${goal}
    Target Audience: ${target_audience}
    ${industry ? `Industry: ${industry}` : ''}
    ${sender_name ? `Sender: ${sender_name}` : ''}
    
    Generate a 3-5 step sequence.`;

    try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 2000,
                temperature: 0.7
            }),
        });

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        let campaignData;
        try {
            // Attempt to clean markdown if present
            const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
            campaignData = JSON.parse(cleanContent);
        } catch (e) {
            console.error('Failed to parse AI response', content);
            throw new Error("Failed to generate valid JSON campaign structure.");
        }

        return { success: true, campaign: campaignData };

    } catch (error) {
        console.error('Autopilot error:', error);
        return { success: false, error: 'Failed to generate campaign' };
    }
}
