import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { namespace, language, missingKeys } = await req.json();
    
    if (!namespace || !language || !missingKeys || missingKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: namespace, language, missingKeys' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing translation
    const { data: existing } = await supabase
      .from('translations')
      .select('translations')
      .eq('namespace', namespace)
      .eq('language', language)
      .single();

    // Translate only missing keys
    const translationsToAdd: Record<string, string> = {};
    
    for (const key of missingKeys) {
      // Use Lovable AI to translate
      const { data: aiData, error: aiError } = await supabase.functions.invoke('lovable-ai', {
        body: {
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: `Translate this UI text to ${language}: "${key}". Return ONLY the translation, no explanation.`
          }]
        }
      });

      if (!aiError && aiData?.choices?.[0]?.message?.content) {
        translationsToAdd[key] = aiData.choices[0].message.content.trim();
      }
    }

    // Merge with existing
    const updated = { ...(existing?.translations || {}), ...translationsToAdd };

    // Update database
    await supabase
      .from('translations')
      .upsert({
        namespace,
        language,
        translations: updated,
        version: Date.now()
      });

    return new Response(
      JSON.stringify({ success: true, keysAdded: Object.keys(translationsToAdd).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
