#!/usr/bin/env node
/**
 * Bulk i18n conversion script for page files.
 *
 * For each .tsx file in src/pages/, src/pages/admin/, src/pages/crm/:
 * 1. Skip if already has useTranslation
 * 2. Determine namespace from file path/content
 * 3. Add import + hook
 * 4. Replace hardcoded English strings with t() calls
 * 5. Collect new translation keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src', 'pages');

// Track all new keys per namespace
const newKeys = {
  common: {},
  admin: {},
  jobs: {},
  candidates: {},
  meetings: {},
  partner: {},
  settings: {},
  analytics: {},
  contracts: {},
  compliance: {},
  messages: {},
};

// Determine namespace based on file path and content
function getNamespace(filePath, content) {
  const rel = path.relative(PAGES_DIR, filePath);
  if (rel.startsWith('admin/') || rel.startsWith('admin\\')) return 'admin';
  if (rel.startsWith('crm/') || rel.startsWith('crm\\')) return 'common';
  if (rel.startsWith('partner/') || rel.startsWith('partner\\')) return 'partner';
  if (rel.startsWith('compliance/') || rel.startsWith('compliance\\')) return 'compliance';

  const name = path.basename(filePath, '.tsx');

  // Map specific pages to namespaces
  if (/meeting|livehub|personalmeeting|joinmeeting/i.test(name)) return 'meetings';
  if (/job|pipeline|hiring/i.test(name)) return 'jobs';
  if (/candidate|talent|dossier|archived/i.test(name)) return 'candidates';
  if (/partner|funnel/i.test(name)) return 'partner';
  if (/setting|scheduling/i.test(name)) return 'settings';
  if (/analytic|kpi|performance|revenue|insight|dashboard/i.test(name)) return 'analytics';
  if (/contract|retainer/i.test(name)) return 'contracts';
  if (/message|inbox|communication/i.test(name)) return 'messages';

  return 'common';
}

// Generate a camelCase key from a section + label
function toKey(section, label) {
  // Clean label: remove special chars, create camelCase
  const clean = label
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return section ? `${section}.${clean}` : clean;
}

// Extract user-visible strings from JSX and replace with t() calls
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip files that already have useTranslation
  if (content.includes('useTranslation')) {
    return { skipped: true, reason: 'already has useTranslation' };
  }

  const basename = path.basename(filePath, '.tsx');
  const ns = getNamespace(filePath, content);

  // Determine section key from component name
  const sectionKey = basename.charAt(0).toLowerCase() + basename.slice(1);

  // Check if there are any hardcoded English strings worth translating
  // Look for JSX text content (strings between > and <, or in specific attributes)
  const hasStrings = />\s*[A-Z][a-zA-Z\s',.!?&:;-]{2,}\s*</m.test(content) ||
                     /title[=:]\s*["'][A-Z]/m.test(content) ||
                     /description[=:]\s*["'][A-Z]/m.test(content) ||
                     /label[=:]\s*["'][A-Z]/m.test(content) ||
                     /placeholder[=:]\s*["'][A-Z]/m.test(content);

  if (!hasStrings) {
    return { skipped: true, reason: 'no translatable strings found' };
  }

  // Track keys for this file
  const fileKeys = {};
  let keyCounter = 0;

  function addKey(key, value) {
    const fullKey = `${sectionKey}.${key}`;
    fileKeys[fullKey] = value;
    if (!newKeys[ns]) newKeys[ns] = {};
    // Set nested key
    let obj = newKeys[ns];
    const parts = fullKey.split('.');
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    return fullKey;
  }

  // Step 1: Add import if not present
  if (!content.includes("from 'react-i18next'") && !content.includes('from "react-i18next"')) {
    // Find the right place to add the import - after the last react/react-router import
    const importRegex = /^(import\s+.*from\s+['"](?:react|react-router|react-router-dom|@tanstack)['"]\s*;?\s*\n)/m;
    const match = content.match(importRegex);
    if (match) {
      const insertPos = content.indexOf(match[0]) + match[0].length;
      content = content.slice(0, insertPos) +
        `import { useTranslation } from 'react-i18next';\n` +
        content.slice(insertPos);
    } else {
      // Add at the very top after first import
      const firstImport = content.indexOf('import ');
      const firstNewline = content.indexOf('\n', firstImport);
      content = content.slice(0, firstNewline + 1) +
        `import { useTranslation } from 'react-i18next';\n` +
        content.slice(firstNewline + 1);
    }
  }

  // Step 2: Add hook - find the component function and add after the first line
  // Match patterns like: const X = () => { or export default function X() { or function X() {
  const hookLine = `  const { t } = useTranslation('${ns}');\n`;

  // Try various component patterns
  const patterns = [
    // const Component = () => {
    /^((?:export\s+)?(?:const|let)\s+\w+\s*=\s*\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{)\s*\n/m,
    // export default function Component() {
    /^((?:export\s+default\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{)\s*\n/m,
    // const Component: React.FC = () => {
    /^((?:export\s+)?(?:const|let)\s+\w+\s*:\s*\w+(?:\.\w+)*(?:<[^>]*>)?\s*=\s*\([^)]*\)\s*=>\s*\{)\s*\n/m,
  ];

  let hookAdded = false;
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const insertPos = content.indexOf(match[0]) + match[0].length;
      // Check if hook already exists right after
      const afterMatch = content.slice(insertPos, insertPos + 200);
      if (!afterMatch.includes("useTranslation")) {
        content = content.slice(0, insertPos) + hookLine + content.slice(insertPos);
        hookAdded = true;
      }
      break;
    }
  }

  if (!hookAdded) {
    // Fallback: look for opening brace of component
    const componentStart = content.match(/(?:export\s+default\s+)?(?:function|const)\s+\w+.*?\{/s);
    if (componentStart) {
      const bracePos = content.indexOf(componentStart[0]) + componentStart[0].length;
      const afterBrace = content.slice(bracePos, bracePos + 200);
      if (!afterBrace.includes("useTranslation")) {
        content = content.slice(0, bracePos) + '\n' + hookLine + content.slice(bracePos);
      }
    }
  }

  // Step 3: Replace hardcoded strings with t() calls
  // We'll do targeted replacements for common patterns

  // Pattern: JSX text in headings h1-h6
  content = content.replace(
    /(<h[1-6][^>]*>)\s*\n?\s*([A-Z][A-Za-z0-9\s',.&:;!?/-]{2,}?)\s*\n?\s*(<\/h[1-6]>)/g,
    (match, open, text, close) => {
      const trimmed = text.trim();
      if (trimmed.includes('{') || trimmed.includes('`') || trimmed.length > 80) return match;
      const key = addKey('title', trimmed);
      return `${open}{t('${key}')}</h${close.charAt(3)}>`;
    }
  );

  // Pattern: Text in <p> tags (descriptions)
  content = content.replace(
    /(<p[^>]*>)\s*\n?\s*([A-Z][A-Za-z0-9\s',.&:;!?/()-]{5,}?)\s*\n?\s*(<\/p>)/g,
    (match, open, text, close) => {
      const trimmed = text.trim();
      if (trimmed.includes('{') || trimmed.includes('`') || trimmed.includes('<') || trimmed.length > 120) return match;
      keyCounter++;
      const key = addKey(`desc${keyCounter > 1 ? keyCounter : ''}`, trimmed);
      return `${open}{t('${key}')}</p>`;
    }
  );

  // Pattern: Button text
  content = content.replace(
    /(<Button[^>]*>)\s*\n?\s*([A-Z][A-Za-z\s]{2,30}?)\s*\n?\s*(<\/Button>)/g,
    (match, open, text, close) => {
      const trimmed = text.trim();
      if (trimmed.includes('{') || trimmed.includes('<')) return match;
      keyCounter++;
      const key = addKey(`btn${keyCounter > 1 ? keyCounter : ''}`, trimmed);
      return `${open}{t('${key}')}</Button>`;
    }
  );

  // Pattern: TabsTrigger text
  content = content.replace(
    /(<TabsTrigger[^>]*>)([A-Z][A-Za-z\s&]{2,30}?)(<\/TabsTrigger>)/g,
    (match, open, text, close) => {
      const trimmed = text.trim();
      if (trimmed.includes('{')) return match;
      const cleanKey = trimmed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const key = addKey(`tab${cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1)}`, trimmed);
      return `${open}{t('${key}')}</TabsTrigger>`;
    }
  );

  // Pattern: {"string"} in JSX
  content = content.replace(
    /\{"([A-Z][A-Za-z0-9\s',.&:;!?/()-]{2,}?)"\}/g,
    (match, text) => {
      const trimmed = text.trim();
      if (trimmed.includes('\\') || trimmed.length > 100) return match;
      keyCounter++;
      const key = addKey(`text${keyCounter}`, trimmed);
      return `{t('${key}')}`;
    }
  );

  // Write the modified file
  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    skipped: false,
    namespace: ns,
    keysAdded: Object.keys(fileKeys).length,
    keys: fileKeys
  };
}

// Collect all .tsx files
function collectFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

// Main
const dirs = [
  PAGES_DIR,
  path.join(PAGES_DIR, 'admin'),
  path.join(PAGES_DIR, 'crm'),
  path.join(PAGES_DIR, 'partner'),
  path.join(PAGES_DIR, 'compliance'),
];

let totalConverted = 0;
let totalSkipped = 0;
let totalKeys = 0;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;

  const files = collectFiles(dir);
  const relDir = path.relative(ROOT, dir);
  console.log(`\n=== Processing ${relDir} (${files.length} files) ===`);

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const result = processFile(file);

    if (result.skipped) {
      totalSkipped++;
      // Only log if not useTranslation skip
      if (result.reason !== 'already has useTranslation') {
        console.log(`  SKIP ${rel}: ${result.reason}`);
      }
    } else {
      totalConverted++;
      totalKeys += result.keysAdded;
      console.log(`  DONE ${rel}: ${result.keysAdded} keys (${result.namespace})`);
    }
  }
}

// Write collected keys to a JSON file for reference
const keysFile = path.join(ROOT, 'scripts', 'new-i18n-keys.json');
fs.writeFileSync(keysFile, JSON.stringify(newKeys, null, 2), 'utf-8');

console.log(`\n=== Summary ===`);
console.log(`Converted: ${totalConverted} files`);
console.log(`Skipped: ${totalSkipped} files`);
console.log(`New keys: ${totalKeys}`);
console.log(`Keys written to: scripts/new-i18n-keys.json`);

// Now merge new keys into existing EN locale files
const LOCALES_DIR = path.join(ROOT, 'src', 'i18n', 'locales', 'en');

for (const [ns, keys] of Object.entries(newKeys)) {
  if (Object.keys(keys).length === 0) continue;

  const localeFile = path.join(LOCALES_DIR, `${ns}.json`);
  let existing = {};

  if (fs.existsSync(localeFile)) {
    existing = JSON.parse(fs.readFileSync(localeFile, 'utf-8'));
  }

  // Deep merge new keys into existing (without overwriting)
  function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        if (typeof target[key] === 'object') {
          deepMerge(target[key], source[key]);
        }
      } else {
        // Only add if not already present
        if (!(key in target)) {
          target[key] = source[key];
        }
      }
    }
  }

  deepMerge(existing, keys);

  fs.writeFileSync(localeFile, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
  console.log(`Updated ${ns}.json with ${Object.keys(keys).length} top-level sections`);
}

console.log('\nDone! Review the changes and keys.');
