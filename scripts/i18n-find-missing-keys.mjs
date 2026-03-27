#!/usr/bin/env node
/**
 * Find all t('key') calls in partner/ and clubhome/ components
 * that reference keys NOT present in the EN locale files.
 * Outputs the missing keys so we can add them.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d';

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === '__tests__') continue;
      collectFiles(full, files);
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
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

// Load existing keys
const partnerJson = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales/en/partner.json'), 'utf-8'));
const commonJson = JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales/en/common.json'), 'utf-8'));

const partnerKeys = flattenObj(partnerJson);
const commonKeys = flattenObj(commonJson);

// Collect all t() calls from partner/ files
const missingPartner = {};
const missingCommon = {};
let missingCount = 0;

function scanFile(filePath, defaultNamespace) {
  const content = readFileSync(filePath, 'utf-8');

  // Match t('key') and t("key") patterns
  const regex = /t\(['"]([^'"]+)['"]/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const key = match[1];

    // Handle cross-namespace: t('common:key')
    if (key.startsWith('common:')) {
      const actualKey = key.substring(7);
      if (!commonKeys[actualKey]) {
        missingCommon[actualKey] = `[MISSING] from ${relative(ROOT, filePath)}`;
        missingCount++;
      }
    } else if (key.startsWith('partner:')) {
      const actualKey = key.substring(8);
      if (!partnerKeys[actualKey]) {
        missingPartner[actualKey] = `[MISSING] from ${relative(ROOT, filePath)}`;
        missingCount++;
      }
    } else {
      // Default namespace
      if (defaultNamespace === 'partner') {
        if (!partnerKeys[key]) {
          missingPartner[key] = `[MISSING] from ${relative(ROOT, filePath)}`;
          missingCount++;
        }
      } else {
        if (!commonKeys[key]) {
          missingCommon[key] = `[MISSING] from ${relative(ROOT, filePath)}`;
          missingCount++;
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
for (const [key, src] of sortedPartner) {
  console.log(`  ${key} -> ${src}`);
}

console.log(`\n=== Missing COMMON keys ===`);
const sortedCommon = Object.entries(missingCommon).sort(([a], [b]) => a.localeCompare(b));
for (const [key, src] of sortedCommon) {
  console.log(`  ${key} -> ${src}`);
}

console.log(`\nTotal missing: ${missingCount} (partner: ${sortedPartner.length}, common: ${sortedCommon.length})`);

// Now auto-generate reasonable default values for missing keys and add them
console.log('\n=== Auto-generating missing keys ===');

function keyToDefaultValue(key) {
  // Convert camelCase key to readable English
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];

  // Convert camelCase to spaced words
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// Add missing partner keys
const newPartnerKeys = {};
for (const [key] of sortedPartner) {
  const value = keyToDefaultValue(key);
  setNested(newPartnerKeys, key, value);
}

// Add missing common keys
const newCommonKeys = {};
for (const [key] of sortedCommon) {
  const value = keyToDefaultValue(key);
  setNested(newCommonKeys, key, value);
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

if (sortedPartner.length > 0) {
  const merged = deepMerge(partnerJson, newPartnerKeys);
  writeFileSync(join(ROOT, 'src/i18n/locales/en/partner.json'), JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`Added ${sortedPartner.length} missing keys to partner.json`);
}

if (sortedCommon.length > 0) {
  const merged = deepMerge(commonJson, newCommonKeys);
  writeFileSync(join(ROOT, 'src/i18n/locales/en/common.json'), JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  console.log(`Added ${sortedCommon.length} missing keys to common.json`);
}
