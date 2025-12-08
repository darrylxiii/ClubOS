import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ReferralPolicy {
  id: string;
  referrer_id: string;
  policy_type: 'company' | 'job' | 'member';
  company_id?: string;
  job_id?: string;
  referred_member_id?: string;
  source_type: string;
  share_percentage: number;
  is_active: boolean;
  claimed_at: string;
  notes?: string;
  created_at: string;
  company?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  job?: {
    id: string;
    title: string;
    salary_min?: number;
    salary_max?: number;
  };
  referred_member?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ReferralEarning {
  id: string;
  referrer_id: string;
  policy_id?: string;
  company_id?: string;
  job_id?: string;
  candidate_id?: string;
  application_id?: string;
  placement_fee_total: number;
  referrer_share_percentage: number;
  earned_amount: number;
  projected_amount: number;
  weighted_amount: number;
  stage_probability: number;
  status: 'projected' | 'qualified' | 'pending_payment' | 'paid' | 'cancelled';
  qualified_at?: string;
  paid_at?: string;
  created_at: string;
  company?: {
    id: string;
    name: string;
  };
  job?: {
    id: string;
    title: string;
  };
  candidate?: {
    id: string;
    full_name: string;
  };
  application?: {
    id: string;
    status: string;
    current_stage_index: number;
  };
}

export interface RevenueShare {
  id: string;
  user_id: string;
  share_type: string;
  share_percentage: number;
  share_fixed_amount?: number;
  applies_to: string;
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  min_deal_value?: number;
}

export interface ReferralStats {
  totalRevenueGenerated: number;
  yourEarnings: number;
  projectedEarnings: number;
  activePipelines: number;
  companiesCount: number;
  jobsCount: number;
  memberReferralsCount: number;
  successRate: number;
}

export function useReferralPolicies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-policies', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('referral_policies')
        .select(`
          *,
          company:companies(id, name, logo_url),
          job:jobs(id, title, salary_min, salary_max)
        `)
        .eq('referrer_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ReferralPolicy[];
    },
    enabled: !!user,
  });
}

export function useReferralEarnings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-earnings', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('referral_earnings')
        .select(`
          *,
          company:companies(id, name),
          job:jobs(id, title),
          candidate:candidate_profiles(id, full_name),
          application:applications(id, status, current_stage_index)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ReferralEarning[];
    },
    enabled: !!user,
  });
}

export function useRevenueShares() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['revenue-shares', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('referral_revenue_shares')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      return data as RevenueShare[];
    },
    enabled: !!user,
  });
}

export function useReferralStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async (): Promise<ReferralStats> => {
      if (!user) {
        return {
          totalRevenueGenerated: 0,
          yourEarnings: 0,
          projectedEarnings: 0,
          activePipelines: 0,
          companiesCount: 0,
          jobsCount: 0,
          memberReferralsCount: 0,
          successRate: 0,
        };
      }

      // Get all earnings
      const { data: earnings } = await supabase
        .from('referral_earnings')
        .select('*')
        .eq('referrer_id', user.id);

      // Get all policies
      const { data: policies } = await supabase
        .from('referral_policies')
        .select('*')
        .eq('referrer_id', user.id)
        .eq('is_active', true);

      const earningsData = earnings || [];
      const policiesData = policies || [];

      const totalRevenueGenerated = earningsData.reduce((sum, e) => sum + (e.placement_fee_total || 0), 0);
      const yourEarnings = earningsData
        .filter(e => e.status === 'paid' || e.status === 'pending_payment')
        .reduce((sum, e) => sum + (e.earned_amount || 0), 0);
      const projectedEarnings = earningsData
        .filter(e => e.status === 'projected' || e.status === 'qualified')
        .reduce((sum, e) => sum + (e.weighted_amount || 0), 0);
      
      const activePipelines = earningsData.filter(e => e.status === 'projected' || e.status === 'qualified').length;
      const companiesCount = policiesData.filter(p => p.policy_type === 'company').length;
      const jobsCount = policiesData.filter(p => p.policy_type === 'job').length;
      const memberReferralsCount = policiesData.filter(p => p.policy_type === 'member').length;

      const totalPlacements = earningsData.filter(e => e.status !== 'cancelled').length;
      const successfulPlacements = earningsData.filter(e => e.status === 'paid').length;
      const successRate = totalPlacements > 0 ? (successfulPlacements / totalPlacements) * 100 : 0;

      return {
        totalRevenueGenerated,
        yourEarnings,
        projectedEarnings,
        activePipelines,
        companiesCount,
        jobsCount,
        memberReferralsCount,
        successRate,
      };
    },
    enabled: !!user,
  });
}

export function useCreateReferralPolicy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policy: {
      policy_type: 'company' | 'job' | 'member';
      company_id?: string;
      job_id?: string;
      referred_member_id?: string;
      source_type: string;
      share_percentage?: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('referral_policies')
        .insert({
          referrer_id: user.id,
          ...policy,
          share_percentage: policy.share_percentage || 10,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-policies'] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
      toast.success('Referral policy created');
    },
    onError: (error) => {
      toast.error('Failed to create policy: ' + error.message);
    },
  });
}

export function useCompanyJobs(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company-jobs', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          status,
          salary_min,
          salary_max,
          created_at
        `)
        .eq('company_id', companyId)
        .eq('status', 'published');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useJobApplications(jobId: string | undefined) {
  return useQuery({
    queryKey: ['job-applications-referral', jobId],
    queryFn: async () => {
      if (!jobId) return [];

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          current_stage_index,
          stages,
          created_at,
          candidate:candidate_profiles(id, full_name)
        `)
        .eq('job_id', jobId);

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });
}
