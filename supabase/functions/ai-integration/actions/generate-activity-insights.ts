import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface FrustrationHotspot {
    page: string;
    type: string;
    count: number;
}

interface PageStats {
    bounces: number;
    total: number;
}

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateActivityInsights({ supabase, payload }: ActionContext) {
    const { timeframe = '7d' } = payload;

    const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
    const startDate = new Date(Date.now() - daysBack * 86400000).toISOString();

    // Fetch aggregated data
    const [
        pageAnalytics,
        frustrationSignals,
        journeyData,
        searchAnalytics
    ] = await Promise.all([
        supabase.from('user_page_analytics').select('*').gte('entry_timestamp', startDate),
        supabase.from('user_frustration_signals').select('*').gte('created_at', startDate),
        supabase.from('user_journey_tracking').select('*').gte('created_at', startDate),
        supabase.from('user_search_analytics').select('*').gte('created_at', startDate),
    ]);

    // Generate insights
    const insights = [];

    // High bounce rate pages
    const bounceRates = calculateBounceRates(pageAnalytics.data || []);
    const highBouncePage = bounceRates.sort((a, b) => b.rate - a.rate)[0];
    if (highBouncePage && highBouncePage.rate > 60) {
        insights.push({
            type: 'ux_issue',
            title: 'High Bounce Rate Detected',
            description: `Page "${highBouncePage.page}" has ${highBouncePage.rate}% bounce rate. Users are leaving quickly without engagement.`,
            recommendation: 'Review page content, loading speed, and first-impression value proposition.',
            severity: 'high',
            affectedPage: highBouncePage.page,
        });
    }

    // Frustration hotspots
    const frustrationHotspots = analyzeFrustrationSignals(frustrationSignals.data || []);
    if (frustrationHotspots.length > 0) {
        const topFrustration = frustrationHotspots[0];
        insights.push({
            type: 'frustration',
            title: 'User Frustration Detected',
            description: `${topFrustration.count} frustration signals on "${topFrustration.page}" (${topFrustration.type})`,
            recommendation: 'Investigate element behavior, add loading states, or improve error messaging.',
            severity: topFrustration.count > 10 ? 'high' : 'medium',
            affectedPage: topFrustration.page,
        });
    }

    // Drop-off in journey
    const dropoffs = analyzeJourneyDropoffs(journeyData.data || []);
    if (dropoffs.length > 0) {
        const criticalDropoff = dropoffs[0];
        insights.push({
            type: 'conversion',
            title: 'Journey Drop-off Point',
            description: `${criticalDropoff.rate}% of users drop off between "${criticalDropoff.from}" and "${criticalDropoff.to}"`,
            recommendation: 'Simplify the transition, reduce friction, or add motivational messaging.',
            severity: 'medium',
            affectedPages: [criticalDropoff.from, criticalDropoff.to],
        });
    }

    // Low search result satisfaction
    const searchIssues = analyzeSearchPerformance(searchAnalytics.data || []);
    if (searchIssues.zeroResultsRate > 20) {
        insights.push({
            type: 'search',
            title: 'Search Quality Issue',
            description: `${searchIssues.zeroResultsRate}% of searches return zero results`,
            recommendation: 'Improve search algorithm, add synonyms, or show related suggestions.',
            severity: 'medium',
        });
    }

    // Store insights if any found
    if (insights.length > 0) {
        await supabase.from('analytics_insights').insert(
            insights.map(insight => ({
                user_id: null,
                insight_type: insight.type,
                insight_title: insight.title,
                insight_content: insight.description,
                metadata: insight,
                confidence_score: 0.85,
            }))
        );
    }

    return { success: true, insights, count: insights.length };
}

function calculateBounceRates(pageData: any[]) {
    const pageStats = pageData.reduce((acc, page) => {
        if (!acc[page.page_path]) {
            acc[page.page_path] = { total: 0, bounces: 0 };
        }
        acc[page.page_path].total++;
        if (page.bounce) acc[page.page_path].bounces++;
        return acc;
    }, {} as Record<string, PageStats>);

    return Object.entries(pageStats).map(([page, stats]) => {
        const typedStats = stats as PageStats;
        return {
            page,
            rate: Math.round((typedStats.bounces / typedStats.total) * 100),
            total: typedStats.total,
        };
    });
}

function analyzeFrustrationSignals(signals: any[]): FrustrationHotspot[] {
    const hotspots = signals.reduce((acc, signal) => {
        const key = `${signal.page_path}-${signal.signal_type}`;
        if (!acc[key]) {
            acc[key] = { page: signal.page_path, type: signal.signal_type, count: 0 };
        }
        acc[key].count += signal.count || 1;
        return acc;
    }, {} as Record<string, FrustrationHotspot>);

    return (Object.values(hotspots) as FrustrationHotspot[]).sort((a, b) => b.count - a.count);
}

function analyzeJourneyDropoffs(journeyData: any[]) {
    const transitions = journeyData.reduce((acc: any, step: any) => {
        const key = `${step.from_page}->${step.to_page}`;
        if (!acc[key]) {
            acc[key] = { from: step.from_page, to: step.to_page, total: 0, completed: 0 };
        }
        acc[key].total++;
        if (step.conversion_event) acc[key].completed++;
        return acc;
    }, {});

    return Object.values(transitions)
        .map((t: any) => ({
            ...t,
            rate: Math.round(((t.total - t.completed) / t.total) * 100),
        }))
        .filter((t: any) => t.rate > 50)
        .sort((a: any, b: any) => b.rate - a.rate);
}

function analyzeSearchPerformance(searchData: any[]) {
    const zeroResults = searchData.filter((s: any) => s.results_count === 0).length;
    const totalSearches = searchData.length || 1;

    return {
        zeroResultsRate: Math.round((zeroResults / totalSearches) * 100),
        avgTimeToClick: searchData.reduce((sum: number, s: any) => sum + (s.time_to_first_click_ms || 0), 0) / totalSearches,
    };
}
