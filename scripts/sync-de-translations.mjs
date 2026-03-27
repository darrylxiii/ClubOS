#!/usr/bin/env node
/**
 * Finds missing keys in DE translation files compared to EN.
 * Outputs a JSON report of all missing keys per namespace.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');
const NAMESPACES = [
  'common', 'admin', 'analytics', 'auth', 'candidates',
  'compliance', 'contracts', 'jobs', 'meetings', 'messages',
  'onboarding', 'partner', 'settings'
];

function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

const report = {};

for (const ns of NAMESPACES) {
  try {
    const enFile = join(BASE, 'en', `${ns}.json`);
    const deFile = join(BASE, 'de', `${ns}.json`);

    const en = JSON.parse(readFileSync(enFile, 'utf8'));
    const de = JSON.parse(readFileSync(deFile, 'utf8'));

    const enKeys = getAllKeys(en);
    const deKeys = new Set(getAllKeys(de));

    const missing = enKeys.filter(k => !deKeys.has(k));

    // Build a missing-only object with EN values
    const missingObj = {};
    for (const key of missing) {
      setNestedValue(missingObj, key, getNestedValue(en, key));
    }

    report[ns] = {
      totalEN: enKeys.length,
      totalDE: deKeys.size,
      missingCount: missing.length,
      missingKeys: missing,
      missingValues: missingObj
    };

    console.log(`${ns}: EN=${enKeys.length}, DE=${deKeys.size}, Missing=${missing.length}`);
  } catch (e) {
    console.error(`Error processing ${ns}: ${e.message}`);
  }
}

// Write the report
import { writeFileSync } from 'fs';
writeFileSync(
  join(import.meta.dirname, 'de-missing-report.json'),
  JSON.stringify(report, null, 2)
);
console.log('\nReport written to scripts/de-missing-report.json');
