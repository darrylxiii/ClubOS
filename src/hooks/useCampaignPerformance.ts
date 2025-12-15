
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CampaignPerformance {
    campaign_id: string;
    campaign_name: string;
    source: string;
    total_leads: number;
    qualified_leads: number;
    won_deals: number;
    total_revenue: number;
    pipeline_value: number;
    last_activity: string;
}

export const useCampaignPerformance = () => {
    return useQuery({
        queryKey: ['campaign-performance'],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('campaign_performance' as any)
                .select('*')
                .order('total_revenue', { ascending: false }) as any);

            if (error) throw error;
            return (data || []) as CampaignPerformance[];
        },
        refetchInterval: 30000, // Refresh every 30s
    });
};
