import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { namespace, language, missingKeys } = await req.json();

  if (!namespace || !language || !missingKeys || missingKeys.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: namespace, language, missingKeys' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get existing translation
  const { data: existing } = await ctx.supabase
    .from('translations')
    .select('translations')
    .eq('namespace', namespace)
    .eq('language', language)
    .single();

  // Translate only missing keys
  const translationsToAdd: Record<string, string> = {};

  for (const key of missingKeys) {
    // Use Google Gemini to translate
    const { data: aiData, error: aiError } = await ctx.supabase.functions.invoke('google-gemini', {
      body: {
        model: 'gemini-2.5-flash-lite',
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
  await ctx.supabase
    .from('translations')
    .upsert({
      namespace,
      language,
      translations: updated,
      version: Date.now()
    });

  return new Response(
    JSON.stringify({ success: true, keysAdded: Object.keys(translationsToAdd).length }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
