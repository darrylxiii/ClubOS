import { useQuery } from '@tanstack/react-query';
import { aiService } from '@/services/aiService';
import { UnifiedKPI, DomainHealth } from './useUnifiedKPIs';

export interface KPIInsights {
    summary: string;
    recommendations: {
        text: string;
        priority: 'high' | 'medium' | 'low';
        action?: string;
    }[];
}

export function useKPIInsights(kpis: UnifiedKPI[], domainHealth: DomainHealth[]) {
    return useQuery({
        queryKey: ['kpi-insights', kpis.length],
        queryFn: async () => {
            if (kpis.length === 0) return null;

            const data = await aiService.generateKPIInsights({
                kpis: kpis.map(k => ({
                    name: k.displayName || k.name,
                    value: k.value,
                    trend: k.trendDirection,
                })),
                domainHealth: 85
            });
            return data as unknown as KPIInsights;
        },
        enabled: kpis.length > 0,
        staleTime: 1000 * 60 * 60,
        retry: false
    });
}
