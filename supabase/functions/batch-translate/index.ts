/**
 * Batch Translate Edge Function
 * Enterprise-grade: Uses Google Cloud Translation as primary, Lovable AI as fallback
 * Includes validation for placeholder preservation, length, and encoding
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

// Google Cloud Translation language codes
const GOOGLE_LANGUAGE_CODES: Record<string, string> = {
  nl: 'nl',
  de: 'de',
  fr: 'fr',
  es: 'es',
  zh: 'zh-CN',
  ar: 'ar',
  ru: 'ru',
};

interface TranslationValidation {
  isValid: boolean;
  errors: string[];
  qualityScore: number; // 0-100
}

/**
 * Validate translation quality with scoring
 */
function validateTranslation(
  original: string, 
  translated: string, 
  targetLanguage: string
): TranslationValidation {
  const errors: string[] = [];
  let score = 100;
  
  // Check for empty translation
  if (!translated || translated.trim() === '') {
    errors.push('Empty translation');
    score = 0;
    return { isValid: false, errors, qualityScore: score };
  }
  
  // Check placeholder preservation ({{name}}, {count}, %s, %d, etc.)
  const placeholderRegex = /\{\{?\w+\}?\}|%[sd]/g;
  const originalPlaceholders = (original.match(placeholderRegex) || []).sort();
  const translatedPlaceholders = (translated.match(placeholderRegex) || []).sort();
  
  if (originalPlaceholders.length !== translatedPlaceholders.length) {
    errors.push(`Placeholder mismatch: expected ${originalPlaceholders.length}, got ${translatedPlaceholders.length}`);
    score -= 30;
  } else {
    // Check if all placeholders are preserved
    for (let i = 0; i < originalPlaceholders.length; i++) {
      if (originalPlaceholders[i] !== translatedPlaceholders[i]) {
        errors.push(`Placeholder changed: ${originalPlaceholders[i]} → ${translatedPlaceholders[i]}`);
        score -= 15;
      }
    }
  }
  
  // Check for suspicious length (CJK languages are typically shorter)
  const lengthRatio = translated.length / original.length;
  const isCJK = ['zh', 'ja', 'ko'].includes(targetLanguage);
  
  if (!isCJK && (lengthRatio < 0.3 || lengthRatio > 3.5)) {
    errors.push(`Suspicious length ratio: ${(lengthRatio * 100).toFixed(0)}%`);
    score -= 20;
  }
  
  // Check for HTML encoding issues
  if (translated.includes('&amp;') || translated.includes('&lt;') || translated.includes('&gt;')) {
    errors.push('HTML encoding detected');
    score -= 10;
  }
  
  // Check for untranslated segments (original text appearing in translation)
  if (translated === original && original.length > 3) {
    errors.push('Translation identical to original');
    score -= 40;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    qualityScore: Math.max(0, score),
  };
}

/**
 * Call Google Cloud Translation API
 */
async function translateWithGoogle(
  texts: string[], 
  targetLanguage: string,
  googleApiKey: string,
  logger: ReturnType<typeof createFunctionLogger>
): Promise<{ translations: string[]; success: boolean; error?: string }> {
  const googleTargetLang = GOOGLE_LANGUAGE_CODES[targetLanguage] || targetLanguage;
  const googleApiUrl = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
  
  try {
    // Google allows max 128 texts per request, batch if needed
    const GOOGLE_BATCH_SIZE = 100;
    const allTranslations: string[] = [];
    
    for (let i = 0; i < texts.length; i += GOOGLE_BATCH_SIZE) {
      const batch = texts.slice(i, i + GOOGLE_BATCH_SIZE);
      
      const response = await fetch(googleApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: batch,
          source: 'en',
          target: googleTargetLang,
          format: 'text',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Google API error (${response.status}):`, errorText);
        return { translations: [], success: false, error: `Google API: ${response.status}` };
      }

      const data = await response.json();
      const batchTranslations = data.data.translations.map((t: any) => t.translatedText);
      allTranslations.push(...batchTranslations);
      
      // Small delay between batches to avoid rate limits
      if (i + GOOGLE_BATCH_SIZE < texts.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    
    return { translations: allTranslations, success: true };
  } catch (error) {
    logger.error('Google translation error:', error);
    return { translations: [], success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Call Lovable AI (Gemini) as fallback
 */
async function translateWithAI(
  texts: Array<{ key: string; value: string }>,
  targetLanguage: string,
  lovableApiKey: string,
  logger: ReturnType<typeof createFunctionLogger>
): Promise<{ translations: string[]; success: boolean }> {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const BATCH_SIZE = 15;
  const allTranslations: string[] = [];
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const textsToTranslate = batch.map((p, idx) => ({ id: idx, text: p.value }));
    
    const prompt = `Translate each text to ${languageName}. Return a JSON array with the same structure.
    
Input:
${JSON.stringify(textsToTranslate, null, 2)}

Rules:
- Return ONLY a valid JSON array
- Each object must have "id" (same as input) and "text" (translated)
- PRESERVE all placeholders like {{name}}, {count}, %s exactly as they appear
- Maintain professional, sophisticated tone for a luxury recruitment platform
- Do NOT add explanations or extra text`;

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
            { role: 'system', content: 'You are a professional translator. Return ONLY valid JSON. No explanations.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        logger.error(`AI API error (${response.status})`);
        // Return empty for this batch
        for (const _ of batch) {
          allTranslations.push('');
        }
        continue;
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const translatedArray = JSON.parse(jsonMatch[0]);
        for (const item of translatedArray) {
          allTranslations.push(item.text || '');
        }
      }
    } catch (error) {
      logger.error('AI translation error:', error);
      for (const _ of batch) {
        allTranslations.push('');
      }
    }

    if (i + BATCH_SIZE < texts.length) {
      await sleep(1000);
    }
  }

  return { translations: allTranslations, success: allTranslations.some(t => t !== '') };
}

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
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_TRANSLATE_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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

    const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    let translatedTexts: string[] = [];
    let translationProvider = 'none';

    // Strategy: Try Google Cloud Translation first, fallback to AI
    if (googleApiKey) {
      logger.info('Using Google Cloud Translation as primary provider');
      const googleResult = await translateWithGoogle(
        flatPairs.map(p => p.value),
        targetLanguage,
        googleApiKey,
        logger
      );

      if (googleResult.success && googleResult.translations.length === flatPairs.length) {
        translatedTexts = googleResult.translations;
        translationProvider = 'google';
        logger.info(`✓ Google translation successful for ${translatedTexts.length} texts`);
      } else {
        logger.warn('Google translation failed or incomplete, falling back to AI');
      }
    }

    // Fallback to Lovable AI if Google failed or not configured
    if (translatedTexts.length === 0 && lovableApiKey) {
      logger.info('Using Lovable AI as fallback provider');
      const aiResult = await translateWithAI(flatPairs, targetLanguage, lovableApiKey, logger);
      
      if (aiResult.success) {
        translatedTexts = aiResult.translations;
        translationProvider = 'lovable_ai';
        logger.info(`✓ AI translation completed for ${translatedTexts.length} texts`);
      }
    }

    if (translatedTexts.length === 0) {
      throw new Error('No translation provider available or all providers failed');
    }

    // Validate translations and build result
    const translatedPairs: Array<{ 
      key: string; 
      value: string; 
      validation: TranslationValidation;
    }> = [];

    let validCount = 0;
    let warningCount = 0;

    for (let i = 0; i < flatPairs.length; i++) {
      const original = flatPairs[i];
      const translated = translatedTexts[i] || original.value; // Fallback to original if empty
      const validation = validateTranslation(original.value, translated, targetLanguage);

      if (validation.isValid) {
        validCount++;
      } else {
        warningCount++;
        logger.warn(`Validation warning for "${original.key}": ${validation.errors.join(', ')}`);
      }

      translatedPairs.push({
        key: original.key,
        value: translated,
        validation,
      });
    }

    logger.info(`Validation: ${validCount} valid, ${warningCount} with warnings`);

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

    // Store in database using MERGE (not replace)
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

    // Check if translation exists and MERGE instead of replacing
    const { data: existing } = await supabase
      .from('translations')
      .select('translations')
      .eq('namespace', namespace)
      .eq('language', targetLanguage)
      .eq('is_active', true)
      .single();

    // Deep merge function
    const deepMerge = (target: any, source: any): any => {
      const result = { ...target };
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    };

    // Merge new translations with existing (if any)
    const mergedTranslations = existing?.translations 
      ? deepMerge(existing.translations, translationObject)
      : translationObject;

    // Calculate average quality score for this batch
    const avgQualityScore = translatedPairs.reduce((sum, p) => sum + p.validation.qualityScore, 0) / translatedPairs.length;
    const qualityStatus = warningCount > 0 ? 'needs_review' : 'validated';

    const { error: upsertError } = await supabase
      .from('translations')
      .upsert({
        namespace,
        language: targetLanguage,
        translations: mergedTranslations,
        version: 1,
        generated_by: userId,
        generated_at: new Date().toISOString(),
        is_active: true,
        quality_score: Math.round(avgQualityScore),
        quality_status: qualityStatus,
        translation_provider: translationProvider,
      }, {
        onConflict: 'namespace,language,version',
        ignoreDuplicates: false
      });

    if (upsertError) {
      logger.error('Failed to upsert translation', upsertError);
    } else {
      const newKeysCount = Object.keys(translationObject).length;
      const totalKeysCount = Object.keys(mergedTranslations).length;
      logger.info(`✓ Merged ${newKeysCount} keys into ${namespace}:${targetLanguage} (total: ${totalKeysCount})`);
    }

    logger.logSuccess(200, { 
      translatedCount: translatedPairs.length,
      provider: translationProvider,
      validCount,
      warningCount,
    });

    return new Response(
      JSON.stringify({ 
        translations: translationObject,
        stats: {
          total: translatedPairs.length,
          valid: validCount,
          warnings: warningCount,
          provider: translationProvider,
        }
      }),
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
