import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, subMonths, format } from 'date-fns';

export type ReportDataSource = 'deals' | 'prospects' | 'activities';
export type ReportMetric = 'count' | 'sum_value' | 'avg_score';
export type ReportGroupBy = 'stage' | 'owner' | 'source' | 'campaign' | 'month';

export interface ReportDataPoint {
    name: string;
    value: number;
    [key: string]: any;
}

export function useCRMReportData(
    dataSource: ReportDataSource,
    groupBy: ReportGroupBy,
    metric: ReportMetric
) {
    const [data, setData] = useState<ReportDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // We'll fetch raw data and aggregate client-side for flexibility
            // For production with >10k rows, this should be moved to an RPC or materialized view

            let query;

            if (dataSource === 'deals') {
                // Deals are prospects with value
                query = supabase
                    .from('crm_prospects')
                    .select(`
            id, stage, deal_value, owner_id, source, created_at,
            owner:profiles!crm_prospects_owner_id_fkey(full_name),
            campaign:crm_campaigns!crm_prospects_campaign_id_fkey(name)
          `)
                    .gt('deal_value', 0);
            } else if (dataSource === 'prospects') {
                query = supabase
                    .from('crm_prospects')
                    .select(`
            id, stage, composite_score, owner_id, source, created_at,
            owner:profiles!crm_prospects_owner_id_fkey(full_name),
            campaign:crm_campaigns!crm_prospects_campaign_id_fkey(name)
          `);
            } else {
                // Placeholder for activities
                setData([]);
                setLoading(false);
                return;
            }

            const { data: rawData, error: fetchError } = await query;
            if (fetchError) throw fetchError;

            // Aggregation Logic
            const buckets: Record<string, number[]> = {};

            rawData?.forEach((item: any) => {
                let key = 'Unknown';

                switch (groupBy) {
                    case 'stage':
                        key = item.stage || 'Unassigned';
                        break;
                    case 'owner':
                        key = item.owner?.full_name || 'Unassigned';
                        break;
                    case 'source':
                        key = item.source || 'Direct';
                        break;
                    case 'campaign':
                        key = item.campaign?.name || 'No Campaign';
                        break;
                    case 'month':
                        key = format(new Date(item.created_at), 'MMM yyyy');
                        break;
                }

                if (!buckets[key]) buckets[key] = [];

                let val = 1; // Default for 'count'
                if (metric === 'sum_value') val = item.deal_value || 0;
                if (metric === 'avg_score') val = item.composite_score || 0;

                buckets[key].push(val);
            });

            // Calculate final values
            const reportData: ReportDataPoint[] = Object.keys(buckets).map(key => {
                const values = buckets[key];
                let calculatedValue = 0;

                if (metric === 'count' || metric === 'sum_value') {
                    calculatedValue = values.reduce((a, b) => a + b, 0);
                } else if (metric === 'avg_score') {
                    calculatedValue = values.reduce((a, b) => a + b, 0) / values.length;
                }

                return {
                    name: key,
                    value: Math.round(calculatedValue * 100) / 100
                };
            });

            // Sort by value desc for most charts
            if (groupBy !== 'month') {
                reportData.sort((a, b) => b.value - a.value);
            }

            setData(reportData);

        } catch (err) {
            console.error('Error fetching report data:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [dataSource, groupBy, metric]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error };
}
