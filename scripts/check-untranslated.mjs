#!/usr/bin/env node
/**
 * Check how many DE values still match EN (untranslated).
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

let grandTotal = 0;
let grandUntranslated = 0;

for (const ns of NAMESPACES) {
  const enFile = join(BASE, 'en', `${ns}.json`);
  const deFile = join(BASE, 'de', `${ns}.json`);

  const en = JSON.parse(readFileSync(enFile, 'utf8'));
  const de = JSON.parse(readFileSync(deFile, 'utf8'));

  const deKeys = getAllKeys(de);
  let untranslated = 0;
  const examples = [];

  for (const keyPath of deKeys) {
    const deValue = getNestedValue(de, keyPath);
    const enValue = getNestedValue(en, keyPath);

    if (typeof deValue !== 'string') continue;
    if (deValue === enValue && deValue.trim() !== '') {
      // Skip technical strings that should stay same
      if (/^[a-z_]+, [a-z_]+/.test(deValue)) continue;
      if (/^\*,/.test(deValue)) continue;
      if (deValue.startsWith('@/') || deValue.startsWith('resumes/')) continue;
      if (/^[a-z]{2}-[A-Z]{2}$/.test(deValue)) continue;
      if (/^[^a-zA-Z]*$/.test(deValue) && deValue.length <= 3) continue;
      // Skip brand names / technical terms that should stay
      if (['Club AI', 'Club Pilot', 'Pipeline', 'Dashboard', 'KPI', 'CRM', 'API',
           'LinkedIn', 'GitHub', 'WhatsApp', 'Zoom', 'QUIN', 'Google Meet',
           'Microsoft Teams', 'ABC-DEFG-HIJ', 'QR Code', 'AUC-ROC',
           'WhatsApp Business', 'The Quantum Club', 'Round Robin',
           'Feed', 'Live Hub', 'Status', 'Budget', 'Portfolio', 'Emoji',
           'Score', 'Info', 'Team', 'OK', 'Format', 'Median', 'Platform',
           'Links', 'Metadata', 'Hybrid', 'Freelance'].includes(deValue)) continue;
      // Skip snake_case identifiers
      if (/^[A-Z][a-z_]+_[a-z]/.test(deValue)) continue;
      // Skip values that are only letters and underscores (code identifiers)
      if (/^[A-Za-z]+_[a-z_]+$/.test(deValue)) continue;

      untranslated++;
      if (examples.length < 5) {
        examples.push(`  ${keyPath}: "${deValue}"`);
      }
    }
  }

  grandTotal += deKeys.length;
  grandUntranslated += untranslated;
  if (untranslated > 0) {
    console.log(`${ns}: ${untranslated} untranslated strings (of ${deKeys.length} total)`);
    for (const ex of examples) console.log(ex);
  } else {
    console.log(`${ns}: fully translated (${deKeys.length} keys)`);
  }
}

console.log(`\nGrand total: ${grandUntranslated} untranslated of ${grandTotal}`);
