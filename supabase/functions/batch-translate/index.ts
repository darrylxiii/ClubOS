import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema for security
const batchTranslateSchema = z.object({
  texts: z.array(z.string().max(1000)).max(200).optional(),
  targetLanguage: z.enum(['nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru']),
  context: z.string().max(100).optional(),
  namespace: z.string().max(50),
  sourceTranslations: z.record(z.any()).optional()
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 10 requests per hour per IP/user
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    const rateLimitResult = await checkUserRateLimit(clientIp, "batch-translate", 10, 3600000);
    if (!rateLimitResult.allowed) {
      console.log(`[Batch Translate] Rate limit exceeded for IP: ${clientIp}`);
      return createRateLimitResponse(rateLimitResult.retryAfter || 3600, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input to prevent injection and malformed data
    const rawInput = await req.json();
    const validationResult = batchTranslateSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      console.error('[Batch Translate] Validation failed:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.flatten() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { texts, targetLanguage, context = 'ui_translation', namespace, sourceTranslations } = validationResult.data;

    // Handle two modes: direct texts array OR sourceTranslations object
    let textsToTranslate: string[] = [];

    if (sourceTranslations && typeof sourceTranslations === 'object') {
      // Extract all string values from nested object
      const extractTexts = (obj: any): string[] => {
        const results: string[] = [];
        for (const value of Object.values(obj)) {
          if (typeof value === 'string') {
            results.push(value);
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            results.push(...extractTexts(value));
          }
        }
        return results;
      };
      
      textsToTranslate = extractTexts(sourceTranslations);
      console.log(`[Batch Translate] Extracted ${textsToTranslate.length} texts from sourceTranslations`);
    } else if (texts && Array.isArray(texts)) {
      textsToTranslate = texts;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either texts array or sourceTranslations object is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (textsToTranslate.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No texts found to translate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'targetLanguage is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Batch Translate] Translating ${textsToTranslate.length} texts to ${targetLanguage}`);

    // Batch translate using Lovable AI with retry logic
    const translations: string[] = [];
    
    // Helper function to sleep/delay
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Phase 4: Optimized prompt (simplified for faster processing)
    const translateWithRetry = async (text: string, maxRetries = 3): Promise<string> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Phase 4: Simplified prompt - ONLY return translation, no explanations
          const prompt = `Translate this exact text to ${targetLanguage}. Return ONLY the translation, nothing else: "${text}"`;

          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite', // Phase 1: Faster model with higher rate limits
              messages: [
                { 
                  role: 'system', 
                  content: 'You are a professional translator. Return ONLY the translation without any explanation, options, or additional text. Use a professional, sophisticated tone suitable for luxury recruitment platforms.'
                },
                { role: 'user', content: prompt }
              ],
            }),
          });

          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
            console.log(`[Batch Translate] Rate limited (429), waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
            if (attempt < maxRetries) {
              await sleep(waitTime);
              continue;
            }
            throw new Error('RATE_LIMIT_EXCEEDED');
          }

          if (response.status === 402) {
            console.error('[Batch Translate] Payment required (402) - out of credits');
            throw new Error('PAYMENT_REQUIRED');
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Batch Translate] API error (${response.status}):`, errorText);
            throw new Error(`API_ERROR_${response.status}`);
          }

          const data = await response.json();
          return data.choices[0].message.content.trim();
        } catch (error: any) {
          if (error.message === 'RATE_LIMIT_EXCEEDED' || error.message === 'PAYMENT_REQUIRED') {
            throw error;
          }
          if (attempt === maxRetries) {
            console.error(`[Batch Translate] Failed after ${maxRetries} attempts:`, error);
            throw error;
          }
          const backoffTime = Math.pow(2, attempt) * 1000;
          console.log(`[Batch Translate] Retry ${attempt}/${maxRetries} after ${backoffTime}ms`);
          await sleep(backoffTime);
        }
      }
      throw new Error('Translation failed after retries');
    };
    
    // Process in batches of 5 (reduced from 10) to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < textsToTranslate.length; i += batchSize) {
      const batch = textsToTranslate.slice(i, i + batchSize);
      
      // Translate each text in the batch
      const batchPromises = batch.map(text => translateWithRetry(text));

      try {
        const batchResults = await Promise.all(batchPromises);
        translations.push(...batchResults);
        
        console.log(`[Batch Translate] Completed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(textsToTranslate.length / batchSize)}`);
        
        // Add delay between batches to respect rate limits (500ms)
        if (i + batchSize < textsToTranslate.length) {
          await sleep(500);
        }
      } catch (error: any) {
        // Surface rate limit and payment errors to caller
        if (error.message === 'RATE_LIMIT_EXCEEDED') {
          console.error('[Batch Translate] Rate limit exceeded, cannot continue');
          return new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded. Please try again in a few minutes.',
              errorType: 'RATE_LIMIT',
              partialTranslations: translations
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (error.message === 'PAYMENT_REQUIRED') {
          console.error('[Batch Translate] Payment required - out of credits');
          return new Response(
            JSON.stringify({ 
              error: 'Translation credits depleted. Please add more credits to continue.',
              errorType: 'PAYMENT_REQUIRED',
              partialTranslations: translations
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw error;
      }
    }

    console.log(`[Batch Translate] Successfully translated ${translations.length} texts`);

    // Reconstruct the translation object if sourceTranslations provided
    const translationObject: Record<string, any> = {};
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
