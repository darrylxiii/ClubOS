import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { namespace, generateAll } = await req.json();

    if (!namespace && !generateAll) {
      return new Response(
        JSON.stringify({ error: 'namespace or generateAll parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get English source translations from database
    const namespacesToProcess = generateAll ? ['common', 'auth', 'onboarding'] : [namespace];
    const targetLanguages = ['nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'];
    
    const results: any[] = [];
    const errors: any[] = [];
    let totalCost = 0;
    let totalTime = 0;

    console.log(`Starting bulk translation for ${namespacesToProcess.length} namespace(s) × ${targetLanguages.length} languages`);

    // Process each namespace
    for (const ns of namespacesToProcess) {
      console.log(`[Step 1/3] Checking English source for namespace '${ns}'...`);
      
      // Get English source
      const { data: englishData, error: fetchError } = await supabaseClient
        .from('translations')
        .select('translations')
        .eq('namespace', ns)
        .eq('language', 'en')
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !englishData) {
        const errorMsg = `No English translations found for namespace '${ns}'. Please seed English translations first by clicking 'Seed English' in the Translation Manager.`;
        console.error(`[ERROR] ${errorMsg}`, fetchError);
        errors.push({ 
          namespace: ns, 
          error: errorMsg,
          action: 'seed_required'
        });
        continue;
      }

      console.log(`[Step 1/3] ✓ Found English source for '${ns}' with ${Object.keys(englishData.translations).length} keys`);

      console.log(`[Step 2/3] Generating translations for ${targetLanguages.length} languages...`);

      // Generate translations for all target languages in parallel
      const translationPromises = targetLanguages.map(async (lang) => {
        const startTime = Date.now();
        
        try {
          console.log(`[Step 2/3] Calling batch-translate for ${lang}...`);
          
          // Call batch-translate function
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
            throw translateError;
          }

          console.log(`[Step 3/3] Storing ${lang} translations in database...`);

          const duration = Date.now() - startTime;
          const estimatedCost = (Object.keys(englishData.translations).length * 0.0003);

          console.log(`[SUCCESS] Generated ${lang} for '${ns}' in ${duration}ms - ${Object.keys(englishData.translations).length} keys - $${estimatedCost.toFixed(4)}`);

          totalCost += estimatedCost;
          totalTime += duration;

          return {
            namespace: ns,
            language: lang,
            keyCount: Object.keys(translateData.translations).length,
            duration,
            estimatedCost,
            status: 'success'
          };
        } catch (error: any) {
          const duration = Date.now() - startTime;
          console.error(`[ERROR] Failed to translate ${ns} to ${lang}:`, error.message || error);
          
          return {
            namespace: ns,
            language: lang,
            status: 'error',
            error: error.message || 'Translation failed',
            duration
          };
        }
      });

      const namespaceResults = await Promise.all(translationPromises);
      results.push(...namespaceResults);
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Bulk translation complete: ${successCount} succeeded, ${errorCount} failed, $${totalCost.toFixed(2)} estimated cost, ${(totalTime/1000).toFixed(1)}s total time`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          totalNamespaces: namespacesToProcess.length,
          totalLanguages: targetLanguages.length,
          successCount,
          errorCount,
          totalCost: totalCost.toFixed(2),
          totalTimeSeconds: (totalTime / 1000).toFixed(1)
        },
        results,
        errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-all-translations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});