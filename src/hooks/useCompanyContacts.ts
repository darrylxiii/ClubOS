import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompanyContact {
  id: string;
  company_id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  phone: string | null;
  is_primary: boolean;
  source: 'manual' | 'auto_detected' | 'profile';
  profile_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyDomain {
  id: string;
  company_id: string;
  domain: string;
  is_primary: boolean;
  is_blocked: boolean;
  created_at: string;
}

export interface ContactEmailSentiment {
  id: string;
  contact_id: string;
  company_id: string;
  email: string;
  total_emails: number;
  inbound_count: number;
  outbound_count: number;
  avg_sentiment_score: number;
  sentiment_trend: 'improving' | 'stable' | 'declining';
  last_email_at: string | null;
  last_sentiment: string | null;
  updated_at: string;
}

export function useCompanyContacts(companyId?: string) {
  return useQuery({
    queryKey: ['company-contacts', companyId],
    queryFn: async () => {
      let query = supabase
        .from('company_contacts')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('full_name', { ascending: true });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching company contacts:', error);
        throw error;
      }

      return data as CompanyContact[];
    },
    enabled: true,
  });
}

export function useCompanyDomains(companyId?: string) {
  return useQuery({
    queryKey: ['company-domains', companyId],
    queryFn: async () => {
      let query = supabase
        .from('company_domains')
        .select('*')
        .order('is_primary', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching company domains:', error);
        throw error;
      }

      return data as CompanyDomain[];
    },
    enabled: true,
  });
}

export function useContactEmailSentiment(companyId?: string) {
  return useQuery({
    queryKey: ['contact-email-sentiment', companyId],
    queryFn: async () => {
      let query = supabase
        .from('contact_email_sentiment')
        .select(`
          *,
          company_contacts:contact_id(full_name, role, email)
        `)
        .order('avg_sentiment_score', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching contact email sentiment:', error);
        throw error;
      }

      return data as (ContactEmailSentiment & { company_contacts: Partial<CompanyContact> })[];
    },
    enabled: true,
  });
}

export function useCreateCompanyContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<CompanyContact, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('company_contacts')
        .insert({
          ...contact,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      toast.success('Contact added');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('This contact already exists for this company');
      } else {
        toast.error('Failed to add contact');
      }
    },
  });
}

export function useUpdateCompanyContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompanyContact> & { id: string }) => {
      const { data, error } = await supabase
        .from('company_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      toast.success('Contact updated');
    },
    onError: () => {
      toast.error('Failed to update contact');
    },
  });
}

export function useDeleteCompanyContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-contacts'] });
      toast.success('Contact deleted');
    },
    onError: () => {
      toast.error('Failed to delete contact');
    },
  });
}

export function useCreateCompanyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (domain: Omit<CompanyDomain, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('company_domains')
        .insert(domain)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-domains'] });
      toast.success('Domain added');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('This domain is already registered');
      } else {
        toast.error('Failed to add domain');
      }
    },
  });
}

export function useDeleteCompanyDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-domains'] });
      toast.success('Domain removed');
    },
    onError: () => {
      toast.error('Failed to remove domain');
    },
  });
}
