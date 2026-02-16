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
  const { data, error } = await supabase.functions.invoke('record-consent', {
    body: {
      consents: [{
        consent_type: consentType,
        scope,
        consent_text: `User granted ${scope} access for ${consentType}`
      }]
    }
  });

  if (error) throw error;
  return data?.consents?.[0] || data;
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
