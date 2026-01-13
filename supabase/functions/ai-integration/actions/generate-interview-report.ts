import { fetchAI } from '../../_shared/ai-fetch.ts';

interface ActionContext {
    supabase: any;
    payload: any;
    userId: string | null;
}

export async function handleGenerateInterviewReport({ supabase, payload, userId }: ActionContext) {
    const { meetingId, candidateId, roleTitle, companyName } = payload;
    if (!meetingId) throw new Error('meetingId required');

    // Fetch transcript
    const { data: transcripts } = await supabase.from('meeting_transcripts').select('text').eq('meeting_id', meetingId).order('timestamp_ms', { ascending: true });
    const fullTranscript = transcripts?.map((t: any) => t.text).join(' ') || '';

    // AI Generation
    const response = await fetchAI({
        model: "google/gemini-2.5-flash",
        messages: [
            {
                role: "system",
                content: `You are an expert interview analyst. Generate a comprehensive post-interview report in JSON:
{
  "executive_summary": "2-3 paragraph summary",
  "key_strengths": ["s1", "s2"],
  "key_weaknesses": ["w1"],
  "technical_assessment": "...",
  "cultural_fit_assessment": "...",
  "communication_assessment": "...",
  "highlights": [{"timestamp": "00:00", "description": "...", "type": "strength"}],
  "recommendation": "advance|reject",
  "recommendation_confidence": 0-100,
  "recommendation_reasoning": "..."
}`
            },
            {
                role: "user",
                content: `Role: ${roleTitle}\nCompany: ${companyName}\nTranscript: ${fullTranscript.substring(0, 15000)}`
            }
        ]
    }, { timeoutMs: 45000 });

    if (!response.ok) throw new Error('AI analysis failed');
    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const report = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);

    // Store Report
    const { data: reportData, error } = await supabase.from('interview_reports').insert({
        meeting_id: meetingId,
        candidate_id: candidateId,
        ...report
    }).select().single();

    if (error) throw new Error(`Report storage failed: ${error.message}`);
    return { report: reportData };
}
