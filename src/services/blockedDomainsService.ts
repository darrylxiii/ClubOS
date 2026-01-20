import { supabase } from '@/integrations/supabase/client';

export interface BlockedDomain {
  id: string;
  company_name: string;
  domain: string;
  reason?: string | null;
  created_at: string;
}

export async function getBlockedDomains(): Promise<BlockedDomain[]> {
  const { data, error } = await supabase
    .from('blocked_domains')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as BlockedDomain[];
}

export async function addBlockedDomain(companyName: string, domain: string, reason?: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('blocked_domains')
    .insert([{ company_name: companyName, domain, reason, user_id: user.user.id }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeBlockedDomain(domainId: string) {
  const { error } = await supabase
    .from('blocked_domains')
    .delete()
    .eq('id', domainId);

  if (error) throw error;
}

export async function isCompanyBlocked(candidateId: string, companyEmail: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('is_company_blocked_by_candidate', {
      _candidate_id: candidateId,
      _company_email: companyEmail
    });

  if (error) throw error;
  return data || false;
}
