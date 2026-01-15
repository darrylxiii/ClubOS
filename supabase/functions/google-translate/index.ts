/**
 * Google Cloud Translation Edge Function
 * Enterprise-grade: Uses Google Cloud Translation v2 API for high-quality translations
 */
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { createFunctionLogger, getClientInfo } from '../_shared/function-logger.ts';

// Input validation schema
const googleTranslateSchema = z.object({
  texts: z.array(z.string().max(5000)).max(128), // Google allows up to 128 texts per request
  targetLanguage: z.enum(['nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru']),
  sourceLanguage: z.string().default('en'),
});

// Google Cloud Translation language codes
const GOOGLE_LANGUAGE_CODES: Record<string, string> = {
  nl: 'nl',
  de: 'de',
  fr: 'fr',
  es: 'es',
  zh: 'zh-CN', // Simplified Chinese
  ar: 'ar',
  ru: 'ru',
  en: 'en',
};

interface GoogleTranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
}

interface GoogleTranslationResponse {
  data: {
    translations: GoogleTranslationResult[];
  };
}

interface TranslationValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate translation quality
 */
function validateTranslation(
  original: string, 
  translated: string, 
  targetLanguage: string
): TranslationValidation {
  const errors: string[] = [];
  
  // Check for empty translation
  if (!translated || translated.trim() === '') {
    errors.push('Empty translation');
  }
  
  // Check placeholder preservation ({{name}}, {count}, etc.)
  const placeholderRegex = /\{\{?\w+\}?\}/g;
  const originalPlaceholders = original.match(placeholderRegex) || [];
  const translatedPlaceholders = translated.match(placeholderRegex) || [];
  
  if (originalPlaceholders.length !== translatedPlaceholders.length) {
    errors.push(`Placeholder mismatch: expected ${originalPlaceholders.length}, got ${translatedPlaceholders.length}`);
  }
  
  // Check for suspicious length (translation shouldn't be <30% or >300% of original)
  const lengthRatio = translated.length / original.length;
  if (lengthRatio < 0.3 || lengthRatio > 3.0) {
    // Only warn for non-CJK languages (Chinese/Japanese/Korean are typically shorter)
    if (!['zh', 'ja', 'ko'].includes(targetLanguage)) {
      errors.push(`Suspicious length ratio: ${(lengthRatio * 100).toFixed(0)}%`);
    }
  }
  
  // Check for HTML/special character encoding issues
  if (translated.includes('&amp;') || translated.includes('&lt;') || translated.includes('&gt;')) {
    errors.push('HTML encoding detected in translation');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const logger = createFunctionLogger('google-translate');
  const clientInfo = getClientInfo(req);
  logger.logRequest(req.method, undefined, { ip: clientInfo.ip });

  try {
    // Rate limiting: 200 requests per hour per IP (Google is fast)
    const rateLimitResult = await checkUserRateLimit(clientInfo.ip, "google-translate", 200, 3600000);
    if (!rateLimitResult.allowed) {
      logger.logRateLimit(clientInfo.ip);
      return createRateLimitResponse(rateLimitResult.retryAfter || 3600, publicCorsHeaders);
    }

    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_TRANSLATE_API_KEY');
    if (!googleApiKey) {
      throw new Error('GOOGLE_CLOUD_TRANSLATE_API_KEY not configured');
    }

    // Validate input
    const rawInput = await req.json();
    const validationResult = googleTranslateSchema.safeParse(rawInput);
    
    if (!validationResult.success) {
      logger.error('Validation failed', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten() }),
        { status: 400, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { texts, targetLanguage, sourceLanguage } = validationResult.data;
    const googleTargetLang = GOOGLE_LANGUAGE_CODES[targetLanguage] || targetLanguage;
    const googleSourceLang = GOOGLE_LANGUAGE_CODES[sourceLanguage] || sourceLanguage;

    logger.info(`Translating ${texts.length} texts from ${googleSourceLang} to ${googleTargetLang}`);

    // Call Google Cloud Translation API v2
    const googleApiUrl = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
    
    const response = await fetch(googleApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: texts,
        source: googleSourceLang,
        target: googleTargetLang,
        format: 'text', // Preserve text formatting
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Google API error (${response.status}):`, errorText);
      
      if (response.status === 403) {
        throw new Error('GOOGLE_API_FORBIDDEN: Check API key permissions');
      }
      if (response.status === 429) {
        throw new Error('GOOGLE_RATE_LIMITED');
      }
      
      throw new Error(`Google API error: ${response.status}`);
    }

    const googleResponse: GoogleTranslationResponse = await response.json();
    const translations = googleResponse.data.translations;

    // Validate each translation
    const results: Array<{
      original: string;
      translated: string;
      validation: TranslationValidation;
    }> = [];

    for (let i = 0; i < texts.length; i++) {
      const original = texts[i];
      const translated = translations[i]?.translatedText || '';
      const validation = validateTranslation(original, translated, targetLanguage);
      
      results.push({
        original,
        translated,
        validation,
      });

      if (!validation.isValid) {
        logger.warn(`Translation validation warning for text ${i}: ${validation.errors.join(', ')}`);
      }
    }

    const validCount = results.filter(r => r.validation.isValid).length;
    const invalidCount = results.length - validCount;

    logger.info(`Translation complete: ${validCount} valid, ${invalidCount} with warnings`);

    logger.logSuccess(200, { 
      translatedCount: results.length,
      validCount,
      invalidCount,
    });

    return new Response(
      JSON.stringify({ 
        translations: results.map(r => r.translated),
        validations: results.map(r => r.validation),
        stats: {
          total: results.length,
          valid: validCount,
          warnings: invalidCount,
        }
      }),
      { 
        headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    logger.error('Google translation failed', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Translation failed';
    
    if (errorMessage.includes('GOOGLE_RATE_LIMITED')) {
      return new Response(
        JSON.stringify({ error: 'Google API rate limited, please try again later' }),
        { status: 429, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
