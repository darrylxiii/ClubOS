import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, userId, invitationToken } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting profile merge:', { candidateId, userId });

    const { data: candidate, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidate profile not found');
    }

    const { error: linkError } = await supabase
      .from('candidate_profiles')
      .update({ 
        user_id: userId,
        merged_at: new Date().toISOString(),
        invitation_status: 'registered',
        merged_from_user_id: userId
      })
      .eq('id', candidateId);

    if (linkError) throw linkError;

    if (invitationToken) {
      await supabase
        .from('candidate_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          created_user_id: userId
        })
        .eq('invitation_token', invitationToken);
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const updates: any = {};
    
    if (!userProfile?.full_name && candidate.full_name) {
      updates.full_name = candidate.full_name;
    }
    if (!userProfile?.avatar_url && candidate.avatar_url) {
      updates.avatar_url = candidate.avatar_url;
    }
    if (!userProfile?.bio && candidate.ai_summary) {
      updates.bio = candidate.ai_summary;
    }
    if (!userProfile?.location && candidate.desired_locations?.[0]) {
      updates.location = candidate.desired_locations[0];
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
    }

    const { error: appsError } = await supabase
      .from('applications')
      .update({ user_id: userId })
      .eq('candidate_id', candidateId)
      .is('user_id', null);

    if (appsError) console.error('Error updating applications:', appsError);

    await supabase.from('candidate_interactions').insert({
      candidate_id: candidateId,
      interaction_type: 'system_event',
      title: 'Profile merged',
      content: `Candidate registered on platform. Profile data merged with user account.`,
      created_by: userId,
      visible_to_candidate: true
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Profile merged successfully',
        candidateId,
        userId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error merging profile:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
