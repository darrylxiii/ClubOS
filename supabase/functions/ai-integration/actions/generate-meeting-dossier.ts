interface ActionContext {
    supabase: any;
    payload: any;
    userId: string | null;
}

export async function handleGenerateMeetingDossier({ supabase, payload, userId }: ActionContext) {
    const { recordingId, meetingId, candidateId, options = {} } = payload;
    if (!userId) throw new Error('Unauthorized');

    // Fetch recording & AI data
    const { data: recording } = await supabase.from('meeting_recordings_extended').select('*').eq('id', recordingId).single();
    if (!recording) throw new Error('Recording not found');

    // Fetch meeting details
    const { data: meeting } = await supabase.from('meetings').select('*, host:profiles!meetings_host_id_fkey(full_name)').eq('id', recording.meeting_id || meetingId).single();

    // Fetch candidate
    let candidate = null;
    if (candidateId) {
        const { data } = await supabase.from('profiles').select('*').eq('id', candidateId).single();
        candidate = data;
    }

    // Fetch insights & scorecards
    const { data: insights } = await supabase.from('meeting_insights').select('*').eq('recording_id', recordingId);
    const { data: scorecards } = await supabase.from('interview_scores').select('*, interviewer:profiles!interview_scores_interviewer_id_fkey(full_name)').eq('meeting_id', recording.meeting_id || meetingId);

    // Compile Dossier
    const aiSummary = recording.ai_summary || {};
    const dossierContent = {
        generatedAt: new Date().toISOString(),
        recording: {
            id: recording.id,
            title: recording.title || meeting?.title,
            duration: recording.duration_seconds,
            date: recording.created_at,
        },
        meeting: meeting ? { title: meeting.title, host: meeting.host?.full_name } : null,
        candidate: candidate ? { name: candidate.full_name, title: candidate.current_title } : null,
        analysis: {
            executiveSummary: aiSummary.executiveSummary || recording.executive_summary,
            recommendation: aiSummary.decisionGuidance?.recommendation,
            keyInsights: aiSummary.decisionGuidance?.keyInsights || [],
        },
        insights: (insights || []).map((i: any) => ({ type: i.insight_type, title: i.title, priority: i.priority })),
        scorecards: (scorecards || []).map((s: any) => ({ interviewer: s.interviewer?.full_name, rating: s.overall_rating, notes: s.notes })),
        actionItems: aiSummary.actionItems || []
    };

    // Create Record
    const shareToken = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (options.expiryHours || 72));

    const { data: dossier, error } = await supabase.from('meeting_dossiers').insert({
        meeting_id: recording.meeting_id || meetingId,
        recording_id: recordingId,
        candidate_id: candidateId,
        generated_by: userId,
        title: `Dossier - ${candidate?.full_name || recording.title || 'Unknown'}`,
        content: dossierContent,
        share_token: shareToken,
        expires_at: expiresAt.toISOString()
    }).select().single();

    if (error) throw new Error(`Dossier creation failed: ${error.message}`);

    return { success: true, dossier: { id: dossier.id, shareToken, expiresAt, content: dossierContent } };
}
