#!/usr/bin/env node
/**
 * Find REAL missing translation keys (filter out false positives)
 * and add them to the JSON locale files with sensible default values.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d';

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === '__tests__') continue;
      collectFiles(full, files);
    } else if (entry.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function flattenObj(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenObj(v, full));
    } else {
      result[full] = v;
    }
  }
  return result;
}

function setNested(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  if (!cur[parts[parts.length - 1]]) {
    cur[parts[parts.length - 1]] = value;
  }
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (!(key in result)) {
      result[key] = source[key];
    }
  }
  return result;
}

const partnerJson = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales/en/partner.json'), 'utf-8'));
const commonJson = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales/en/common.json'), 'utf-8'));

const partnerKeys = flattenObj(partnerJson);
const commonKeys = flattenObj(commonJson);

// Real translation key pattern: camelCase.camelCase or common:camelCase
// Must look like a.b.c format (dotted), start with a letter, no spaces, no special chars
function isRealKey(key) {
  // Must start with a letter
  if (!/^[a-zA-Z]/.test(key)) return false;
  // Must be all word chars, dots, and colons
  if (!/^[a-zA-Z0-9._:]+$/.test(key)) return false;
  // Must have at least one dot (nested key) OR be a common: prefixed key
  if (!key.includes('.') && !key.includes(':')) return false;
  // Must be between 5 and 100 chars
  if (key.length < 5 || key.length > 100) return false;
  // Must not look like a Supabase/SQL query
  if (key.includes('profiles(') || key.includes('companies(')) return false;
  // Must not be an import path
  if (key.startsWith('@/') || key.startsWith('./') || key.startsWith('../')) return false;
  return true;
}

function keyToDefaultValue(key) {
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  // Convert camelCase to spaced words
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/Desc$/, ' description')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const missingPartner = {};
const missingCommon = {};

function scanFile(filePath, defaultNamespace) {
  const content = readFileSync(filePath, 'utf-8');

  // Only match t('key') patterns that look like real translation calls
  // Specifically match: t('...') where t is called as a function
  const regex = /\bt\(\s*['"]([^'"]+)['"]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    if (!isRealKey(key)) continue;

    if (key.startsWith('common:')) {
      const actualKey = key.substring(7);
      if (!commonKeys[actualKey]) {
        missingCommon[actualKey] = keyToDefaultValue(actualKey);
      }
    } else if (key.startsWith('partner:')) {
      const actualKey = key.substring(8);
      if (!partnerKeys[actualKey]) {
        missingPartner[actualKey] = keyToDefaultValue(actualKey);
      }
    } else {
      if (defaultNamespace === 'partner') {
        if (!partnerKeys[key]) {
          missingPartner[key] = keyToDefaultValue(key);
        }
      } else {
        if (!commonKeys[key]) {
          missingCommon[key] = keyToDefaultValue(key);
        }
      }
    }
  }
}

const partnerFiles = collectFiles(join(ROOT, 'src/components/partner'));
const clubhomeFiles = collectFiles(join(ROOT, 'src/components/clubhome'));

for (const f of partnerFiles) scanFile(f, 'partner');
for (const f of clubhomeFiles) scanFile(f, 'common');

console.log('=== Missing PARTNER keys ===');
const sortedPartner = Object.entries(missingPartner).sort(([a], [b]) => a.localeCompare(b));
for (const [key, value] of sortedPartner) {
  console.log(`  "${key}": "${value}"`);
}

console.log(`\n=== Missing COMMON keys ===`);
const sortedCommon = Object.entries(missingCommon).sort(([a], [b]) => a.localeCompare(b));
for (const [key, value] of sortedCommon) {
  console.log(`  "${key}": "${value}"`);
}

console.log(`\nTotal missing: partner=${sortedPartner.length}, common=${sortedCommon.length}`);

// Add to JSON files
if (sortedPartner.length > 0) {
  const newKeys = {};
  for (const [key, value] of sortedPartner) {
    setNested(newKeys, key, value);
  }
  const merged = deepMerge(partnerJson, newKeys);
  writeFileSync(join(ROOT, 'src/i18n/locales/en/partner.json'), JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`\nAdded ${sortedPartner.length} missing keys to partner.json`);
}

if (sortedCommon.length > 0) {
  const newKeys = {};
  for (const [key, value] of sortedCommon) {
    setNested(newKeys, key, value);
  }
  const merged = deepMerge(commonJson, newKeys);
  writeFileSync(join(ROOT, 'src/i18n/locales/en/common.json'), JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`Added ${sortedCommon.length} missing keys to common.json`);
}
