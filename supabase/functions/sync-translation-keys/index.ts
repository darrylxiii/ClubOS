/**
 * Sync Translation Keys Edge Function
 * Detects new English keys and queues them for translation
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGET_LANGUAGES = ['nl', 'de', 'fr', 'es', 'ru', 'zh', 'ar'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { namespace, mode = 'detect' } = await req.json();

    console.log(`[Sync Keys] Mode: ${mode}, Namespace: ${namespace || 'all'}`);

    // Get all English translations
    let query = supabase
      .from('translations')
      .select('namespace, translations')
      .eq('language', 'en')
      .eq('is_active', true);

    if (namespace) {
      query = query.eq('namespace', namespace);
    }

    const { data: englishTranslations, error: enError } = await query;

    if (enError) {
      throw new Error(`Failed to fetch English translations: ${enError.message}`);
    }

    if (!englishTranslations || englishTranslations.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No English translations found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: any[] = [];

    // Helper to flatten nested object keys
    const getKeys = (obj: any, prefix = ''): string[] => {
      const keys: string[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          keys.push(...getKeys(value, fullKey));
        } else {
          keys.push(fullKey);
        }
      }
      return keys;
    };

    for (const enTrans of englishTranslations) {
      const ns = enTrans.namespace;
      const englishKeys = getKeys(enTrans.translations);
      
      console.log(`[Sync Keys] ${ns}: ${englishKeys.length} English keys`);

      // Check each target language
      for (const lang of TARGET_LANGUAGES) {
        const { data: langTrans } = await supabase
          .from('translations')
          .select('translations')
          .eq('namespace', ns)
          .eq('language', lang)
          .eq('is_active', true)
          .single();

        if (!langTrans) {
          // No translation for this language - queue entire namespace
          results.push({
            namespace: ns,
            language: lang,
            status: 'missing',
            missingKeys: englishKeys.length,
            action: mode === 'queue' ? 'queued' : 'detected'
          });

          if (mode === 'queue') {
            await supabase.from('translation_sync_queue').insert({
              namespace: ns,
              new_keys: enTrans.translations,
              target_languages: [lang],
              priority: 1
            });
          }
          continue;
        }

        // Compare keys
        const langKeys = getKeys(langTrans.translations);
        const missingKeys = englishKeys.filter(k => !langKeys.includes(k));

        if (missingKeys.length > 0) {
          results.push({
            namespace: ns,
            language: lang,
            status: 'incomplete',
            missingKeys: missingKeys.length,
            missingKeysList: missingKeys.slice(0, 10), // Show first 10
            action: mode === 'queue' ? 'queued' : 'detected'
          });

          if (mode === 'queue') {
            // Extract only missing key values from English
            const missingTranslations: any = {};
            for (const key of missingKeys) {
              const parts = key.split('.');
              let value = enTrans.translations;
              for (const part of parts) {
                value = value?.[part];
              }
              if (value) {
                // Rebuild nested structure
                let current = missingTranslations;
                for (let i = 0; i < parts.length - 1; i++) {
                  if (!current[parts[i]]) current[parts[i]] = {};
                  current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
              }
            }

            await supabase.from('translation_sync_queue').insert({
              namespace: ns,
              new_keys: missingTranslations,
              target_languages: [lang],
              priority: 5
            });
          }
        } else {
          results.push({
            namespace: ns,
            language: lang,
            status: 'complete',
            missingKeys: 0
          });
        }
      }

      // Update namespace registry with key count
      await supabase
        .from('translation_namespace_registry')
        .update({ 
          key_count: englishKeys.length,
          last_synced_at: new Date().toISOString()
        })
        .eq('namespace', ns);
    }

    const totalMissing = results.filter(r => r.status !== 'complete').length;
    const totalComplete = results.filter(r => r.status === 'complete').length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          namespacesChecked: englishTranslations.length,
          languagesChecked: TARGET_LANGUAGES.length,
          completeTranslations: totalComplete,
          incompleteTranslations: totalMissing,
          mode
        },
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Sync Keys] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
