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

    const { translationsData } = await req.json();

    if (!translationsData || !Array.isArray(translationsData)) {
      return new Response(
        JSON.stringify({ error: 'translationsData array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Seeding ${translationsData.length} translation records...`);

    const results = [];

    for (const item of translationsData) {
      const { namespace, language, translations } = item;

      // Check if already exists
      const { data: existing } = await supabaseClient
        .from('translations')
        .select('id')
        .eq('namespace', namespace)
        .eq('language', language)
        .eq('version', 1)
        .single();

      if (existing) {
        console.log(`Translation already exists: ${namespace}/${language}, skipping`);
        results.push({ namespace, language, status: 'skipped', reason: 'already exists' });
        continue;
      }

      // Insert new translation
      const { data, error } = await supabaseClient
        .from('translations')
        .insert({
          namespace,
          language,
          translations,
          version: 1,
          generated_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to insert ${namespace}/${language}:`, error);
        results.push({ namespace, language, status: 'error', error: error.message });
      } else {
        console.log(`✓ Inserted ${namespace}/${language}`);
        results.push({ namespace, language, status: 'success', id: data.id });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`Seeding complete: ${successCount} inserted, ${skippedCount} skipped, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: translationsData.length,
          successCount,
          skippedCount,
          errorCount
        },
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in seed-translations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});