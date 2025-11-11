import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TargetCompany {
  id: string;
  company_id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
  location: string | null;
  status: 'new' | 'targeting' | 'hunting' | 'paused' | 'done';
  priority: number;
  notes: string | null;
  job_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  company_insider: string | null;
  enrichment_source: string | null;
  job_specifications: any;
  company_name?: string;
  company_logo?: string;
  creator_name?: string;
  creator_avatar?: string;
  job_title?: string;
  vote_count?: number;
  comment_count?: number;
  contact_count?: number;
  jobs?: any[];
  votes?: any[];
  comments?: any[];
}

export const useTargetCompanies = (companyId?: string | null) => {
  const [companies, setCompanies] = useState<TargetCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadTargetCompanies = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('target_companies')
        .select(`
          *,
          jobs (id, title, status),
          votes:target_company_votes (user_id),
          comments:target_company_comments (id, content, created_at, user_id)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with profile data
      const enrichedData = await Promise.all(
        (data || []).map(async (company) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', company.created_by)
            .single();

          return {
            ...company,
            status: company.status as 'new' | 'targeting' | 'hunting' | 'paused' | 'done',
            creator_name: profile?.full_name,
            creator_avatar: profile?.avatar_url,
            vote_count: company.votes?.length || 0,
            comment_count: company.comments?.length || 0,
          };
        })
      );

      setCompanies(enrichedData as any);
    } catch (error: any) {
      console.error('Error loading target companies:', error);
      toast.error('Failed to load target companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTargetCompanies();
    }
  }, [user, companyId]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('target_companies_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'target_companies',
        },
        () => {
          loadTargetCompanies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, companyId]);

  const handleDeleteCompany = async (id: string) => {
    try {
      const { error } = await supabase
        .from('target_companies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Target company deleted');
      loadTargetCompanies();
    } catch (error: any) {
      console.error('Error deleting target company:', error);
      toast.error('Failed to delete target company');
    }
  };

  const handleVote = async (targetCompanyId: string, hasVoted: boolean) => {
    if (!user) return;

    try {
      if (hasVoted) {
        const { error } = await supabase
          .from('target_company_votes')
          .delete()
          .eq('target_company_id', targetCompanyId)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Vote removed');
      } else {
        const { error } = await supabase
          .from('target_company_votes')
          .insert({
            target_company_id: targetCompanyId,
            user_id: user.id,
          });

        if (error) throw error;
        toast.success('Vote added');
      }

      loadTargetCompanies();
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error('Failed to update vote');
    }
  };

  return {
    companies,
    loading,
    loadTargetCompanies,
    handleDeleteCompany,
    handleVote,
  };
};
