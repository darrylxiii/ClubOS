interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateCertificate({ supabase, payload }: ActionContext) {
    const { courseId, userId } = payload;

    const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
    const { data: skills } = await supabase.from('course_skills').select('skill_name').eq('course_id', courseId);

    const certificateNumber = `QC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const verificationCode = Math.random().toString(36).substr(2, 12).toUpperCase();

    const { data: certificate, error } = await supabase.from('certificates').insert({
        user_id: userId,
        course_id: courseId,
        certificate_number: certificateNumber,
        verification_code: verificationCode,
        metadata: {
            courseName: course?.title,
            userName: profile?.full_name,
            skills: skills?.map((s: any) => s.skill_name) || []
        }
    }).select().single();

    if (error) throw new Error(error.message);
    return { success: true, certificate };
}
