import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
  action: z.enum(['created', 'approved', 'declined']),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('[Validation] Invalid request parameters:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { requestId, action } = validationResult.data;
    console.log(`[Club Sync] Processing ${action} notification for request:`, requestId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch request details with related data
    const { data: request, error: requestError } = await supabase
      .from('club_sync_requests')
      .select(`
        *,
        job:jobs(
          id,
          title,
          company:companies(name, id)
        ),
        requester:requested_by(full_name, email),
        reviewer:reviewed_by(full_name, email)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('[Club Sync] Request not found:', requestError);
      throw new Error('Club Sync request not found');
    }

    // Prepare notification based on action
    let notificationTitle = '';
    let notificationMessage = '';
    let recipientIds: string[] = [];

    if (action === 'created') {
      // Notify all admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      recipientIds = admins?.map(a => a.user_id) || [];
      notificationTitle = 'New Club Sync Request';
      notificationMessage = `${request.requester?.full_name} requested Club Sync for "${request.job?.title}" at ${request.job?.company?.name}`;
    } else if (action === 'approved') {
      // Notify the requester
      recipientIds = [request.requested_by];
      notificationTitle = 'Club Sync Request Approved';
      notificationMessage = `Your Club Sync request for "${request.job?.title}" has been approved. We'll start sourcing candidates shortly.`;
    } else if (action === 'declined') {
      // Notify the requester
      recipientIds = [request.requested_by];
      notificationTitle = 'Club Sync Request Declined';
      notificationMessage = `Your Club Sync request for "${request.job?.title}" has been declined${request.admin_notes ? `: ${request.admin_notes}` : '.'}`;
    }

    // Create notifications for all recipients
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      title: notificationTitle,
      message: notificationMessage,
      type: 'club_sync',
      action_url: action === 'created' ? '/admin/club-sync-requests' : '/partner/jobs',
      metadata: {
        request_id: requestId,
        job_id: request.job_id,
        action: action
      }
    }));

    if (notifications.length > 0) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error('[Club Sync] Failed to create notifications:', notificationError);
        throw new Error('Failed to create notifications');
      }

      console.log(`[Club Sync] Created ${notifications.length} notification(s)`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Internal] Error in notify-club-sync-request:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notifications' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
