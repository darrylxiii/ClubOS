import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlacementFee } from './useFinancialData';

export interface PlacementFeeWithContext extends PlacementFee {
  job_title: string | null;
  company_name: string | null;
}

export const usePlacementFeesWithContext = (year?: number) => {
  return useQuery({
    queryKey: ['placement-fees-with-context', year],
    queryFn: async () => {
      let query = supabase
        .from('placement_fees')
        .select(`
          *,
          jobs!inner (
            title,
            companies!inner (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year + 1}-01-01`;
        query = query.gte('hired_date', startDate).lt('hired_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((fee: any) => ({
        ...fee,
        job_title: fee.jobs?.title || null,
        company_name: fee.jobs?.companies?.name || null,
      })) as PlacementFeeWithContext[];
    },
  });
};
