/**
 * Generate All Translations Edge Function
 * Enterprise-grade with real-time progress updates
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawInput = await req.json();
    const validationResult = generateAllSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      console.error('[Generate All] Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { namespace, generateAll, jobId } = validationResult.data;

    // Get namespaces to process
    let namespacesToProcess: string[] = [];
    
    if (generateAll) {
      const { data: englishNamespaces, error: nsError } = await serviceClient
        .from('translations')
        .select('namespace')
        .eq('language', 'en')
        .eq('is_active', true);
      
      if (nsError) {
        console.error('[Generate All] Failed to fetch namespaces:', nsError);
        namespacesToProcess = ALL_NAMESPACES;
      } else {
        namespacesToProcess = [...new Set(englishNamespaces.map(n => n.namespace))];
      }
    } else if (namespace) {
      namespacesToProcess = [namespace];
    }

    console.log(`[Generate All] Processing ${namespacesToProcess.length} namespaces:`, namespacesToProcess);

    const results: any[] = [];
    const errors: any[] = [];
    let totalCost = 0;
    let totalTime = 0;

    // Calculate total work items for progress
    const totalItems = namespacesToProcess.length * TARGET_LANGUAGES.length;
    let completedItems = 0;

    // Create or resume job
    let currentJobId = jobId;
    let completedLanguages: string[] = [];
    
    if (!currentJobId) {
      const { data: newJob, error: jobError } = await serviceClient
        .from('translation_generation_jobs')
        .insert({
          namespace: namespacesToProcess.join(','),
          target_languages: TARGET_LANGUAGES,
          status: 'running',
          progress_percentage: 0,
          created_by: user.id,
          started_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (jobError) {
        console.error('[Generate All] Failed to create job:', jobError);
      } else {
        currentJobId = newJob.id;
        console.log(`[Generate All] Created job ${currentJobId}`);
      }
    } else {
      const { data: existingJob } = await serviceClient
        .from('translation_generation_jobs')
        .select('completed_languages')
        .eq('id', currentJobId)
        .single();
        
      if (existingJob) {
        completedLanguages = existingJob.completed_languages || [];
        completedItems = completedLanguages.length;
        console.log(`[Generate All] Resuming job ${currentJobId}, skipping: ${completedLanguages.join(', ')}`);
      }
    }

    // Helper to update job with progress
    const updateJobProgress = async (status: string, updates: any = {}) => {
      if (!currentJobId) return;
      
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
          .eq('id', currentJobId);
        
        console.log(`[Generate All] Job ${currentJobId}: ${status} (${progressPercentage}%)`);
      } catch (e) {
        console.error('[Generate All] Failed to update job:', e);
      }
    };

    // Process each namespace
    for (const ns of namespacesToProcess) {
      console.log(`[Step 1] Fetching English source for '${ns}'...`);
      
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
        console.error(`[ERROR] No English for '${ns}'`, fetchError);
        errors.push({ namespace: ns, error: 'No English translations found', action: 'seed_required' });
        // Skip languages for this namespace but still count them as "done" for progress
        completedItems += TARGET_LANGUAGES.length;
        await updateJobProgress('running', { error_message: `No English source for ${ns}` });
        continue;
      }

      const totalKeys = Object.keys(englishData.translations).length;
      console.log(`[Step 1] ✓ Found ${totalKeys} keys for '${ns}'`);

      console.log(`[Step 2] Translating '${ns}' to ${TARGET_LANGUAGES.length} languages...`);

      // Process languages SEQUENTIALLY to avoid rate limits
      for (const [index, lang] of TARGET_LANGUAGES.entries()) {
        const langKey = `${ns}:${lang}`;
        
        if (completedLanguages.includes(langKey)) {
          console.log(`[Step 2] Skipping ${langKey} (already done)`);
          continue;
        }
        
        const startTime = Date.now();
        
        try {
          console.log(`[Step 2] Processing ${langKey} (${index + 1}/${TARGET_LANGUAGES.length})...`);
          
          const { data: translateData, error: translateError } = await supabaseClient.functions.invoke(
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
            
            if (errorMsg.includes('Rate limit') || errorMsg.includes('429')) {
              console.error(`[RATE LIMIT] Pausing for 60s...`);
              errors.push({ namespace: ns, language: lang, error: 'Rate limit exceeded', errorType: 'RATE_LIMIT' });
              
              await updateJobProgress('rate_limited', { 
                error_message: 'Rate limit hit - pausing 60s'
              });
              
              await new Promise(resolve => setTimeout(resolve, 60000));
              
              // Update status back to running
              await updateJobProgress('running');
              continue;
            }
            
            throw translateError;
          }

          const duration = Date.now() - startTime;
          const estimatedCost = totalKeys * 0.0002; // Reduced cost per key

          console.log(`[SUCCESS] ${langKey} in ${duration}ms`);

          totalCost += estimatedCost;
          totalTime += duration;
          completedItems++;

          results.push({
            namespace: ns,
            language: lang,
            keyCount: totalKeys,
            duration,
            estimatedCost,
            status: 'success'
          });
          
          completedLanguages.push(langKey);
          
          // Update progress after EACH language
          await updateJobProgress('running', { 
            completed_languages: completedLanguages,
            processed_keys_count: completedLanguages.length * totalKeys
          });
          
          // Wait 2s between languages
          if (index < TARGET_LANGUAGES.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error: any) {
          console.error(`[ERROR] Failed ${langKey}:`, error.message);
          errors.push({ namespace: ns, language: lang, error: error.message || 'Translation failed' });
          results.push({ namespace: ns, language: lang, status: 'error', error: error.message });
          completedItems++;
          
          await updateJobProgress('running', {
            failed_languages: errors.map(e => `${e.namespace}:${e.language}`)
          });
        }
      }
      
      // Wait 3s between namespaces
      if (namespacesToProcess.indexOf(ns) < namespacesToProcess.length - 1) {
        console.log(`[Rate Limit] Waiting 3s before next namespace...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    // Final job update
    const finalStatus = errorCount === 0 ? 'completed' : (successCount > 0 ? 'partial' : 'failed');
    await updateJobProgress(finalStatus, {
      completed_at: new Date().toISOString(),
      error_message: errorCount > 0 ? `${errorCount} translations failed` : null,
      completed_languages: completedLanguages,
      failed_languages: errors.map(e => `${e.namespace}:${e.language}`)
    });

    console.log(`[Complete] ${successCount} succeeded, ${errorCount} failed, ~$${totalCost.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalNamespaces: namespacesToProcess.length,
          totalLanguages: TARGET_LANGUAGES.length,
          successCount,
          errorCount,
          totalCost: parseFloat(totalCost.toFixed(2)),
          totalTimeSeconds: parseFloat((totalTime / 1000).toFixed(1)),
          jobId: currentJobId,
          status: finalStatus
        },
        results,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Generate All] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
