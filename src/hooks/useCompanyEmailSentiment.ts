import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { aiService } from '@/services/aiService';

export interface CompanyEmailSentiment {
  id: string;
  company_id: string;
  total_emails: number;
  inbound_count: number;
  outbound_count: number;
  avg_sentiment_score: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  last_email_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  response_rate: number;
  avg_response_time_hours: number;
  health_score: number;
  health_status: 'excellent' | 'good' | 'at_risk' | 'critical' | 'unknown';
  top_topics: string[];
  sentiment_trend: 'improving' | 'stable' | 'declining';
  updated_at: string;
  // Joined
  company_name?: string;
  company_logo?: string;
}

export interface EmailContactMatch {
  id: string;
  email_address: string;
  message_id: string | null;
  company_id: string;
  contact_id: string | null;
  match_type: 'domain' | 'exact_email' | 'profile';
  match_confidence: number;
  direction: 'inbound' | 'outbound';
  subject: string | null;
  sentiment_score: number | null;
  sentiment_label: 'positive' | 'neutral' | 'negative' | null;
  analyzed_at: string | null;
  email_date: string | null;
  created_at: string;
}

export function useCompanyEmailSentiment(companyId?: string) {
  return useQuery({
    queryKey: ['company-email-sentiment', companyId],
    queryFn: async () => {
      let query = supabase
        .from('company_email_sentiment')
        .select(`
          *,
          companies:company_id(name, logo_url)
        `)
        .order('health_score', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching company email sentiment:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        sentiment_breakdown: item.sentiment_breakdown as { positive: number; neutral: number; negative: number },
        top_topics: (item.top_topics || []) as string[],
        company_name: (item.companies as any)?.name,
        company_logo: (item.companies as any)?.logo_url,
      })) as CompanyEmailSentiment[];
    },
    enabled: true,
  });
}

export function useEmailContactMatches(companyId?: string, contactId?: string) {
  return useQuery({
    queryKey: ['email-contact-matches', companyId, contactId],
    queryFn: async () => {
      let query = supabase
        .from('email_contact_matches')
        .select('*')
        .order('email_date', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching email contact matches:', error);
        throw error;
      }

      return data as EmailContactMatch[];
    },
    enabled: !!(companyId || contactId),
  });
}

export function useAnalyzeEmailSentiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: {
      subject: string;
      body: string;
      from_email: string;
      to_emails?: string[];
      email_date?: string;
      email_id?: string;
    }) => {
      // Use the unified aiService
      return await aiService.analyzeEmailSentiment({
        email: { ...email, id: email.email_id || crypto.randomUUID() },
        save_match: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-email-sentiment'] });
      queryClient.invalidateQueries({ queryKey: ['email-contact-matches'] });
      toast.success('Email sentiment analyzed');
    },
    onError: (error) => {
      console.error('Error analyzing email sentiment:', error);
      toast.error('Failed to analyze email sentiment');
    },
  });
}

export function useAggregateCompanySentiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { company_id?: string; all?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('aggregate-company-sentiment', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-email-sentiment'] });
      toast.success(`Aggregated sentiment for ${data.processed_count} companies`);
    },
    onError: (error) => {
      console.error('Error aggregating company sentiment:', error);
      toast.error('Failed to aggregate sentiment');
    },
  });
}

export function useMatchEmailToCompany() {
  return useMutation({
    mutationFn: async (email_address: string) => {
      const { data, error } = await supabase.functions.invoke('match-emails-to-companies', {
        body: { email_address },
      });

      if (error) throw error;
      return data;
    },
  });
}
