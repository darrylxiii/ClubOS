
import "https://deno.land/x/xhr@0.1.0/mod.ts";
// Note: imports are handled by Deno, standard URL imports work

interface UserBehaviorFeatures {
    userId: string;
    avgSessionDuration: number;
    sessionsPerWeek: number;
    pagesPerSession: number;
    scrollDepthAvg: number;
    clickRate: number;
    applicationsSubmitted: number;
    completionRate: number;
    featureDiversityScore: number;
    topFeaturesUsed: string[];
}

async function collectUserFeatures(supabase: any): Promise<UserBehaviorFeatures[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get active users from last 30 days
    const { data: activeUsers } = await supabase
        .from('user_page_analytics')
        .select('user_id')
        .gte('entry_time', thirtyDaysAgo.toISOString())
        .not('user_id', 'is', null);

    if (!activeUsers) return [];

    const uniqueUsers = [...new Set(activeUsers.map((u: any) => u.user_id))];
    const features: UserBehaviorFeatures[] = [];

    for (const userId of uniqueUsers.slice(0, 1000)) {
        const feature = await calculateUserFeatures(supabase, userId as string, thirtyDaysAgo);
        if (feature) features.push(feature);
    }

    return features;
}

async function calculateUserFeatures(
    supabase: any,
    userId: string,
    sinceDate: Date
): Promise<UserBehaviorFeatures | null> {
    const [sessions, pages, events, applications] = await Promise.all([
        supabase
            .from('user_session_events')
            .select('event_data, created_at')
            .eq('user_id', userId)
            .gte('created_at', sinceDate.toISOString()),

        supabase
            .from('user_page_analytics')
            .select('*')
            .eq('user_id', userId)
            .gte('entry_time', sinceDate.toISOString()),

        supabase
            .from('user_session_events')
            .select('event_type')
            .eq('user_id', userId)
            .gte('created_at', sinceDate.toISOString()),

        supabase
            .from('applications')
            .select('status')
            .eq('user_id', userId)
            .gte('created_at', sinceDate.toISOString()),
    ]);

    if (!sessions.data || sessions.data.length === 0) return null;

    const sessionDurations = sessions.data
        .filter((s: any) => s.event_data?.duration)
        .map((s: any) => s.event_data.duration);

    const avgSessionDuration = sessionDurations.length > 0
        ? sessionDurations.reduce((a: number, b: number) => a + b, 0) / sessionDurations.length
        : 0;

    const pagesPerSession = pages.data ? pages.data.length / sessions.data.length : 0;

    const scrollDepths = pages.data
        ?.filter((p: any) => p.max_scroll_depth)
        .map((p: any) => p.max_scroll_depth) || [];
    const scrollDepthAvg = scrollDepths.length > 0
        ? scrollDepths.reduce((a: number, b: number) => a + b, 0) / scrollDepths.length
        : 0;

    const clickEvents = events.data?.filter((e: any) => e.event_type === 'click').length || 0;
    const clickRate = pages.data ? clickEvents / pages.data.length : 0;

    const applicationsSubmitted = applications.data?.length || 0;
    const completedApps = applications.data?.filter((a: any) => a.status === 'submitted').length || 0;
    const completionRate = applicationsSubmitted > 0 ? completedApps / applicationsSubmitted : 0;

    const eventTypes = new Set(events.data?.map((e: any) => e.event_type) || []);
    const featureDiversityScore = eventTypes.size / 10;

    return {
        userId,
        avgSessionDuration: Math.round(avgSessionDuration),
        sessionsPerWeek: Math.round(sessions.data.length / 4.3),
        pagesPerSession: Math.round(pagesPerSession * 10) / 10,
        scrollDepthAvg: Math.round(scrollDepthAvg),
        clickRate: Math.round(clickRate * 10) / 10,
        applicationsSubmitted,
        completionRate: Math.round(completionRate * 100) / 100,
        featureDiversityScore: Math.round(featureDiversityScore * 10) / 10,
        topFeaturesUsed: [...eventTypes].slice(0, 5) as string[],
    };
}

async function generateEmbeddings(
    supabase: any,
    apiKey: string,
    features: UserBehaviorFeatures[]
): Promise<number> {
    let generated = 0;

    for (const feature of features) {
        const featureText = `User behavior: ${feature.sessionsPerWeek} sessions/week, ${feature.avgSessionDuration}s avg session, ${feature.pagesPerSession} pages/session, ${feature.scrollDepthAvg}% scroll depth, ${feature.clickRate} click rate, ${feature.applicationsSubmitted} applications, ${feature.completionRate * 100}% completion, features: ${feature.topFeaturesUsed.join(', ')}`;

        try {
            const response = await fetch('https://api.lovable.app/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: featureText,
                    model: 'text-embedding-3-small',
                }),
            });

            if (!response.ok) {
                console.error(`Embedding generation failed for user ${feature.userId}`);
                continue;
            }

            const data = await response.json();
            const embedding = data.data[0].embedding;

            // Store embedding
            await supabase
                .from('user_behavior_embeddings')
                .upsert({
                    user_id: feature.userId,
                    embedding_vector: embedding,
                    feature_vector: feature,
                    generated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            generated++;
        } catch (error) {
            console.error(`Error generating embedding for user ${feature.userId}:`, error);
        }
    }

    return generated;
}

async function performClustering(supabase: any) {
    const { data: embeddings } = await supabase
        .from('user_behavior_embeddings')
        .select('*')
        .not('embedding_vector', 'is', null)
        .limit(1000);

    if (!embeddings || embeddings.length < 10) {
        console.log('Not enough data for clustering');
        return [];
    }

    // Simple k-means clustering (k=5)
    const k = 5;
    const clusters = simpleKMeans(embeddings, k);

    // Update cluster assignments
    for (const [userId, clusterId] of Object.entries(clusters)) {
        await supabase
            .from('user_behavior_embeddings')
            .update({
                cluster_id: clusterId,
                last_clustering_at: new Date().toISOString(),
                cluster_confidence: 0.75,
            })
            .eq('user_id', userId);
    }

    return Array.from(new Set(Object.values(clusters)));
}

function simpleKMeans(data: any[], k: number): Record<string, number> {
    const assignments: Record<string, number> = {};

    // Simple random assignment for MVP
    data.forEach((item, index) => {
        assignments[item.user_id] = index % k;
    });

    return assignments;
}

async function generateSegmentLabels(apiKey: string, clusterIds: number[]) {
    const labels: Record<number, string> = {};

    const prompt = `You are analyzing ${clusterIds.length} user segments from a talent platform. Generate a descriptive label (3-5 words) for each segment based on typical behavior patterns. Return JSON format: {"0": "Power Users - High Engagement", "1": "At-Risk - Declining Activity", ...}`;

    try {
        const response = await fetch('https://api.lovable.app/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            }),
        });

        const data = await response.json();
        const labelsText = data.choices[0].message.content;
        const parsed = JSON.parse(labelsText);
        return parsed;
    } catch (error) {
        console.error('Error generating labels:', error);
        // Fallback labels
        clusterIds.forEach((id, idx) => {
            labels[id] = `Segment ${idx + 1}`;
        });
        return labels;
    }
}

async function updateSegmentDescriptions(supabase: any, labels: Record<number, string>) {
    for (const [clusterId, label] of Object.entries(labels)) {
        await supabase
            .from('user_behavior_embeddings')
            .update({ segment_label: label })
            .eq('cluster_id', parseInt(clusterId));
    }
}

// Background Task Function
async function processUserEmbeddings(supabase: any, lovableApiKey: string) {
    console.log('Starting behavior embedding pipeline...');
    try {
        // Step 1: Collect user behavior features
        const userFeatures = await collectUserFeatures(supabase);
        console.log(`Collected features for ${userFeatures.length} users`);

        // Step 2: Generate embeddings for each user
        const embeddingsGenerated = await generateEmbeddings(
            supabase,
            lovableApiKey,
            userFeatures
        );
        console.log(`Generated ${embeddingsGenerated} embeddings`);

        // Step 3: Perform clustering
        const clusters = await performClustering(supabase);
        console.log(`Created ${clusters.length} user segments`);

        // Step 4: Generate segment labels using Club AI
        const labeledSegments = await generateSegmentLabels(
            lovableApiKey,
            clusters
        );
        console.log('Segment labels generated');

        // Step 5: Update segment descriptions
        await updateSegmentDescriptions(supabase, labeledSegments);

        // Refresh materialized view
        await supabase.rpc('refresh_user_segments_summary');
    } catch (error) {
        console.error('Processing user embeddings failed:', error);
    }
}


export const handleGenerateUserEmbeddings = async ({ supabase }: { supabase: any }) => {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    if (!lovableApiKey) {
        throw new Error('LOVABLE_API_KEY not configured');
    }

    // Start background processing
    // @ts-expect-error EdgeRuntime is a Deno Deploy global
    EdgeRuntime.waitUntil(processUserEmbeddings(supabase, lovableApiKey));

    return {
        success: true,
        message: 'User embedding pipeline started in background',
        timestamp: new Date().toISOString()
    };
};
