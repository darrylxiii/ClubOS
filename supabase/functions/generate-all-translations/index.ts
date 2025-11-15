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

    console.log(`[Step 2/3] Generating translations for ${targetLanguages.length} languages SEQUENTIALLY...`);

      // Generate translations SEQUENTIALLY (not parallel) to avoid rate limits
      for (const [index, lang] of targetLanguages.entries()) {
        const startTime = Date.now();
        
        try {
          console.log(`[Step 2/3] Processing ${lang} (${index + 1}/${targetLanguages.length})...`);
          
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
            // Check for rate limit or payment errors
            if (translateError.message?.includes('Rate limit') || translateError.message?.includes('429')) {
              console.error(`[ERROR] Rate limited on ${lang}, stopping generation`);
              errors.push({
                namespace: ns,
                language: lang,
                error: 'Rate limit exceeded - please try again in a few minutes',
                errorType: 'RATE_LIMIT'
              });
              
              results.push({
                namespace: ns,
                language: lang,
                status: 'error',
                error: 'Rate limit exceeded',
                errorType: 'RATE_LIMIT',
                duration: Date.now() - startTime
              });
              
              // Stop processing remaining languages
              break;
            }
            
            if (translateError.message?.includes('Payment') || translateError.message?.includes('402')) {
              console.error(`[ERROR] Payment required for ${lang}, stopping generation`);
              errors.push({
                namespace: ns,
                language: lang,
                error: 'Translation credits depleted - please add more credits',
                errorType: 'PAYMENT_REQUIRED'
              });
              
              results.push({
                namespace: ns,
                language: lang,
                status: 'error',
                error: 'Payment required',
                errorType: 'PAYMENT_REQUIRED',
                duration: Date.now() - startTime
              });
              
              // Stop processing remaining languages
              break;
            }
            
            throw translateError;
          }

          console.log(`[Step 3/3] Storing ${lang} translations in database...`);

          const duration = Date.now() - startTime;
          const estimatedCost = (Object.keys(englishData.translations).length * 0.0003);

          console.log(`[SUCCESS] Generated ${lang} for '${ns}' in ${duration}ms - ${Object.keys(englishData.translations).length} keys - $${estimatedCost.toFixed(4)}`);

          totalCost += estimatedCost;
          totalTime += duration;

          results.push({
            namespace: ns,
            language: lang,
            keyCount: Object.keys(translateData.translations).length,
            duration,
            estimatedCost,
            status: 'success'
          });
          
          // Add delay between languages to respect rate limits (2 seconds)
          if (index < targetLanguages.length - 1) {
            console.log(`[Rate Limit Protection] Waiting 2 seconds before next language...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error: any) {
          const duration = Date.now() - startTime;
          console.error(`[ERROR] Failed to translate ${ns} to ${lang}:`, error.message || error);
          
          errors.push({
            namespace: ns,
            language: lang,
            error: error.message || 'Translation failed'
          });
          
          results.push({
            namespace: ns,
            language: lang,
            status: 'error',
            error: error.message || 'Translation failed',
            duration
          });
        }
      }
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
          totalCost: parseFloat(totalCost.toFixed(2)),
          totalTimeSeconds: parseFloat((totalTime / 1000).toFixed(1))
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