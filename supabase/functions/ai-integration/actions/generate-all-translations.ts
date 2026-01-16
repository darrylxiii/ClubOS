
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const generateAllSchema = z.object({
    namespace: z.string().max(50).optional(),
    generateAll: z.boolean().optional(),
    jobId: z.string().uuid().optional()
}).refine(data => data.namespace || data.generateAll, {
    message: "Either namespace or generateAll must be provided"
});

const ALL_NAMESPACES = [
    'common', 'auth', 'onboarding', 'admin', 'analytics',
    'candidates', 'compliance', 'contracts', 'jobs',
    'meetings', 'messages', 'partner', 'settings'
];

const TARGET_LANGUAGES = ['nl', 'de', 'fr', 'es', 'ru', 'zh', 'ar'];

// Process translations as a background task
async function processTranslations(
    serviceClient: any,
    authHeader: string,
    userId: string,
    namespacesToProcess: string[],
    jobId: string
) {
    console.log(`[Background] Starting translation processing for job ${jobId}`);

    // Create user client for invoking other functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
    });

    const completedLanguages: string[] = [];
    const errors: any[] = [];
    let completedItems = 0;
    const totalItems = namespacesToProcess.length * TARGET_LANGUAGES.length;

    // Helper to update job progress with heartbeat
    const updateJobProgress = async (status: string, updates: any = {}) => {
        const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        try {
            await serviceClient
                .from('translation_generation_jobs')
                .update({
                    status,
                    progress_percentage: progressPercentage,
                    updated_at: new Date().toISOString(),
                    ...updates
                })
                .eq('id', jobId);

            console.log(`[Background] Job ${jobId}: ${status} (${progressPercentage}%)`);
        } catch (e) {
            console.error('[Background] Failed to update job:', e);
        }
    };

    try {
        // Process ONE namespace at a time to prevent timeouts
        for (const ns of namespacesToProcess) {
            console.log(`[Background] Processing namespace: ${ns}`);

            // Heartbeat - update job to show we're still alive
            await updateJobProgress('running', {
                error_message: `Processing: ${ns}`,
                completed_languages: completedLanguages
            });

            // Fetch English source
            const { data: englishData, error: fetchError } = await serviceClient
                .from('translations')
                .select('translations')
                .eq('namespace', ns)
                .eq('language', 'en')
                .eq('is_active', true)
                .order('version', { ascending: false })
                .limit(1)
                .single();

            if (fetchError || !englishData) {
                console.error(`[Background] No English for '${ns}'`, fetchError);
                errors.push({ namespace: ns, error: 'No English translations found' });
                completedItems += TARGET_LANGUAGES.length;
                await updateJobProgress('running', {
                    error_message: `No English source for ${ns}`,
                    completed_languages: completedLanguages
                });
                continue;
            }

            const totalKeys = Object.keys(englishData.translations).length;
            console.log(`[Background] Found ${totalKeys} keys for '${ns}'`);

            // Process languages ONE at a time
            for (const lang of TARGET_LANGUAGES) {
                const langKey = `${ns}:${lang}`;

                // Check if already completed (for resumability)
                if (completedLanguages.includes(langKey)) {
                    console.log(`[Background] Skipping ${langKey} (already done)`);
                    continue;
                }

                try {
                    console.log(`[Background] Translating ${langKey}...`);

                    const { data: translateData, error: translateError } = await userClient.functions.invoke(
                        'batch-translate',
                        {
                            body: {
                                namespace: ns,
                                targetLanguage: lang,
                                sourceTranslations: englishData.translations
                            }
                        }
                    );

                    if (translateError) {
                        const errorMsg = translateError.message || 'Unknown error';

                        // Handle rate limits
                        if (errorMsg.includes('Rate limit') || errorMsg.includes('429')) {
                            console.log(`[Background] Rate limited, waiting 60s...`);
                            await updateJobProgress('rate_limited', {
                                error_message: 'Rate limit hit - pausing 60s'
                            });
                            await new Promise(resolve => setTimeout(resolve, 60000));
                            await updateJobProgress('running');
                            // Retry this language
                            continue;
                        }

                        throw translateError;
                    }

                    console.log(`[Background] Success: ${langKey}`);
                    completedItems++;
                    completedLanguages.push(langKey);

                    // Update progress after EACH language
                    await updateJobProgress('running', {
                        completed_languages: completedLanguages,
                        error_message: `Completed: ${langKey}`
                    });

                    // Wait between languages to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (error: any) {
                    console.error(`[Background] Failed ${langKey}:`, error.message);
                    errors.push({ namespace: ns, language: lang, error: error.message });
                    completedItems++;

                    await updateJobProgress('running', {
                        failed_languages: errors.map(e => `${e.namespace}:${e.language}`),
                        error_message: `Failed: ${langKey}`
                    });
                }
            }

            // Wait between namespaces
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Mark job as complete
        const finalStatus = errors.length === 0 ? 'completed' : (completedLanguages.length > 0 ? 'partial' : 'failed');
        await updateJobProgress(finalStatus, {
            completed_at: new Date().toISOString(),
            error_message: errors.length > 0 ? `${errors.length} translations failed` : null,
            failed_languages: errors.map(e => `${e.namespace}:${e.language}`)
        });

        console.log(`[Background] Job ${jobId} complete: ${finalStatus}`);

    } catch (error: any) {
        console.error(`[Background] Fatal error in job ${jobId}:`, error);

        // Always mark job as failed on error
        await serviceClient
            .from('translation_generation_jobs')
            .update({
                status: 'failed',
                error_message: error.message || 'Background task failed',
                updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
    }
}

export const handleGenerateAllTranslations = async ({ supabase, payload, token, userId }: { supabase: any; payload: any, token: string | null, userId: string | null }) => {
    if (!token || !userId) {
        throw new Error('Unauthorized');
    }

    const rawInput = payload;
    const validationResult = generateAllSchema.safeParse(rawInput);

    if (!validationResult.success) {
        throw new Error(`Invalid input: ${JSON.stringify(validationResult.error.flatten())}`);
    }

    const { namespace, generateAll, jobId } = validationResult.data;

    // Get namespaces to process
    let namespacesToProcess: string[] = [];

    if (generateAll) {
        const { data: englishNamespaces } = await supabase
            .from('translations')
            .select('namespace')
            .eq('language', 'en')
            .eq('is_active', true);

        if (englishNamespaces) {
            namespacesToProcess = [...new Set(englishNamespaces.map((n: any) => n.namespace))];
        } else {
            namespacesToProcess = ALL_NAMESPACES;
        }
    } else if (namespace) {
        namespacesToProcess = [namespace];
    }

    console.log(`[Generate All] Processing ${namespacesToProcess.length} namespaces`);

    // Check for existing running jobs (prevent duplicates)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    // Using supabase service client for this check is valid
    const { data: existingJobs } = await supabase
        .from('translation_generation_jobs')
        .select('id, status, started_at, namespace')
        .eq('status', 'running')
        .gt('started_at', thirtyMinutesAgo)
        .order('started_at', { ascending: false });

    if (existingJobs && existingJobs.length > 0) {
        console.log(`[Generate All] Found ${existingJobs.length} running job(s), rejecting duplicate request`);
        return {
            success: false,
            error: 'A translation job is already running',
            existingJobId: existingJobs[0].id,
            startedAt: existingJobs[0].started_at,
            runningJobsCount: existingJobs.length
        };
    }

    // Create job record
    let currentJobId = jobId;

    if (!currentJobId) {
        const { data: newJob, error: jobError } = await supabase
            .from('translation_generation_jobs')
            .insert({
                namespace: namespacesToProcess.join(','),
                target_languages: TARGET_LANGUAGES,
                status: 'running',
                progress_percentage: 0,
                created_by: userId,
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (jobError) {
            throw new Error(`Failed to create job: ${jobError.message}`);
        }

        currentJobId = newJob.id;
    }

    console.log(`[Generate All] Created job ${currentJobId}, starting background processing`);

    // Start background processing using EdgeRuntime.waitUntil
    // @ts-expect-error EdgeRuntime is a Deno Deploy global
    EdgeRuntime.waitUntil(
        processTranslations(supabase, `Bearer ${token}`, userId, namespacesToProcess, currentJobId!)
    );

    return {
        success: true,
        message: 'Translation job started',
        jobId: currentJobId,
        namespacesCount: namespacesToProcess.length,
        languagesCount: TARGET_LANGUAGES.length,
        totalTranslations: namespacesToProcess.length * TARGET_LANGUAGES.length
    };
};
