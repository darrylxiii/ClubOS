#!/usr/bin/env node
/**
 * Backfill new i18n keys into locale JSON files
 * Extracts keys from t('key', 'Fallback') patterns and adds them to the correct namespace JSON
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const SRC_DIR = resolve(import.meta.dirname, '../src');
const LOCALES_DIR = resolve(import.meta.dirname, '../src/i18n/locales/en');

// Map namespace prefixes to JSON files (some keys go to specific namespaces)
const NAMESPACE_MAP = {
  'admin': 'admin.json',
  'common': 'common.json',
  'analytics': 'analytics.json',
  'candidates': 'candidates.json',
  'jobs': 'jobs.json',
  'partner': 'partner.json',
  'settings': 'settings.json',
  'auth': 'auth.json',
  'meetings': 'meetings.json',
  'messages': 'messages.json',
};

// Scan all TSX/TS files for t('key', 'Fallback') patterns
function scanForKeys(dir) {
  const keys = new Map(); // key -> { fallback, namespace }
  
  const files = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const stat = statSync(full);
      if (stat.isDirectory() && !entry.includes('node_modules') && !entry.includes('.git')) {
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.includes('.test.') && !entry.includes('.spec.') && !entry.includes('.d.ts')) {
        files.push(full);
      }
    }
  }
  walk(dir);

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    
    // Find which namespace this file uses
    const nsMatch = content.match(/useTranslation\(['"]([^'"]+)['"]\)/);
    const namespace = nsMatch ? nsMatch[1] : null;
    if (!namespace) continue;
    
    // Find all t('key', 'Fallback') patterns
    const tCalls = content.matchAll(/t\('([^']+)',\s*'([^']+)'\)/g);
    for (const match of tCalls) {
      const key = match[1];
      const fallback = match[2];
      keys.set(`${namespace}:${key}`, { key, fallback, namespace });
    }
    
    // Also find t("key", "Fallback") with double quotes
    const tCallsDouble = content.matchAll(/t\("([^"]+)",\s*"([^"]+)"\)/g);
    for (const match of tCallsDouble) {
      const key = match[1];
      const fallback = match[2];
      keys.set(`${namespace}:${key}`, { key, fallback, namespace });
    }
  }
  
  return keys;
}

// Set a nested key in an object
function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  const lastPart = parts[parts.length - 1];
  if (current[lastPart] === undefined) {
    current[lastPart] = value;
    return true; // was new
  }
  return false; // already existed
}

// Check if a nested key exists
function hasNestedKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return false;
    current = current[part];
  }
  return true;
}

console.log('🔍 Scanning source files for translation keys...');
const allKeys = scanForKeys(SRC_DIR);
console.log(`📋 Found ${allKeys.size} unique t() calls with fallbacks`);

// Group by namespace
const byNamespace = {};
for (const [, { key, fallback, namespace }] of allKeys) {
  if (!byNamespace[namespace]) byNamespace[namespace] = [];
  byNamespace[namespace].push({ key, fallback });
}

let totalAdded = 0;
for (const [namespace, keys] of Object.entries(byNamespace)) {
  const jsonFile = NAMESPACE_MAP[namespace];
  if (!jsonFile) {
    console.log(`⚠️  Unknown namespace: ${namespace} (${keys.length} keys) — skipping`);
    continue;
  }
  
  const filePath = join(LOCALES_DIR, jsonFile);
  let json;
  try {
    json = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.log(`⚠️  Could not read ${jsonFile}: ${e.message}`);
    continue;
  }
  
  let added = 0;
  for (const { key, fallback } of keys) {
    if (!hasNestedKey(json, key)) {
      setNestedKey(json, key, fallback);
      added++;
    }
  }
  
  if (added > 0) {
    writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`✅ ${jsonFile}: Added ${added} new keys (${keys.length} total scanned)`);
    totalAdded += added;
  } else {
    console.log(`✓  ${jsonFile}: All ${keys.length} keys already present`);
  }
}

console.log(`\n🎉 Done! Added ${totalAdded} new keys across all namespaces.`);
