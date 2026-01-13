interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateDailyChallenges({ supabase }: ActionContext) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Check existence
    const { data: existing } = await supabase.from('achievement_challenges').select('id').eq('challenge_type', 'daily').eq('start_date', today).limit(1);
    if (existing?.length) return { message: 'Already exists', success: true };

    const templates = [
        { name: 'Daily Explorer', description: 'View 3 jobs', criteria: { type: 'jobs_viewed', count: 3 }, bonus_points: 25 },
        { name: 'Application Sprint', description: 'Submit 1 app', criteria: { type: 'applications', count: 1 }, bonus_points: 50 },
        { name: 'Network Builder', description: 'Send 2 messages', criteria: { type: 'messages_sent', count: 2 }, bonus_points: 30 }
    ];

    await supabase.from('achievement_challenges').insert(templates.map(t => ({
        ...t, challenge_type: 'daily', start_date: today, end_date: today, is_active: true
    })));

    return { success: true, count: templates.length };
}
