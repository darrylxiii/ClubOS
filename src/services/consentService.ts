import { supabase } from '@/integrations/supabase/client';

export interface ConsentReceipt {
  id: string;
  consent_type: string;
  scope: string;
  recipient_type?: string;
  recipient_id?: string;
  granted: boolean;
  consent_text?: string;
  granted_at: string;
  revoked_at?: string;
}

export async function grantConsent(
  consentType: string,
  scope: string,
  recipientType?: string,
  recipientId?: string,
  applicationId?: string
): Promise<ConsentReceipt> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('consent_receipts')
    .insert([{
      user_id: user.user.id,
      consent_type: consentType,
      scope,
      recipient_type: recipientType,
      recipient_id: recipientId,
      application_id: applicationId,
      granted: true,
      consent_text: `User granted ${scope} access for ${consentType}`
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function revokeConsent(consentId: string) {
  const { error } = await supabase
    .from('consent_receipts')
    .update({ 
      granted: false, 
      revoked_at: new Date().toISOString() 
    })
    .eq('id', consentId);

  if (error) throw error;
}

export async function getMyConsents(): Promise<ConsentReceipt[]> {
  const { data, error } = await supabase
    .from('consent_receipts')
    .select('*')
    .order('granted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
