import { createAuthenticatedHandler } from '../_shared/handler.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const supabaseClient = ctx.supabase;
    const user = ctx.user;

    const { translationsData } = await req.json();

    if (!translationsData || !Array.isArray(translationsData)) {
      return new Response(
        JSON.stringify({ error: 'translationsData array required' }),
        { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
      }
    );
}));