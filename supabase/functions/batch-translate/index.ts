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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { texts, targetLanguage, context = 'ui_translation', namespace, sourceTranslations } = await req.json();

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'texts array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'targetLanguage is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Batch Translate] Translating ${texts.length} texts to ${targetLanguage}`);

    // Batch translate using Lovable AI
    const translations: string[] = [];
    
    // Process in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Translate each text in parallel within the batch
      const batchPromises = batch.map(async (text: string) => {
        const prompt = `Translate the following text to ${targetLanguage}. 
Context: This is a ${context} for a luxury executive recruitment platform called "The Quantum Club".
Maintain a tone that is: professional, discreet, sophisticated, warm but not casual.
Only return the translated text, nothing else.

Text to translate: "${text}"`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'You are a professional translator specializing in luxury recruitment platforms.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Batch Translate] AI API error:`, response.status, errorText);
          
          if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          }
          if (response.status === 402) {
            throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
          }
          
          throw new Error(`AI translation failed: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
      });

      const batchResults = await Promise.all(batchPromises);
      translations.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[Batch Translate] Successfully translated ${translations.length} texts`);

    // Reconstruct the translation object if sourceTranslations provided
    let translationObject: Record<string, any> = {};
    if (sourceTranslations) {
      let textIndex = 0;
      
      const reconstructObject = (obj: any, prefix = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            reconstructObject(value, fullKey);
          } else {
            const translatedText = translations[textIndex++];
            const keys = fullKey.split('.');
            let current: any = translationObject;
            
            for (let i = 0; i < keys.length - 1; i++) {
              if (!current[keys[i]]) {
                current[keys[i]] = {};
              }
              current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = translatedText;
          }
        }
      };

      reconstructObject(sourceTranslations);

      // Store in database if we have namespace
      if (namespace) {
        console.log(`[Batch Translate] Storing ${targetLanguage} translation for ${namespace} in database...`);
        
        // Get user from auth header
        const authHeader = req.headers.get('Authorization');
        let userId = null;
        
        if (authHeader) {
          const userClient = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } }
          });
          const { data: { user } } = await userClient.auth.getUser();
          userId = user?.id;
        }
        
        const { error: insertError } = await supabase
          .from('translations')
          .insert({
            namespace,
            language: targetLanguage,
            translations: translationObject,
            version: 1,
            generated_by: userId,
            is_active: true
          });

        if (insertError) {
          // If unique constraint violation, update instead
          if (insertError.code === '23505') {
            const { error: updateError } = await supabase
              .from('translations')
              .update({
                translations: translationObject,
                generated_at: new Date().toISOString(),
                generated_by: userId
              })
              .eq('namespace', namespace)
              .eq('language', targetLanguage)
              .eq('version', 1);

            if (updateError) {
              console.error('[Batch Translate] Failed to update translation:', updateError);
            } else {
              console.log(`[Batch Translate] ✓ Updated ${targetLanguage} translation for ${namespace}`);
            }
          } else {
            console.error('[Batch Translate] Failed to insert translation:', insertError);
          }
        } else {
          console.log(`[Batch Translate] ✓ Stored ${targetLanguage} translation for ${namespace}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        translations: sourceTranslations ? translationObject : translations 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[Batch Translate] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Translation failed'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
