#!/usr/bin/env node
/**
 * Batch i18n conversion script
 * Adds useTranslation import and hook, replaces hardcoded English strings with t() calls
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Directories to process (achievements already done)
const DIRECTORIES = [
  'src/components/blind-spot',
  'src/components/charts',
  'src/components/clubpilot',
  'src/components/clubtasks',
  'src/components/dialogs',
  'src/components/feedback',
  'src/components/image-editor',
  'src/components/incubator',
  'src/components/landing',
  'src/components/legal',
  'src/components/miljoenenjacht',
  'src/components/mobile',
  'src/components/notifications',
  'src/components/objectives',
  'src/components/partner-setup',
  'src/components/pressure-cooker',
  'src/components/proposals',
  'src/components/support',
  'src/components/swipe-game',
  'src/components/tracking',
  'src/components/values-poker',
  'src/components/voice',
  'src/components/time-tracking',
  'src/components/workspace',
  'src/components/ai',
  'src/components/audience',
  'src/components/email',
  'src/components/academy',
];

// Namespace mapping
function getNamespace(dir) {
  if (dir.includes('compliance')) return 'compliance';
  if (dir.includes('analytics')) return 'analytics';
  return 'common';
}

// Get section key prefix from directory name
function getSectionPrefix(dir) {
  const dirName = path.basename(dir);
  const mapping = {
    'blind-spot': 'blindSpot',
    'charts': 'charts',
    'clubpilot': 'clubPilot',
    'clubtasks': 'clubTasks',
    'dialogs': 'dialogs',
    'feedback': 'feedback',
    'image-editor': 'imageEditor',
    'incubator': 'incubator',
    'landing': 'landing',
    'legal': 'legal',
    'miljoenenjacht': 'miljoenenjacht',
    'mobile': 'mobile',
    'notifications': 'notifications',
    'objectives': 'objectives',
    'partner-setup': 'partnerSetup',
    'pressure-cooker': 'pressureCooker',
    'proposals': 'proposals',
    'support': 'support',
    'swipe-game': 'swipeGame',
    'tracking': 'tracking',
    'values-poker': 'valuesPoker',
    'voice': 'voice',
    'time-tracking': 'timeTracking',
    'workspace': 'workspace',
    'ai': 'ai',
    'audience': 'audience',
    'email': 'email',
    'academy': 'academy',
  };
  return mapping[dirName] || dirName;
}

// All collected translation keys
const allKeys = {};
let keyCounter = 0;

function camelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase())
    .substring(0, 40);
}

function makeKey(section, text) {
  // Create a meaningful key from the text
  let key = camelCase(text.substring(0, 50));
  if (!key) key = `text${keyCounter++}`;
  return `${section}.${key}`;
}

function hasUserVisibleText(content) {
  // Check if file has any hardcoded English text in JSX
  // Look for text between > and < that isn't just whitespace or {expressions}
  const jsxTextPattern = />\s*([A-Z][a-zA-Z\s]{2,})/;
  const stringPropPattern = /(?:title|label|placeholder|description|heading)=["']([^"']+)["']/;
  return jsxTextPattern.test(content) || stringPropPattern.test(content);
}

function alreadyHasI18n(content) {
  return content.includes('useTranslation') || content.includes("from 'react-i18next'");
}

function processFile(filePath, section) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has i18n
  if (alreadyHasI18n(content)) {
    console.log(`  SKIP (already has i18n): ${path.basename(filePath)}`);
    return 0;
  }

  // Skip if no user-visible text
  if (!hasUserVisibleText(content)) {
    console.log(`  SKIP (no visible text): ${path.basename(filePath)}`);
    return 0;
  }

  const namespace = 'common';
  let changeCount = 0;
  const fileKeys = {};

  // 1. Add import
  // Find the first import statement to add after
  if (content.includes("import {") || content.includes("import React")) {
    // Add useTranslation import after the first import line
    const firstImportEnd = content.indexOf('\n', content.indexOf('import '));
    if (firstImportEnd !== -1) {
      // Check if react-i18next import already exists
      if (!content.includes("react-i18next")) {
        content = content.slice(0, firstImportEnd + 1) +
          "import { useTranslation } from 'react-i18next';\n" +
          content.slice(firstImportEnd + 1);
        changeCount++;
      }
    }
  }

  // 2. Add hook - find the component function and add const { t } = useTranslation
  // Handle various patterns: export const X = () => {, export function X() {, etc.
  const hookPatterns = [
    // Arrow function components: export const X = (...) => {
    /(?:export\s+(?:const|let)\s+\w+\s*=\s*(?:memo\()?\s*(?:\([\s\S]*?\)|\w+)\s*(?::\s*\w+)?\s*=>\s*\{)\s*\n/,
    // Regular function components: export function X(...) {
    /(?:export\s+function\s+\w+\s*\([\s\S]*?\)\s*\{)\s*\n/,
    // Non-exported: const X = (...) => {
    /(?:const\s+\w+\s*=\s*(?:memo\()?\s*\([\s\S]*?\)\s*=>\s*\{)\s*\n/,
    // Function declaration: function X() {
    /(?:function\s+\w+\s*\([\s\S]*?\)\s*\{)\s*\n/,
  ];

  let hookAdded = false;
  for (const pattern of hookPatterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      const insertPos = match.index + match[0].length;
      // Check if hook already exists nearby
      const nextChunk = content.substring(insertPos, insertPos + 200);
      if (!nextChunk.includes('useTranslation')) {
        content = content.slice(0, insertPos) +
          `  const { t } = useTranslation('${namespace}');\n` +
          content.slice(insertPos);
        hookAdded = true;
        changeCount++;
        break;
      }
    }
  }

  if (!hookAdded) {
    console.log(`  WARN (could not add hook): ${path.basename(filePath)}`);
    // Still write the import even if hook placement failed
  }

  // 3. Replace hardcoded strings - common patterns
  const replacements = [];

  // Pattern: >Text Content< (JSX text children)
  // This is complex - let's do targeted replacements for common patterns

  // Replace string literals in common props
  const propPatterns = [
    { regex: /placeholder="([^"]+)"/g, prop: 'placeholder' },
    { regex: /aria-label="([^"]+)"/g, prop: 'aria-label' },
  ];

  for (const { regex, prop } of propPatterns) {
    content = content.replace(regex, (match, text) => {
      if (text.startsWith('{') || text.startsWith('$') || /^[a-z]/.test(text)) return match;
      const key = makeKey(section, text);
      fileKeys[key] = text;
      changeCount++;
      return `${prop}={t('${key}')}`;
    });
  }

  // Replace JSX text in specific patterns like:
  // <h3>Some Title</h3> -> <h3>{t('key')}</h3>
  // <p>Some text</p> -> <p>{t('key')}</p>
  // <span>Text</span> -> <span>{t('key')}</span>
  // <Button>Text</Button> -> <Button>{t('key')}</Button>
  // <CardTitle>Text</CardTitle> -> <CardTitle>{t('key')}</CardTitle>
  const tagTextPattern = /(<(?:h[1-6]|p|span|Button|CardTitle|CardDescription|DialogTitle|DialogDescription|AlertDescription|TabsTrigger|Label|AlertDialogTitle|AlertDialogDescription|AlertDialogCancel|AlertDialogAction)(?:\s[^>]*)?>)\s*([A-Z][^<{}\n]{2,}?)\s*(<\/)/g;

  content = content.replace(tagTextPattern, (match, openTag, text, closeTag) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3) return match;
    // Skip if it looks like a variable or expression
    if (trimmed.includes('{') || trimmed.includes('}')) return match;
    // Skip if it's just a number or symbol
    if (/^\d+$/.test(trimmed)) return match;

    const key = makeKey(section, trimmed);
    fileKeys[key] = trimmed;
    changeCount++;
    return `${openTag}{t('${key}')}${closeTag}`;
  });

  // Replace text in toast calls
  content = content.replace(/toast\.(success|error|info|warning)\(\s*"([^"]+)"\s*\)/g, (match, method, text) => {
    const key = makeKey(section, text);
    fileKeys[key] = text;
    changeCount++;
    return `toast.${method}(t('${key}'))`;
  });

  // Replace text in toast calls with single quotes
  content = content.replace(/toast\.(success|error|info|warning)\(\s*'([^']+)'\s*\)/g, (match, method, text) => {
    const key = makeKey(section, text);
    fileKeys[key] = text;
    changeCount++;
    return `toast.${method}(t('${key}'))`;
  });

  // Save file keys
  Object.assign(allKeys, fileKeys);

  if (changeCount > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`  CONVERTED: ${path.basename(filePath)} (${changeCount} changes, ${Object.keys(fileKeys).length} keys)`);
  } else {
    console.log(`  NO CHANGES: ${path.basename(filePath)}`);
  }

  return changeCount;
}

// Main
let totalFiles = 0;
let totalChanges = 0;

for (const dir of DIRECTORIES) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) {
    console.log(`SKIP DIR (not found): ${dir}`);
    continue;
  }

  const section = getSectionPrefix(dir);
  console.log(`\nProcessing ${dir} (section: ${section}):`);

  const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.tsx'));

  for (const file of files) {
    const filePath = path.join(fullDir, file);
    const changes = processFile(filePath, section);
    totalFiles++;
    totalChanges += changes;
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Files processed: ${totalFiles}`);
console.log(`Total changes: ${totalChanges}`);
console.log(`Total keys: ${Object.keys(allKeys).length}`);

// Write keys to a temp file for review
const keysPath = path.join(ROOT, 'scripts', 'i18n-new-keys.json');
fs.writeFileSync(keysPath, JSON.stringify(allKeys, null, 2));
console.log(`Keys written to: ${keysPath}`);
