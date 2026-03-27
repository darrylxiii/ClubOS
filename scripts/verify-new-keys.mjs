#!/usr/bin/env node
/**
 * Verify that all keys in EN exist in DE, and check translation quality
 * of the newly added keys.
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

// Brand names and technical terms that should stay in English
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

let totalMissing = 0;
let totalUntranslated = 0;

for (const ns of NAMESPACES) {
  const enFile = join(BASE, 'en', `${ns}.json`);
  const deFile = join(BASE, 'de', `${ns}.json`);

  const en = JSON.parse(readFileSync(enFile, 'utf8'));
  const de = JSON.parse(readFileSync(deFile, 'utf8'));

  const enKeys = getAllKeys(en);
  const deKeySet = new Set(getAllKeys(de));

  // Check for missing keys
  const missing = enKeys.filter(k => !deKeySet.has(k));
  totalMissing += missing.length;

  // Check for untranslated among newly added
  // Load the original missing report to know which were new
  let report;
  try {
    const reportData = JSON.parse(readFileSync(join(import.meta.dirname, 'de-missing-report.json'), 'utf8'));
    report = reportData[ns];
  } catch { report = null; }

  let untranslated = 0;
  if (report && report.missingKeys) {
    for (const keyPath of report.missingKeys) {
      const deValue = getNestedValue(de, keyPath);
      const enValue = getNestedValue(en, keyPath);
      if (typeof deValue !== 'string') continue;
      if (deValue === enValue) {
        // Check if it should stay English
        if (keepEnglish.has(deValue)) continue;
        if (/^[^a-zA-Z]*$/.test(deValue) && deValue.length <= 3) continue;
        if (/^[a-z_]+, [a-z_]+/.test(deValue)) continue;
        if (/^\*,/.test(deValue)) continue;
        if (deValue.startsWith('@/')) continue;
        if (/^[a-z]{2}-[A-Z]{2}$/.test(deValue)) continue;
        if (/^[A-Za-z]+_[a-z_]+$/.test(deValue)) continue;
        untranslated++;
      }
    }
  }
  totalUntranslated += untranslated;

  if (missing.length > 0 || untranslated > 0) {
    console.log(`${ns}: Missing=${missing.length}, Untranslated new keys=${untranslated} (of ${report ? report.missingCount : '?'} added)`);
  } else {
    console.log(`${ns}: OK - all ${report ? report.missingCount : 0} new keys translated`);
  }
}

console.log(`\nTotal missing keys: ${totalMissing}`);
console.log(`Total untranslated new keys: ${totalUntranslated}`);
