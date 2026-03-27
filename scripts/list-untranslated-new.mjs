#!/usr/bin/env node
/**
 * List all untranslated newly added keys for targeted translation.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = join(import.meta.dirname, '..', 'src', 'i18n', 'locales');

const keepEnglish = new Set([
  'Club AI', 'Club Pilot', 'Club Home', 'Club Radio', 'Club Sync',
  'Pipeline', 'Dashboard', 'KPI', 'CRM', 'API', 'LinkedIn', 'GitHub',
  'WhatsApp', 'Zoom', 'QUIN', 'Google Meet', 'Microsoft Teams',
  'WhatsApp Business', 'The Quantum Club', 'Round Robin', 'Feed',
  'Live Hub', 'Status', 'Budget', 'Portfolio', 'Emoji', 'Score', 'Info',
  'Team', 'OK', 'Format', 'Median', 'Platform', 'Links', 'Metadata',
  'Hybrid', 'Freelance', 'Blog', 'FAQ', 'Slack', 'Support', 'Chat',
  'Spam', 'Online', 'Offline', 'Trends', 'Google', 'Apple', 'Compliance',
  'Version', 'Junior', 'Senior', 'Lead', 'Remote', 'AUC-ROC',
  'Tech Corp', '(Optional)', 'optional', 'ABC-DEFG-HIJ', 'QR Code',
  'Quantum Club', 'Quantum Meetings', 'Achievements', 'TQC',
  'Benchmarks', 'Max', 'Min', 'Outlook', 'Labels',
]);

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

const report = JSON.parse(readFileSync(join(import.meta.dirname, 'de-missing-report.json'), 'utf8'));
const result = {};

for (const [ns, data] of Object.entries(report)) {
  if (!data.missingKeys || data.missingKeys.length === 0) continue;

  const en = JSON.parse(readFileSync(join(BASE, 'en', `${ns}.json`), 'utf8'));
  const de = JSON.parse(readFileSync(join(BASE, 'de', `${ns}.json`), 'utf8'));

  const untranslated = [];
  for (const keyPath of data.missingKeys) {
    const deValue = getNestedValue(de, keyPath);
    const enValue = getNestedValue(en, keyPath);
    if (typeof deValue !== 'string') continue;
    if (deValue !== enValue) continue;
    if (keepEnglish.has(deValue)) continue;
    if (/^[^a-zA-Z]*$/.test(deValue) && deValue.length <= 3) continue;
    if (/^[a-z_]+, [a-z_]+/.test(deValue)) continue;
    if (/^\*,/.test(deValue)) continue;
    if (deValue.startsWith('@/')) continue;
    if (/^[a-z]{2}-[A-Z]{2}$/.test(deValue)) continue;
    if (/^[A-Za-z]+_[a-z_]+$/.test(deValue)) continue;

    untranslated.push({ key: keyPath, en: enValue });
  }

  if (untranslated.length > 0) {
    result[ns] = untranslated;
  }
}

// Write unique EN values per namespace
for (const [ns, items] of Object.entries(result)) {
  const uniqueValues = [...new Set(items.map(i => i.en))].sort();
  console.log(`\n=== ${ns}: ${items.length} untranslated (${uniqueValues.length} unique values) ===`);
  // Print first 30 unique values
  for (const v of uniqueValues.slice(0, 30)) {
    console.log(`  "${v}"`);
  }
  if (uniqueValues.length > 30) {
    console.log(`  ... and ${uniqueValues.length - 30} more`);
  }
}

// Write complete list to file
writeFileSync(
  join(import.meta.dirname, 'de-untranslated-values.json'),
  JSON.stringify(result, null, 2)
);
