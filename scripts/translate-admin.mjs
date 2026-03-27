#!/usr/bin/env node
/**
 * Automated i18n translation script for admin components.
 * Adds useTranslation import and hook, replaces hardcoded English strings with t() calls.
 * Collects all new translation keys and outputs them.
 */

import fs from 'fs';
import path from 'path';

const ADMIN_DIR = path.resolve('src/components/admin');
const ADMIN_JSON_PATH = path.resolve('src/i18n/locales/en/admin.json');

// Load existing admin.json
const existingAdmin = JSON.parse(fs.readFileSync(ADMIN_JSON_PATH, 'utf-8'));

// Collected new keys: { "section.key": "English value" }
const newKeys = {};

// Helper to create a translation key from component context
function toKey(prefix, text) {
  // Convert text to camelCase key
  let key = text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  // Truncate long keys
  if (key.length > 40) {
    key = key.substring(0, 40);
  }

  return `${prefix}.${key}`;
}

// Convert filename to section prefix
function fileToPrefix(filePath) {
  const relativePath = path.relative(ADMIN_DIR, filePath);
  const parts = relativePath.replace(/\.tsx$/, '').split(path.sep);

  // For subdirectory files: subdir/FileName -> subdir.fileName
  // For root files: FileName -> fileName
  if (parts.length === 1) {
    return parts[0].charAt(0).toLowerCase() + parts[0].slice(1);
  }

  const subdir = parts[0];
  const file = parts[parts.length - 1].charAt(0).toLowerCase() + parts[parts.length - 1].slice(1);
  return `${subdir}.${file}`;
}

// Check if a string looks like user-visible text (not a variable, CSS class, etc.)
function isUserVisibleText(text) {
  if (!text || text.trim().length === 0) return false;
  // Skip single characters, pure numbers, CSS classes, URLs, etc.
  if (text.trim().length <= 1) return false;
  if (/^[0-9.]+$/.test(text.trim())) return false;
  if (/^(https?:|mailto:|#|\.|\/)/.test(text.trim())) return false;
  if (/^[a-z_-]+$/.test(text.trim()) && !text.includes(' ')) return false; // CSS class names
  if (/^[A-Z_]+$/.test(text.trim())) return false; // Constants
  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(text)) return false;
  return true;
}

// Process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const prefix = fileToPrefix(filePath);
  let keysAdded = 0;

  // Skip files that are just re-exports or have no JSX
  if (!content.includes('return') && !content.includes('=>')) {
    return { changed: false, keysAdded: 0 };
  }

  // Check if the file has any JSX (render content)
  if (!content.includes('<') || !content.includes('>')) {
    return { changed: false, keysAdded: 0 };
  }

  // Step 1: Add useTranslation import if not present
  const hasTranslationImport = content.includes("from 'react-i18next'") || content.includes('from "react-i18next"');

  if (!hasTranslationImport) {
    // Find the last import statement
    const importRegex = /^import\s+.+$/gm;
    let lastImportMatch = null;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      // Handle multi-line imports
      let importEnd = match.index + match[0].length;
      if (match[0].includes('{') && !match[0].includes('}')) {
        // Multi-line import, find the closing brace
        const closingBrace = content.indexOf('}', importEnd);
        if (closingBrace !== -1) {
          const semiColon = content.indexOf(';', closingBrace);
          importEnd = semiColon !== -1 ? semiColon + 1 : closingBrace + 1;
        }
      } else {
        // Check for semicolon at end
        const semiColon = content.indexOf(';', match.index);
        if (semiColon !== -1 && semiColon < match.index + match[0].length + 5) {
          importEnd = semiColon + 1;
        }
      }
      lastImportMatch = { index: match.index, end: importEnd };
    }

    if (lastImportMatch) {
      // Find the actual end of the last import (including multi-line)
      let insertPos = lastImportMatch.end;
      // Find end of line
      const nextNewline = content.indexOf('\n', insertPos);
      if (nextNewline !== -1) {
        insertPos = nextNewline + 1;
      }
      content = content.slice(0, insertPos) +
        "import { useTranslation } from 'react-i18next';\n" +
        content.slice(insertPos);
    }
  }

  // Step 2: Add the hook inside component function if not present
  const hasHook = content.includes("useTranslation('admin')") || content.includes('useTranslation("admin")');

  if (!hasHook) {
    // Find the component function body
    // Look for patterns like: const ComponentName = () => {, function ComponentName() {, export default function
    // Also: export const ComponentName = () => {
    const componentPatterns = [
      // Arrow function components: const Name: React.FC = () => {
      /(?:export\s+)?(?:const|let)\s+\w+(?:\s*:\s*React\.FC(?:<[^>]*>)?)?(?:\s*=\s*\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{)/,
      // Arrow function with destructured props
      /(?:export\s+)?(?:const|let)\s+\w+(?:\s*:\s*React\.FC(?:<[^>]*>)?)?(?:\s*=\s*\(\{[^}]*\}\s*(?::\s*\w+)?\)\s*(?::\s*\w+)?\s*=>\s*\{)/,
      // Regular function declarations
      /(?:export\s+)?(?:export\s+default\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*\w+[^{]*)?\{/,
    ];

    let hookInserted = false;
    for (const pattern of componentPatterns) {
      const funcMatch = pattern.exec(content);
      if (funcMatch) {
        const insertAt = funcMatch.index + funcMatch[0].length;
        // Check if there's already a useTranslation call near here
        const nextChunk = content.slice(insertAt, insertAt + 200);
        if (!nextChunk.includes('useTranslation')) {
          content = content.slice(0, insertAt) +
            "\n  const { t } = useTranslation('admin');\n" +
            content.slice(insertAt);
          hookInserted = true;
        }
        break;
      }
    }

    // If we couldn't find a component pattern, try a simpler approach
    if (!hookInserted) {
      // Look for the first opening brace after an arrow function or function keyword
      const simplePatterns = [
        /=>\s*\{/,
        /function\s*\w*\s*\([^)]*\)\s*\{/,
      ];

      for (const pattern of simplePatterns) {
        const funcMatch = pattern.exec(content);
        if (funcMatch) {
          const insertAt = funcMatch.index + funcMatch[0].length;
          const nextChunk = content.slice(insertAt, insertAt + 300);
          if (!nextChunk.includes('useTranslation')) {
            content = content.slice(0, insertAt) +
              "\n  const { t } = useTranslation('admin');\n" +
              content.slice(insertAt);
          }
          break;
        }
      }
    }
  }

  // Step 3: Replace hardcoded strings in JSX
  // This is the most complex part - we need to find user-visible text in JSX

  // Pattern 1: Text content between JSX tags: >Text Here<
  // Match: >Some Text< (but not >{ or >{t( which are already translated)
  content = content.replace(/>([A-Z][^<>{}\n]*?)</g, (match, text) => {
    const trimmed = text.trim();
    if (!isUserVisibleText(trimmed)) return match;
    if (trimmed.length < 2) return match;
    // Skip if it's already a translation or expression
    if (text.includes('{') || text.includes('t(')) return match;
    // Skip dynamic content with template literals
    if (text.includes('$')) return match;
    // Skip if it starts with { (expression)
    if (text.startsWith('{')) return match;

    const key = toKey(prefix, trimmed);
    newKeys[key] = trimmed;
    keysAdded++;
    return `>{t('admin:${key}')}<`;
  });

  // Pattern 2: String props that are user-visible:
  // placeholder="Search..."
  content = content.replace(/placeholder="([^"]+)"/g, (match, text) => {
    if (!isUserVisibleText(text)) return match;
    if (text.includes('{') || text.includes('t(')) return match;
    const key = toKey(prefix, text.replace(/\.\.\.$/, ''));
    newKeys[key] = text;
    keysAdded++;
    return `placeholder={t('admin:${key}')}`;
  });

  // Pattern 3: title="..." attributes (tooltip text)
  content = content.replace(/title="([^"]+)"/g, (match, text) => {
    if (!isUserVisibleText(text)) return match;
    if (text.includes('{') || text.includes('t(')) return match;
    // Skip if it looks like a className or technical value
    if (/^[a-z]/.test(text) && !text.includes(' ')) return match;
    const key = toKey(prefix, text);
    newKeys[key] = text;
    keysAdded++;
    return `title={t('admin:${key}')}`;
  });

  // Pattern 4: aria-label="..." attributes
  content = content.replace(/aria-label="([^"]+)"/g, (match, text) => {
    if (!isUserVisibleText(text)) return match;
    if (text.includes('{') || text.includes('t(')) return match;
    const key = toKey(prefix, text);
    newKeys[key] = text;
    keysAdded++;
    return `aria-label={t('admin:${key}')}`;
  });

  // Pattern 5: Toast messages: toast.success("..."), toast.error("..."), toast.warning("..."), toast.info("...")
  content = content.replace(/toast\.(success|error|warning|info)\(\s*'([^']+)'\s*\)/g, (match, type, text) => {
    if (!isUserVisibleText(text)) return match;
    const key = toKey(prefix, text);
    newKeys[key] = text;
    keysAdded++;
    return `toast.${type}(t('admin:${key}'))`;
  });

  content = content.replace(/toast\.(success|error|warning|info)\(\s*"([^"]+)"\s*\)/g, (match, type, text) => {
    if (!isUserVisibleText(text)) return match;
    const key = toKey(prefix, text);
    newKeys[key] = text;
    keysAdded++;
    return `toast.${type}(t('admin:${key}'))`;
  });

  // Pattern 6: Toast with template literal - skip these (too complex)
  // Pattern 7: Text in JSX that starts with lowercase after >
  content = content.replace(/>([a-z][^<>{}\n]*?)</g, (match, text) => {
    const trimmed = text.trim();
    if (!isUserVisibleText(trimmed)) return match;
    if (trimmed.length < 3) return match;
    if (text.includes('{') || text.includes('t(')) return match;
    if (text.includes('$')) return match;
    // Must have a space (real sentences) or be known words
    if (!trimmed.includes(' ') && trimmed.length < 10) return match;

    const key = toKey(prefix, trimmed);
    newKeys[key] = trimmed;
    keysAdded++;
    return `>{t('admin:${key}')}<`;
  });

  const changed = content !== originalContent;

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { changed, keysAdded };
}

// Walk directory recursively to find all .tsx files
function walkDir(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Main
const files = walkDir(ADMIN_DIR).sort();
console.log(`Found ${files.length} .tsx files in admin directory\n`);

let totalChanged = 0;
let totalKeys = 0;

for (const file of files) {
  try {
    const { changed, keysAdded } = processFile(file);
    if (changed) {
      totalChanged++;
      const rel = path.relative(ADMIN_DIR, file);
      console.log(`  [UPDATED] ${rel} (+${keysAdded} keys)`);
    }
    totalKeys += keysAdded;
  } catch (err) {
    const rel = path.relative(ADMIN_DIR, file);
    console.error(`  [ERROR] ${rel}: ${err.message}`);
  }
}

console.log(`\n--- Summary ---`);
console.log(`Files processed: ${files.length}`);
console.log(`Files modified: ${totalChanged}`);
console.log(`New translation keys: ${Object.keys(newKeys).length}`);

// Build nested key structure from flat keys
function buildNestedKeys(flatKeys) {
  const nested = {};
  for (const [flatKey, value] of Object.entries(flatKeys)) {
    const parts = flatKey.split('.');
    let current = nested;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return nested;
}

// Merge new keys into existing admin.json (deep merge)
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (!(key in result)) {
      result[key] = source[key];
    }
  }
  return result;
}

const nestedNewKeys = buildNestedKeys(newKeys);
const mergedAdmin = deepMerge(existingAdmin, nestedNewKeys);

// Write updated admin.json
fs.writeFileSync(ADMIN_JSON_PATH, JSON.stringify(mergedAdmin, null, 2) + '\n', 'utf-8');
console.log(`\nUpdated ${ADMIN_JSON_PATH}`);

// Also output the new keys for review
fs.writeFileSync(
  path.resolve('scripts/new-admin-keys.json'),
  JSON.stringify(nestedNewKeys, null, 2) + '\n',
  'utf-8'
);
console.log(`New keys written to scripts/new-admin-keys.json`);
