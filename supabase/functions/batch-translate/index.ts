/**
 * Batch Translate Edge Function
 * Enterprise-grade: Smart batching (multiple texts per prompt), proper rate limiting
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { createFunctionLogger, getClientInfo } from '../_shared/function-logger.ts';

// Input validation schema
const batchTranslateSchema = z.object({
  texts: z.array(z.string().max(1000)).max(200).optional(),
  targetLanguage: z.enum(['nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru']),
  context: z.string().max(100).optional(),
  namespace: z.string().max(50),
  sourceTranslations: z.record(z.any()).optional()
});

const LANGUAGE_NAMES: Record<string, string> = {
  nl: 'Dutch',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
  ar: 'Arabic',
  ru: 'Russian'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const logger = createFunctionLogger('batch-translate');
  const clientInfo = getClientInfo(req);
  logger.logRequest(req.method, undefined, { ip: clientInfo.ip });

  try {
    // Rate limiting: 100 requests per hour per IP
    const rateLimitResult = await checkUserRateLimit(clientInfo.ip, "batch-translate", 100, 3600000);
    if (!rateLimitResult.allowed) {
      logger.logRateLimit(clientInfo.ip);
      return createRateLimitResponse(rateLimitResult.retryAfter || 3600, publicCorsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input
    const rawInput = await req.json();
    const validationResult = batchTranslateSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      logger.error('Validation failed', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten() }),
        { status: 400, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetLanguage, namespace, sourceTranslations } = validationResult.data;

    if (!sourceTranslations || typeof sourceTranslations !== 'object') {
      return new Response(
        JSON.stringify({ error: 'sourceTranslations object is required' }),
        { status: 400, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Flatten the nested object to key-value pairs
    const flattenObject = (obj: any, prefix = ''): Array<{ key: string; value: string }> => {
      const results: Array<{ key: string; value: string }> = [];
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') {
          results.push({ key: fullKey, value });
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          results.push(...flattenObject(value, fullKey));
        }
      }
      return results;
    };

    const flatPairs = flattenObject(sourceTranslations);
    logger.info(`Processing ${flatPairs.length} texts for ${targetLanguage}`);

    if (flatPairs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No texts found to translate' }),
        { status: 400, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

    // SMART BATCHING: Translate multiple texts in ONE prompt (up to 15 at a time)
    const BATCH_SIZE = 15;
    const translatedPairs: Array<{ key: string; value: string }> = [];

    for (let i = 0; i < flatPairs.length; i += BATCH_SIZE) {
      const batch = flatPairs.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(flatPairs.length / BATCH_SIZE);
      
      logger.info(`Translating batch ${batchNum}/${totalBatches} (${batch.length} texts)`);

      // Build a JSON array for batch translation
      const textsToTranslate = batch.map((p, idx) => ({ id: idx, text: p.value }));
      
      const prompt = `Translate each text to ${languageName}. Return a JSON array with the same structure.
      
Input:
${JSON.stringify(textsToTranslate, null, 2)}

Rules:
- Return ONLY a valid JSON array
- Each object must have "id" (same as input) and "text" (translated)
- Maintain professional, sophisticated tone for a luxury recruitment platform
- Do NOT add explanations or extra text`;

      let success = false;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { 
                  role: 'system', 
                  content: 'You are a professional translator. Return ONLY valid JSON. No explanations.'
                },
                { role: 'user', content: prompt }
              ],
              temperature: 0.3,
            }),
          });

          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
            logger.warn(`Rate limited (429), waiting ${waitTime}ms...`);
            await sleep(waitTime);
            continue;
          }

          if (response.status === 402) {
            throw new Error('PAYMENT_REQUIRED');
          }

          if (!response.ok) {
            const errorText = await response.text();
            logger.error(`API error (${response.status}):`, errorText);
            throw new Error(`API_ERROR_${response.status}`);
          }

          const data = await response.json();
          const content = data.choices[0].message.content.trim();
          
          // Parse the JSON response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (!jsonMatch) {
            throw new Error('Invalid JSON response');
          }

          const translatedArray = JSON.parse(jsonMatch[0]);
          
          // Map translations back to keys
          for (const item of translatedArray) {
            const originalPair = batch[item.id];
            if (originalPair) {
              translatedPairs.push({ key: originalPair.key, value: item.text });
            }
          }

          success = true;
          break;
        } catch (error: any) {
          lastError = error;
          if (error.message === 'PAYMENT_REQUIRED') {
            throw error;
          }
          if (attempt < 3) {
            const backoffTime = Math.pow(2, attempt) * 1000;
            logger.warn(`Retry ${attempt}/3 after ${backoffTime}ms`);
            await sleep(backoffTime);
          }
        }
      }

      if (!success) {
        logger.error(`Failed batch ${batchNum} after 3 attempts`, lastError);
        // Add original texts as fallback for failed batch
        for (const pair of batch) {
          translatedPairs.push({ key: pair.key, value: `[TRANSLATION_FAILED] ${pair.value}` });
        }
      }

      // Wait between batches (1.5s) to avoid rate limits
      if (i + BATCH_SIZE < flatPairs.length) {
        await sleep(1500);
      }
    }

    // Reconstruct nested object from flat pairs
    const translationObject: Record<string, any> = {};
    for (const { key, value } of translatedPairs) {
      const keys = key.split('.');
      let current: any = translationObject;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
    }

    // Store in database using UPSERT
    logger.info(`Storing ${targetLanguage} translation for ${namespace}...`);
    
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseServiceKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id;
    }

    // UPSERT: Insert or update on conflict
    const { error: upsertError } = await supabase
      .from('translations')
      .upsert({
        namespace,
        language: targetLanguage,
        translations: translationObject,
        version: 1,
        generated_by: userId,
        generated_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'namespace,language,version',
        ignoreDuplicates: false
      });

    if (upsertError) {
      logger.error('Failed to upsert translation', upsertError);
    } else {
      logger.info(`✓ Stored ${targetLanguage} translation for ${namespace}`);
    }

    logger.logSuccess(200, { translatedCount: translatedPairs.length });

    return new Response(
      JSON.stringify({ translations: translationObject }),
      { 
        headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    logger.error('Translation failed', error);
    
    if (error instanceof Error && error.message === 'PAYMENT_REQUIRED') {
      return new Response(
        JSON.stringify({ error: 'Translation credits depleted', errorType: 'PAYMENT_REQUIRED' }),
        { status: 402, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Translation failed' }),
      { status: 500, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
