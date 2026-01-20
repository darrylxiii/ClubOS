import { supabase } from '@/integrations/supabase/client';

export interface DossierShare {
  id: string;
  candidate_id: string;
  token: string;
  expires_at: string;
  allowed_domains?: string[];
  watermark_text?: string;
  view_count: number;
  is_revoked: boolean;
  created_at: string;
}

export interface DossierView {
  id: string;
  viewer_email?: string;
  viewer_name?: string;
  viewer_company?: string;
  viewed_at: string;
  ip_address?: unknown;
}

export async function createDossierShare(
  candidateId: string,
  expiresInHours: number = 72,
  allowedDomains?: string[]
): Promise<DossierShare> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const { data: tokenData } = await supabase.rpc('generate_dossier_share_token');
  
  const { data, error } = await supabase
    .from('dossier_shares')
    .insert([{
      candidate_id: candidateId,
      shared_by: user.user.id,
      token: tokenData,
      expires_at: expiresAt.toISOString(),
      allowed_domains: allowedDomains,
      watermark_text: `Confidential - ${new Date().toLocaleDateString()}`
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDossierViews(shareId: string): Promise<DossierView[]> {
  const { data, error } = await supabase
    .from('dossier_views')
    .select('*')
    .eq('dossier_share_id', shareId)
    .order('viewed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function revokeDossierShare(shareId: string) {
  const { error } = await supabase
    .from('dossier_shares')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', shareId);

  if (error) throw error;
}
