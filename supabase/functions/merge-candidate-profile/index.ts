import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { logSecurityEvent } from "../_shared/security-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const requestSchema = z.object({
  candidateId: z.string().uuid(),
  userId: z.string().uuid(),
  invitationToken: z.string().max(200).optional(),
  mergeType: z.enum(['auto', 'manual', 'invitation']).default('invitation'),
  mergedBy: z.string().uuid().optional()
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
    const { candidateId, userId, invitationToken, mergeType, mergedBy } = requestSchema.parse(body);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const startTime = Date.now();
    console.log('Starting profile merge:', { candidateId, userId, mergeType, mergedBy });

    // Log security event
    await logSecurityEvent({
      eventType: 'candidate_merge_started',
      details: { candidateId, userId, mergeType },
      userId: mergedBy || userId,
    });

    // Validate candidate exists and not already merged
    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('Candidate not found:', candidateError);
      throw new Error('Candidate profile not found');
    }

    if (candidate.merged_at) {
      throw new Error('Candidate profile already merged');
    }

    // Validate user exists
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('User profile not found:', userError);
      throw new Error('User profile not found');
    }

    // Create merge log entry
    const mergeLogId = crypto.randomUUID();
    const { error: logError } = await supabase
      .from('candidate_merge_log')
      .insert({
        id: mergeLogId,
        candidate_id: candidateId,
        profile_id: userId,
        merged_by: mergedBy || userId,
        merge_type: mergeType,
        merge_status: 'pending',
        confidence_score: candidate.user_id === userId ? 95 : 90,
        match_type: candidate.user_id === userId ? 'partial_link' : 'email_match',
      });

    if (logError) {
      console.error('Failed to create merge log:', logError);
    }

    // Link candidate to user
    const { error: linkError } = await supabase
      .from('candidate_profiles')
      .update({ 
        user_id: userId,
        merged_at: new Date().toISOString(),
        invitation_status: 'registered',
        merged_from_user_id: userId
      })
      .eq('id', candidateId);

    if (linkError) {
      console.error('Failed to link candidate:', linkError);
      throw linkError;
    }

    // Update invitation if provided
    if (invitationToken) {
      const { error: inviteError } = await supabase
        .from('candidate_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          created_user_id: userId
        })
        .eq('invitation_token', invitationToken);

      if (inviteError) {
        console.error('Failed to update invitation:', inviteError);
      }
    }

    // Prepare profile updates
    const updates: any = {};
    const mergedFields: string[] = [];
    
    // Merge fields intelligently (candidate data → user profile)
    if (!userProfile.full_name && candidate.full_name) {
      updates.full_name = candidate.full_name;
      mergedFields.push('full_name');
    }
    if (!userProfile.avatar_url && candidate.avatar_url) {
      updates.avatar_url = candidate.avatar_url;
      mergedFields.push('avatar_url');
    }
    if (!userProfile.bio && candidate.ai_summary) {
      updates.bio = candidate.ai_summary;
      mergedFields.push('bio');
    }
    if (!userProfile.location && candidate.desired_locations?.[0]) {
      updates.location = candidate.desired_locations[0];
      mergedFields.push('location');
    }
    if (!userProfile.phone && candidate.phone) {
      updates.phone = candidate.phone;
      mergedFields.push('phone');
    }
    
    // Merge compensation if not set
    if (!userProfile.desired_salary_min && candidate.desired_salary_min) {
      updates.desired_salary_min = candidate.desired_salary_min;
      updates.desired_salary_max = candidate.desired_salary_max;
      updates.preferred_currency = candidate.preferred_currency;
      mergedFields.push('compensation');
    }
    
    // Merge work preferences
    if (!userProfile.remote_work_preference && candidate.remote_preference) {
      updates.remote_work_preference = candidate.remote_preference;
      mergedFields.push('remote_preference');
    }
    if (!userProfile.preferred_work_locations && candidate.desired_locations) {
      updates.preferred_work_locations = candidate.desired_locations;
      mergedFields.push('work_locations');
    }
    if (!userProfile.notice_period && candidate.notice_period) {
      updates.notice_period = candidate.notice_period;
      mergedFields.push('notice_period');
    }
    if (!userProfile.linkedin_url && candidate.linkedin_url) {
      updates.linkedin_url = candidate.linkedin_url;
      mergedFields.push('linkedin_url');
    }

    // Update profile if there are changes
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update profile:', updateError);
        throw updateError;
      }
      console.log(`Merged ${mergedFields.length} fields:`, mergedFields);
    } else {
      console.log('No fields to merge - profile already complete');
    }

    // Link applications to user
    const { error: appsError } = await supabase
      .from('applications')
      .update({ user_id: userId })
      .eq('candidate_id', candidateId)
      .is('user_id', null);

    let appsCount = 0;
    if (!appsError) {
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', candidateId)
        .eq('user_id', userId);
      appsCount = count || 0;
    }

    if (appsError) {
      console.error('Error updating applications:', appsError);
    } else {
      console.log(`Linked ${appsCount || 0} applications to user`);
    }

    // Create interaction log
    const { error: interactionError } = await supabase.from('candidate_interactions').insert({
      candidate_id: candidateId,
      interaction_type: 'system_event',
      title: 'Profile merged',
      content: `Candidate profile merged with user account. Merged ${mergedFields.length} fields: ${mergedFields.join(', ')}. Linked ${appsCount || 0} applications.`,
      created_by: mergedBy || userId,
      visible_to_candidate: true,
      metadata: { 
        merged_fields: mergedFields, 
        merge_timestamp: new Date().toISOString(),
        merge_type: mergeType,
        applications_linked: appsCount || 0
      }
    });

    if (interactionError) {
      console.error('Failed to create interaction log:', interactionError);
    }

    // Update merge log to completed
    const duration = Date.now() - startTime;
    await supabase
      .from('candidate_merge_log')
      .update({
        merge_status: 'completed',
        completed_at: new Date().toISOString(),
        merged_fields: { fields: mergedFields, count: mergedFields.length },
      })
      .eq('id', mergeLogId);

    // Log security event
    await logSecurityEvent({
      eventType: 'candidate_merge_completed',
      details: {
        candidateId,
        userId,
        mergeType,
        mergedFields,
        applicationsLinked: appsCount || 0,
        durationMs: duration,
      },
      userId: mergedBy || userId,
    });

    console.log(`Merge completed successfully in ${duration}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Profile merged successfully',
        candidateId,
        userId,
        mergedFields,
        applicationsLinked: appsCount || 0,
        duration: `${duration}ms`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error merging profile:', error);
    
    // Log security event for failure
    await logSecurityEvent({
      eventType: 'candidate_merge_failed',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        candidateId: body?.candidateId,
        userId: body?.userId,
      },
      userId: body?.mergedBy || body?.userId,
    }).catch(e => console.error('Failed to log security event:', e));

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to merge profile'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
