// Edge function for generating AI-powered assessment insights
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AssessmentInput {
  assessmentType: 'personality' | 'skills' | 'culture' | 'technical';
  assessmentName: string;
  resultsData: Record<string, any>;
  score?: number;
}

interface AssessmentInsights {
  strengths: string[];
  developmentAreas: string[];
  actionItems: { title: string; description: string; priority: 'high' | 'medium' | 'low' }[];
  careerRecommendations: string[];
  nextSteps: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { assessmentType, assessmentName, resultsData, score }: AssessmentInput = await req.json()

    if (!assessmentType || !resultsData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: assessmentType and resultsData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build context-aware prompt based on assessment type
    const contextPrompts: Record<string, string> = {
      personality: `Analyze this personality assessment result and provide insights on work style, team dynamics, and communication preferences.`,
      skills: `Analyze this skills assessment and identify technical strengths, skill gaps, and learning priorities.`,
      culture: `Analyze this culture fit assessment and suggest optimal work environments and team compositions.`,
      technical: `Analyze this technical assessment and provide detailed feedback on demonstrated competencies and areas for improvement.`,
    }

    const prompt = `${contextPrompts[assessmentType] || contextPrompts.personality}

Assessment: ${assessmentName}
${score !== undefined ? `Overall Score: ${score}%` : ''}
Results Data:
${JSON.stringify(resultsData, null, 2)}

Provide your analysis in the following JSON structure:
{
  "strengths": ["3-5 key strengths demonstrated"],
  "developmentAreas": ["2-4 areas for growth"],
  "actionItems": [
    {"title": "Action item title", "description": "Specific action to take", "priority": "high|medium|low"}
  ],
  "careerRecommendations": ["2-3 career path suggestions based on profile"],
  "nextSteps": "A concise paragraph with personalized next steps"
}

Be specific, actionable, and encouraging. Tailor recommendations to the luxury executive recruitment context of The Quantum Club.`

    // Call Lovable AI (Gemini 2.5 Flash for speed)
    const aiResponse = await fetch('https://dpjucecmoyfzrduhlctt.supabase.co/functions/v1/proxy-ai-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are QUIN, an AI career coach for The Quantum Club - an elite talent platform. Provide insightful, actionable career development advice. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!aiResponse.ok) {
      // Fallback to structured response if AI fails
      const fallbackInsights: AssessmentInsights = {
        strengths: [
          'Demonstrated strong engagement with the assessment',
          'Showed willingness to self-reflect',
          'Completed the full assessment process',
        ],
        developmentAreas: [
          'Continue building on identified competencies',
          'Seek feedback from mentors and peers',
        ],
        actionItems: [
          {
            title: 'Review your results',
            description: 'Take time to reflect on the assessment outcomes and how they align with your career goals.',
            priority: 'high',
          },
          {
            title: 'Schedule a strategy session',
            description: 'Book a call with your TQC Strategist to discuss personalized development paths.',
            priority: 'medium',
          },
        ],
        careerRecommendations: [
          'Continue engaging with Quantum Club resources',
          'Explore roles that align with your demonstrated strengths',
        ],
        nextSteps: 'Your assessment has been recorded. Consider sharing these results with potential employers through your TQC profile. Your strategist can help identify roles that match your unique profile.',
      }

      return new Response(
        JSON.stringify(fallbackInsights),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const aiData = await aiResponse.json()
    
    // Parse AI response - handle potential markdown wrapping
    let insights: AssessmentInsights
    try {
      let content = aiData.choices?.[0]?.message?.content || aiData.content || ''
      // Remove markdown code blocks if present
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      insights = JSON.parse(content)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Return a structured fallback
      insights = {
        strengths: ['Strong assessment completion'],
        developmentAreas: ['Continue self-development'],
        actionItems: [
          { title: 'Review results', description: 'Reflect on your assessment outcomes', priority: 'high' }
        ],
        careerRecommendations: ['Discuss results with your strategist'],
        nextSteps: 'Connect with your TQC Strategist to explore opportunities aligned with your profile.',
      }
    }

    return new Response(
      JSON.stringify(insights),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-assessment-insights:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate insights' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})