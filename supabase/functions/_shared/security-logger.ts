import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

export interface SecurityLogEvent {
  eventType: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

export async function logSecurityEvent(event: SecurityLogEvent) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { error } = await supabase.from('security_logs').insert({
      event_type: event.eventType,
      details: event.details,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      user_id: event.userId,
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    console.error('Error logging security event:', error);
  }
}
