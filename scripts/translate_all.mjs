#!/usr/bin/env node
/**
 * Master Translation Sync Script
 * Phase 1: For every supported language, ensures every key from EN exists in the target JSON.
 *          Missing keys get the English value as a placeholder (so the app never shows blank).
 * 
 * This is a structural sync — it doesn't translate, it just ensures key parity.
 * Run this first, then run the actual translation passes.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const LOCALES_DIR = resolve(import.meta.dirname, '../src/i18n/locales');
const NAMESPACES = [
  'admin', 'analytics', 'auth', 'candidates', 'common',
  'compliance', 'contracts', 'jobs', 'meetings', 'messages',
  'onboarding', 'partner', 'settings'
];
// Only the 7 supported languages (skip it/pt as they're not in SUPPORTED_LANGUAGES)
const TARGET_LANGUAGES = ['nl', 'de', 'fr', 'es', 'zh', 'ar', 'ru'];

/**
 * Deep merge: adds keys from source that are missing in target.
 * Does NOT overwrite existing values.
 */
function deepMerge(source, target) {
  const result = { ...target };
  let added = 0;

  for (const [key, value] of Object.entries(source)) {
    if (!(key in result)) {
      result[key] = value;
      added++;
    } else if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
    ) {
      const merged = deepMerge(value, result[key]);
      result[key] = merged.result;
      added += merged.added;
    }
  }

  return { result, added };
}

let totalAdded = 0;
let filesModified = 0;

for (const lang of TARGET_LANGUAGES) {
  const langDir = join(LOCALES_DIR, lang);
  if (!existsSync(langDir)) {
    mkdirSync(langDir, { recursive: true });
  }

  for (const ns of NAMESPACES) {
    const enFile = join(LOCALES_DIR, 'en', `${ns}.json`);
    const langFile = join(langDir, `${ns}.json`);

    if (!existsSync(enFile)) {
      console.warn(`⚠️  EN/${ns}.json missing, skipping`);
      continue;
    }

    const enData = JSON.parse(readFileSync(enFile, 'utf-8'));
    let langData = {};

    if (existsSync(langFile)) {
      langData = JSON.parse(readFileSync(langFile, 'utf-8'));
    }

    const { result, added } = deepMerge(enData, langData);

    if (added > 0) {
      writeFileSync(langFile, JSON.stringify(result, null, 2) + '\n');
      console.log(`✅ ${lang}/${ns}.json — added ${added} missing keys`);
      totalAdded += added;
      filesModified++;
    } else {
      console.log(`  ${lang}/${ns}.json — all keys present ✓`);
    }
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`  Total keys synced: ${totalAdded} across ${filesModified} files`);
console.log(`${'='.repeat(60)}\n`);
