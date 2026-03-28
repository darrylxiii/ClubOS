import { supabase } from '@/integrations/supabase/client';

export interface ConsentReceipt {
  id: string;
  consent_type: string;
  scope: string;
  recipient_type?: string;
  recipient_id?: string;
  granted: boolean;
  consent_text?: string;
  document_version?: string;
  granted_at: string;
  revoked_at?: string;
}

export async function grantConsent(
  consentType: string,
  scope: string,
  recipientType?: string,
  recipientId?: string,
  applicationId?: string,
  documentVersion?: string
): Promise<ConsentReceipt> {
  const { data, error } = await supabase.functions.invoke('record-consent', {
    body: {
      consents: [{
        consent_type: consentType,
        scope,
        consent_text: `User granted ${scope} access for ${consentType}`,
        document_version: documentVersion ?? undefined,
      }]
    }
  });

  if (error) throw error;
  return data?.consents?.[0] || data;
}

/**
 * Record acceptance of a specific version of a legal document (e.g. Terms of Service, Privacy Policy).
 * This creates an auditable consent receipt that tracks which version was accepted.
 */
export async function acceptDocumentVersion(
  documentType: 'terms_of_service' | 'privacy_policy' | 'acceptable_use' | 'data_processing' | string,
  documentVersion: string
): Promise<ConsentReceipt> {
  return grantConsent(
    documentType,
    'document_acceptance',
    undefined,
    undefined,
    undefined,
    documentVersion
  );
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
