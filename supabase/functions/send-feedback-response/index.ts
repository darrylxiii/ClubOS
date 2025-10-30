import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  feedback_id: string;
  resolution_status: 'acknowledged' | 'in_progress' | 'fixed' | 'wont_fix';
  resolution_message: string;
  resolved_by: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roles) {
      throw new Error('Insufficient permissions - admin role required');
    }

    const { feedback_id, resolution_status, resolution_message, resolved_by }: RequestBody = await req.json();

    if (!feedback_id || !resolution_status || !resolution_message || !resolved_by) {
      throw new Error('Missing required fields');
    }

    console.log('Processing feedback resolution:', { feedback_id, resolution_status });

    // Get feedback details
    const { data: feedback, error: feedbackError } = await supabase
      .from('user_feedback')
      .select('*, profiles!user_feedback_user_id_fkey(id, email, full_name)')
      .eq('id', feedback_id)
      .single();

    if (feedbackError || !feedback) {
      throw new Error('Feedback not found');
    }

    const feedbackUserId = feedback.user_id;
    const feedbackUserEmail = feedback.profiles?.email || feedback.email;
    const feedbackUserName = feedback.profiles?.full_name || feedbackUserEmail;

    console.log('Feedback user:', { feedbackUserId, feedbackUserEmail });

    // Get or create system user (The Quantum Club)
    let systemUserId: string;
    const { data: systemProfile, error: systemProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'system@thequantumclub.nl')
      .single();

    if (systemProfileError || !systemProfile) {
      // Create system user via auth
      const { data: authData, error: authCreateError } = await supabase.auth.admin.createUser({
        email: 'system@thequantumclub.nl',
        email_confirm: true,
        user_metadata: {
          full_name: 'The Quantum Club',
          is_system_account: true,
          account_type: 'company',
          can_be_messaged: true
        }
      });

      if (authCreateError || !authData.user) {
        console.error('Failed to create system user:', authCreateError);
        throw new Error('Failed to create system user');
      }

      systemUserId = authData.user.id;
      console.log('Created system user:', systemUserId);
    } else {
      systemUserId = systemProfile.id;
      console.log('Using existing system user:', systemUserId);
    }

    // Check if conversation already exists between system and feedback user
    const { data: existingConversations, error: convSearchError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', systemUserId);

    let conversationId: string | null = null;

    if (existingConversations && existingConversations.length > 0) {
      // Check if any of these conversations also include the feedback user
      for (const conv of existingConversations) {
        const { data: hasUser } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', feedbackUserId)
          .single();

        if (hasUser) {
          conversationId = conv.conversation_id;
          console.log('Found existing conversation:', conversationId);
          break;
        }
      }
    }

    // Create new conversation if none exists
    if (!conversationId) {
      const conversationTitle = `Feedback Response: ${feedback.page_title}`;
      
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: conversationTitle,
          type: 'direct',
          created_by: systemUserId
        })
        .select()
        .single();

      if (convError || !newConversation) {
        console.error('Failed to create conversation:', convError);
        throw new Error('Failed to create conversation');
      }

      conversationId = newConversation.id;
      console.log('Created new conversation:', conversationId);

      // Add participants
      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: conversationId,
            user_id: systemUserId,
            role: 'system'
          },
          {
            conversation_id: conversationId,
            user_id: feedbackUserId,
            role: 'candidate'
          }
        ]);

      if (participantsError) {
        console.error('Failed to add participants:', participantsError);
        throw new Error('Failed to add conversation participants');
      }
    }

    // Format the message
    const statusEmoji = {
      acknowledged: '👀',
      in_progress: '🔄',
      fixed: '✅',
      wont_fix: '❌'
    };

    const statusText = {
      acknowledged: 'Acknowledged',
      in_progress: 'In Progress',
      fixed: 'Fixed',
      wont_fix: "Won't Fix"
    };

    const messageContent = `📋 **Re: Your feedback on ${feedback.page_title}**

Hi ${feedbackUserName}! Thank you for sharing your feedback with us.

**Status:** ${statusEmoji[resolution_status]} ${statusText[resolution_status]}

${resolution_message}

Feel free to reply if you have any questions!

---
*Original feedback (${feedback.rating}/10): "${feedback.comment || 'No comment'}"*
*Submitted ${new Date(feedback.submitted_at).toLocaleDateString()}*`;

    // Send message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: systemUserId,
        content: messageContent,
        metadata: {
          feedback_id: feedback_id,
          resolution_status: resolution_status,
          is_system_message: true,
          message_type: 'feedback_resolution'
        }
      })
      .select()
      .single();

    if (messageError || !message) {
      console.error('Failed to send message:', messageError);
      throw new Error('Failed to send message');
    }

    console.log('Message sent:', message.id);

    // Update feedback with resolution details
    const { error: updateError } = await supabase
      .from('user_feedback')
      .update({
        resolution_status: resolution_status,
        resolved_at: new Date().toISOString(),
        resolved_by: resolved_by,
        resolution_message: resolution_message,
        resolution_conversation_id: conversationId
      })
      .eq('id', feedback_id);

    if (updateError) {
      console.error('Failed to update feedback:', updateError);
      throw new Error('Failed to update feedback record');
    }

    console.log('Feedback updated successfully');

    // Create notification for the user
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: feedbackUserId,
        title: 'Your feedback has been addressed',
        message: `The Quantum Club responded to your feedback on ${feedback.page_title}`,
        type: 'message',
        action_url: `/messages?conversation=${conversationId}`,
        metadata: {
          feedback_id: feedback_id,
          conversation_id: conversationId,
          resolution_status: resolution_status
        }
      });

    if (notificationError) {
      console.warn('Failed to create notification:', notificationError);
      // Don't fail the request if notification fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: conversationId,
        message_id: message.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in send-feedback-response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
