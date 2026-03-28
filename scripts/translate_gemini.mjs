#!/usr/bin/env node
/**
 * AI-Powered Translation Engine using Google Gemini API
 * Translates all remaining untranslated strings across all languages
 * Uses Gemini 2.5 Flash for speed and cost efficiency
 * 
 * Usage: GEMINI_API_KEY=xxx node scripts/translate_gemini.mjs <lang> [namespace]
 * If no namespace specified, processes all namespaces for that language.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const LOCALES = resolve(import.meta.dirname, '../src/i18n/locales');
const API_KEY = process.env.GEMINI_API_KEY;
const LANG = process.argv[2];
const NS_FILTER = process.argv[3]; // optional

if (!API_KEY) { console.error('Set GEMINI_API_KEY env var'); process.exit(1); }
if (!LANG) { console.error('Usage: node translate_gemini.mjs <lang> [namespace]'); process.exit(1); }

const NAMESPACES = NS_FILTER 
  ? [NS_FILTER] 
  : ['common','admin','partner','meetings','jobs','candidates','settings','auth','analytics','onboarding','compliance','contracts','messages'];

const LANG_CONFIG = {
  nl: { name: 'Dutch', native: 'Nederlands', tone: 'Use formal "u" form (not "je/jij"). Professional B2B recruitment platform. Direct and clear Dutch.' },
  de: { name: 'German', native: 'Deutsch', tone: 'Use formal "Sie" form. Professional, precise German for a B2B recruitment platform.' },
  fr: { name: 'French', native: 'Français', tone: 'Use formal "vous" form. Elegant, professional French for a B2B recruitment platform.' },
  es: { name: 'Spanish', native: 'Español', tone: 'Use formal "usted" form. Professional, neutral Latin American Spanish for a B2B platform.' },
  zh: { name: 'Chinese (Simplified)', native: '简体中文', tone: 'Simplified Chinese (zh-CN). Professional, concise for a B2B recruitment platform.' },
  ar: { name: 'Arabic', native: 'العربية', tone: 'Modern Standard Arabic. Professional tone for a B2B recruitment platform.' },
  ru: { name: 'Russian', native: 'Русский', tone: 'Use formal "Вы" form. Professional Russian for a B2B recruitment platform.' },
  it: { name: 'Italian', native: 'Italiano', tone: 'Use formal "Lei" form. Professional, elegant Italian for a B2B recruitment platform.' },
  pt: { name: 'Portuguese (European)', native: 'Português', tone: 'Use formal European Portuguese (pt-PT). Professional tone for a B2B recruitment platform.' },
};

const config = LANG_CONFIG[LANG];
if (!config) { console.error('Unknown language: ' + LANG); process.exit(1); }

// ============================================================
// GEMINI API
// ============================================================
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

async function callGemini(prompt, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      });
      
      if (resp.status === 429) {
        const wait = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.log(`    ⏳ Rate limited, retrying in ${Math.round(wait/1000)}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      
      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`    ❌ API error ${resp.status}: ${errText.substring(0, 200)}`);
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return null;
      }
      
      const data = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      
      try {
        return JSON.parse(text);
      } catch {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { return JSON.parse(jsonMatch[0]); } catch { return null; }
        }
        return null;
      }
    } catch (err) {
      console.error(`    ❌ Request error: ${err.message}`);
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  return null;
}

// ============================================================
// SKIP LOGIC
// ============================================================
function shouldSkip(key, value) {
  if (typeof value !== 'string') return true;
  if (value.length <= 2) return true;
  if (/^[\d\s.,;:!?%$€£¥#+\-*/=@()\[\]{}|\\<>]+$/.test(value)) return true;
  if (/^(https?:\/\/|mailto:|tel:)/.test(value)) return true;
  if (/^\{\{.+\}\}$/.test(value)) return true;
  // Supabase column selectors
  if (/^[a-z_]+(\([a-z_:!,\s]+\))?(,\s*[a-z_!]+(\([a-z_:!,\s]+\))?)+$/i.test(value)) return true;
  if (/^[a-z]{2}-[A-Z]{2}$/.test(value)) return true;
  // Pure branding
  const brands = ['Club OS','ClubOS','The Quantum Club','Club AI','Club Pilot','Club Radio',
    'Club Home','ClubSync','ClubHome','WhatsApp','LinkedIn','Google','GitHub','Apple',
    'Moneybird','Stripe','PDF','CSV','API','MFA','SSL','GDPR','JSON','HTML','CSS','SQL',
    'NPS','ROI','KPI','SLA','DPA','BAA','GPT-5','Gemini 2.5 Pro','Gemini 2.5 Flash',
    'WhatsApp Business','TQC Team','Darryl','REST','GraphQL'];
  if (brands.includes(value.trim())) return true;
  return false;
}

// ============================================================
// COLLECT UNTRANSLATED STRINGS
// ============================================================
function collectUntranslated(enObj, langObj, path = '') {
  const items = [];
  for (const [key, enVal] of Object.entries(enObj)) {
    const p = path ? `${path}.${key}` : key;
    if (enVal && typeof enVal === 'object' && !Array.isArray(enVal)) {
      items.push(...collectUntranslated(enVal, langObj?.[key], p));
    } else if (typeof enVal === 'string' && langObj?.[key] === enVal) {
      if (!shouldSkip(p, enVal)) {
        items.push({ key: p, value: enVal });
      }
    }
  }
  return items;
}

// ============================================================
// SET VALUE BY DOT PATH
// ============================================================
function setByPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// ============================================================
// MAIN LOOP
// ============================================================
const BATCH_SIZE = 40; // strings per API call

async function translateNamespace(ns) {
  const enFile = join(LOCALES, 'en', `${ns}.json`);
  const langFile = join(LOCALES, LANG, `${ns}.json`);
  if (!existsSync(enFile) || !existsSync(langFile)) return 0;
  
  const enData = JSON.parse(readFileSync(enFile, 'utf-8'));
  const langData = JSON.parse(readFileSync(langFile, 'utf-8'));
  
  const untranslated = collectUntranslated(enData, langData);
  if (untranslated.length === 0) {
    console.log(`  ✅ ${ns}.json — fully translated`);
    return 0;
  }
  
  console.log(`  📝 ${ns}.json — ${untranslated.length} strings to translate...`);
  
  let totalTranslated = 0;
  
  // Process in batches
  for (let i = 0; i < untranslated.length; i += BATCH_SIZE) {
    const batch = untranslated.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(untranslated.length / BATCH_SIZE);
    
    // Build the translation request
    const entries = {};
    batch.forEach(item => { entries[item.key] = item.value; });
    
    const prompt = `You are a professional translator for a B2B recruitment platform called "The Quantum Club" (ClubOS).

Translate the following English UI strings to ${config.name} (${config.native}).

RULES:
1. ${config.tone}
2. PRESERVE these brand names exactly as-is: "The Quantum Club", "Club", "ClubOS", "Club AI", "Club Pilot", "Club Radio", "Club Home", "ClubSync", "Moneybird", "WhatsApp", "LinkedIn", "Stripe", "Zoom", "Calendly"
3. PRESERVE template variables exactly: {{variable}}, {{count}}, {{name}}, etc.
4. PRESERVE HTML tags: <strong>, <br/>, etc.
5. Keep translations concise — UI labels should be short
6. For single-word technical terms used globally (Dashboard, Email, Team, etc.) use the standard ${config.name} equivalent
7. Return ONLY a JSON object mapping the SAME KEYS to translated values

JSON to translate:
${JSON.stringify(entries, null, 2)}`;

    process.stdout.write(`    Batch ${batchNum}/${totalBatches} (${batch.length} strings)...`);
    
    const result = await callGemini(prompt);
    
    if (result && typeof result === 'object') {
      let batchCount = 0;
      for (const [key, translated] of Object.entries(result)) {
        if (typeof translated === 'string' && translated.length > 0) {
          setByPath(langData, key, translated);
          batchCount++;
        }
      }
      totalTranslated += batchCount;
      console.log(` ✅ ${batchCount} translated`);
    } else {
      console.log(` ❌ failed`);
    }
    
    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < untranslated.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  if (totalTranslated > 0) {
    writeFileSync(langFile, JSON.stringify(langData, null, 2) + '\n');
  }
  
  console.log(`  📊 ${ns}.json — ${totalTranslated}/${untranslated.length} translated`);
  return totalTranslated;
}

// Run all namespaces
console.log(`\n🌐 Translating to ${config.name} (${config.native})...\n`);

let grandTotal = 0;
for (const ns of NAMESPACES) {
  const count = await translateNamespace(ns);
  grandTotal += count;
}

console.log(`\n${'='.repeat(60)}`);
console.log(`  🎉 ${LANG.toUpperCase()} COMPLETE: ${grandTotal} strings translated via Gemini AI`);
console.log(`${'='.repeat(60)}\n`);
