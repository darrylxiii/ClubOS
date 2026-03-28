#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const LOCALES = resolve(import.meta.dirname, '../src/i18n/locales');
const EN_DIR = join(LOCALES, 'en');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

// 1. Count EN keys per namespace
const enNamespaces = readdirSync(EN_DIR).filter(f => f.endsWith('.json') && !f.includes('critical') && !f.includes('deferred'));
const enKeys = {};
let totalEnKeys = 0;

console.log('=== ENGLISH KEY COUNTS (Source of Truth) ===');
for (const ns of enNamespaces) {
  const data = JSON.parse(readFileSync(join(EN_DIR, ns), 'utf-8'));
  const flat = flatten(data);
  const count = Object.keys(flat).length;
  enKeys[ns] = { count, flat };
  totalEnKeys += count;
  console.log(`  ${ns.padEnd(20)} ${count} keys`);
}
console.log(`  ${'TOTAL'.padEnd(20)} ${totalEnKeys} keys\n`);

// 2. For each language, count keys and find gaps
const langs = readdirSync(LOCALES).filter(d => d !== 'en' && !d.startsWith('.'));
console.log('=== TRANSLATION COVERAGE BY LANGUAGE ===');
console.log(`${'Lang'.padEnd(6)} ${'Keys'.padStart(7)} ${'Missing'.padStart(9)} ${'Same'.padStart(7)} ${'Coverage'.padStart(10)}`);
console.log('-'.repeat(45));

for (const lang of langs.sort()) {
  let langTotal = 0;
  let langMissing = 0;
  let langSame = 0;

  for (const ns of enNamespaces) {
    try {
      const langData = JSON.parse(readFileSync(join(LOCALES, lang, ns), 'utf-8'));
      const langFlat = flatten(langData);
      const enFlat = enKeys[ns].flat;

      for (const [key, enVal] of Object.entries(enFlat)) {
        if (typeof enVal !== 'string') continue;
        if (!(key in langFlat)) {
          langMissing++;
        } else if (langFlat[key] === enVal && enVal.length > 3 && !/^[\d\s.,;:!?%$€£¥#+\-\/=@()\[\]{}|\\<>]+$/.test(enVal) && !/^(https?:|mailto:|tel:)/.test(enVal)) {
          langSame++;
        }
        langTotal++;
      }
    } catch {
      // Namespace doesn't exist for this lang
      if (enKeys[ns]) langMissing += enKeys[ns].count;
      langTotal += enKeys[ns]?.count || 0;
    }
  }

  const translated = langTotal - langMissing - langSame;
  const pct = langTotal > 0 ? ((translated / langTotal) * 100).toFixed(1) : '0.0';
  console.log(`${lang.padEnd(6)} ${langTotal.toString().padStart(7)} ${langMissing.toString().padStart(9)} ${langSame.toString().padStart(7)} ${(pct + '%').padStart(10)}`);
}

console.log('\nNote: "Same" = keys where the translation is identical to English (likely untranslated)');
console.log('      "Missing" = keys that exist in EN but not in the target language file');
