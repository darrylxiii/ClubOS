#!/usr/bin/env node
/**
 * Full Translation Audit Script
 * Compares every key in English (source of truth) against all other languages.
 * Reports: missing keys, untranslated keys (still English), and extra keys.
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const LOCALES_DIR = resolve(import.meta.dirname, '../src/i18n/locales');
const NAMESPACES = [
  'admin', 'analytics', 'auth', 'candidates', 'common', 
  'compliance', 'contracts', 'jobs', 'meetings', 'messages',
  'onboarding', 'partner', 'settings'
];
const LANGUAGES = ['en', 'nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru', 'it', 'pt'];

// Branding words that should stay in English/original form
const BRANDING_WORDS = [
  'Club OS', 'ClubOS', 'The Quantum Club', 'Quantum Club',
  'Club', 'Quantum', 'ClubSync', 'ClubHome', 'Club Home',
  'Moneybird', 'WhatsApp', 'LinkedIn', 'Google', 'Supabase',
  'iOS', 'Android', 'API', 'MFA', 'PDF', 'CSV', 'URL',
  'Stripe', 'Slack', 'Microsoft', 'Zoom', 'Calendly',
];

/**
 * Flatten a nested JSON object into dot-notation keys
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Check if a value is likely untranslated (same as English)
 * Exclude short values, numbers, branding words, placeholders, URLs, etc.
 */
function isLikelyUntranslated(enValue, otherValue, lang) {
  if (typeof enValue !== 'string' || typeof otherValue !== 'string') return false;
  if (enValue !== otherValue) return false;
  
  // Skip very short strings (2 chars or less) - likely abbreviations
  if (enValue.length <= 2) return false;
  
  // Skip if it's just a number or symbol
  if (/^[\d\s.,;:!?%$€£¥#+\-*/=@()[\]{}|\\<>]+$/.test(enValue)) return false;
  
  // Skip URLs, emails
  if (/^(https?:\/\/|mailto:|tel:)/.test(enValue)) return false;
  
  // Skip if it's a placeholder pattern like {{variable}}
  if (/^\{\{.+\}\}$/.test(enValue)) return false;
  
  // Skip if it's ONLY branding words
  let cleaned = enValue;
  for (const brand of BRANDING_WORDS) {
    cleaned = cleaned.replace(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
  }
  if (cleaned.length === 0) return false;
  
  // Skip single-word technical terms commonly untranslatable
  const technicalTerms = ['email', 'admin', 'dashboard', 'status', 'logo', 'login', 'logout', 'online', 'offline', 'premium', 'pro', 'team', 'pipeline'];
  if (technicalTerms.includes(enValue.toLowerCase())) return false;
  
  // If it's more than 3 characters and identical, it's likely untranslated
  return enValue.length > 3;
}

// Main audit
const results = {};
let totalMissing = 0;
let totalUntranslated = 0;
let totalMissingFiles = 0;
let totalKeys = 0;
let totalTranslatedKeys = 0;

// Collect English keys per namespace
const enKeys = {};

for (const ns of NAMESPACES) {
  const enFile = join(LOCALES_DIR, 'en', `${ns}.json`);
  if (!existsSync(enFile)) {
    console.error(`❌ English file missing: ${ns}.json`);
    continue;
  }
  const enData = JSON.parse(readFileSync(enFile, 'utf-8'));
  enKeys[ns] = flattenObject(enData);
  totalKeys += Object.keys(enKeys[ns]).length;
}

console.log(`\n📊 English (source of truth): ${totalKeys} total keys across ${NAMESPACES.length} namespaces\n`);

// Audit each language
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  
  results[lang] = {
    missingFiles: [],
    missingKeys: {},
    untranslatedKeys: {},
    totalMissing: 0,
    totalUntranslated: 0,
    totalPresent: 0,
    totalKeys: totalKeys,
  };
  
  for (const ns of NAMESPACES) {
    const langFile = join(LOCALES_DIR, lang, `${ns}.json`);
    
    if (!existsSync(langFile)) {
      results[lang].missingFiles.push(ns);
      results[lang].missingKeys[ns] = Object.keys(enKeys[ns] || {});
      results[lang].totalMissing += Object.keys(enKeys[ns] || {}).length;
      totalMissingFiles++;
      continue;
    }
    
    const langData = JSON.parse(readFileSync(langFile, 'utf-8'));
    const langFlat = flattenObject(langData);
    const enFlat = enKeys[ns] || {};
    
    const missing = [];
    const untranslated = [];
    
    for (const [key, enValue] of Object.entries(enFlat)) {
      if (!(key in langFlat)) {
        missing.push(key);
      } else if (isLikelyUntranslated(enValue, langFlat[key], lang)) {
        untranslated.push(key);
      } else {
        results[lang].totalPresent++;
      }
    }
    
    if (missing.length > 0) {
      results[lang].missingKeys[ns] = missing;
      results[lang].totalMissing += missing.length;
    }
    
    if (untranslated.length > 0) {
      results[lang].untranslatedKeys[ns] = untranslated;
      results[lang].totalUntranslated += untranslated.length;
    }
    
    if (missing.length === 0 && untranslated.length === 0) {
      results[lang].totalPresent += Object.keys(enFlat).length;
    }
  }
  
  totalMissing += results[lang].totalMissing;
  totalUntranslated += results[lang].totalUntranslated;
}

// Generate report
let report = `# 🌐 Translation Audit Report\n`;
report += `**Generated**: ${new Date().toISOString()}\n\n`;
report += `## Summary\n\n`;
report += `| Metric | Count |\n`;
report += `|--------|-------|\n`;
report += `| English keys (source of truth) | ${totalKeys} |\n`;
report += `| Namespaces | ${NAMESPACES.length} |\n`;
report += `| Target languages | ${LANGUAGES.length - 1} |\n`;
report += `| Total missing keys (across all langs) | ${totalMissing} |\n`;
report += `| Total untranslated keys (still English) | ${totalUntranslated} |\n`;
report += `| Missing translation files | ${totalMissingFiles} |\n\n`;

// Per-language summary table
report += `## Per-Language Overview\n\n`;
report += `| Language | Missing Keys | Untranslated | Present & Translated | Completion % |\n`;
report += `|----------|-------------|-------------|---------------------|-------------|\n`;

for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const r = results[lang];
  const translated = totalKeys - r.totalMissing - r.totalUntranslated;
  const pct = ((translated / totalKeys) * 100).toFixed(1);
  const langNames = { nl: '🇳🇱 Dutch', de: '🇩🇪 German', fr: '🇫🇷 French', es: '🇪🇸 Spanish', zh: '🇨🇳 Chinese', ar: '🇸🇦 Arabic', ru: '🇷🇺 Russian', it: '🇮🇹 Italian', pt: '🇵🇹 Portuguese' };
  report += `| ${langNames[lang] || lang} | ${r.totalMissing} | ${r.totalUntranslated} | ${translated} | ${pct}% |\n`;
}

// Per-language detailed breakdown
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const r = results[lang];
  const langNames = { nl: '🇳🇱 Dutch', de: '🇩🇪 German', fr: '🇫🇷 French', es: '🇪🇸 Spanish', zh: '🇨🇳 Chinese', ar: '🇸🇦 Arabic', ru: '🇷🇺 Russian', it: '🇮🇹 Italian', pt: '🇵🇹 Portuguese' };
  
  report += `\n---\n\n## ${langNames[lang] || lang} — Detail\n\n`;
  
  if (r.missingFiles.length > 0) {
    report += `### ❌ Missing Files (entire namespace missing)\n`;
    for (const ns of r.missingFiles) {
      report += `- \`${ns}.json\` — ${Object.keys(enKeys[ns] || {}).length} keys\n`;
    }
    report += `\n`;
  }
  
  if (Object.keys(r.missingKeys).length > 0) {
    report += `### 🔴 Missing Keys by Namespace\n\n`;
    for (const [ns, keys] of Object.entries(r.missingKeys)) {
      if (r.missingFiles.includes(ns)) continue; // Already reported as missing file
      report += `<details>\n<summary><strong>${ns}</strong> — ${keys.length} missing keys</summary>\n\n`;
      // Show first 30 keys, then summarize
      const shown = keys.slice(0, 30);
      for (const k of shown) {
        report += `- \`${k}\`\n`;
      }
      if (keys.length > 30) {
        report += `- ... and ${keys.length - 30} more\n`;
      }
      report += `\n</details>\n\n`;
    }
  }
  
  if (Object.keys(r.untranslatedKeys).length > 0) {
    report += `### 🟡 Untranslated Keys (still in English)\n\n`;
    for (const [ns, keys] of Object.entries(r.untranslatedKeys)) {
      report += `<details>\n<summary><strong>${ns}</strong> — ${keys.length} untranslated</summary>\n\n`;
      const shown = keys.slice(0, 30);
      for (const k of shown) {
        report += `- \`${k}\`\n`;
      }
      if (keys.length > 30) {
        report += `- ... and ${keys.length - 30} more\n`;
      }
      report += `\n</details>\n\n`;
    }
  }
  
  if (r.missingFiles.length === 0 && Object.keys(r.missingKeys).length === 0 && Object.keys(r.untranslatedKeys).length === 0) {
    report += `✅ **Fully translated!**\n`;
  }
}

// JSON data for programmatic use
const jsonSummary = {};
for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const r = results[lang];
  const translated = totalKeys - r.totalMissing - r.totalUntranslated;
  jsonSummary[lang] = {
    totalKeys,
    missing: r.totalMissing,
    untranslated: r.totalUntranslated,
    translated,
    completionPct: parseFloat(((translated / totalKeys) * 100).toFixed(1)),
    missingFiles: r.missingFiles,
    missingKeysByNamespace: Object.fromEntries(
      Object.entries(r.missingKeys).map(([ns, keys]) => [ns, keys.length])
    ),
    untranslatedKeysByNamespace: Object.fromEntries(
      Object.entries(r.untranslatedKeys).map(([ns, keys]) => [ns, keys.length])
    ),
  };
}

// Write outputs
const reportPath = resolve(import.meta.dirname, '../translation_audit_full.md');
writeFileSync(reportPath, report);
console.log(`📝 Full report written to: translation_audit_full.md`);

const jsonPath = resolve(import.meta.dirname, '../translation_audit_data.json');
writeFileSync(jsonPath, JSON.stringify(jsonSummary, null, 2));
console.log(`📊 JSON data written to: translation_audit_data.json`);

// Console summary
console.log(`\n${'='.repeat(80)}`);
console.log(`  TRANSLATION AUDIT SUMMARY`);
console.log(`${'='.repeat(80)}\n`);

const langNames = { nl: '🇳🇱 NL', de: '🇩🇪 DE', fr: '🇫🇷 FR', es: '🇪🇸 ES', zh: '🇨🇳 ZH', ar: '🇸🇦 AR', ru: '🇷🇺 RU', it: '🇮🇹 IT', pt: '🇵🇹 PT' };

console.log(`English keys: ${totalKeys} across ${NAMESPACES.length} namespaces\n`);
console.log(`${'Lang'.padEnd(8)} | ${'Missing'.padEnd(10)} | ${'Untransl.'.padEnd(10)} | ${'Translated'.padEnd(12)} | ${'%'.padEnd(6)}`);
console.log(`${'─'.repeat(8)} | ${'─'.repeat(10)} | ${'─'.repeat(10)} | ${'─'.repeat(12)} | ${'─'.repeat(6)}`);

for (const lang of LANGUAGES) {
  if (lang === 'en') continue;
  const s = jsonSummary[lang];
  const name = langNames[lang] || lang;
  console.log(`${name.padEnd(8)} | ${String(s.missing).padEnd(10)} | ${String(s.untranslated).padEnd(10)} | ${String(s.translated).padEnd(12)} | ${s.completionPct}%`);
}

console.log(`\n${'='.repeat(80)}\n`);
