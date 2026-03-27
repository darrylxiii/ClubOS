#!/usr/bin/env node
/**
 * Bulk i18n conversion script for partner/ and clubhome/ components.
 *
 * Phase 1: Add useTranslation import + hook to files that lack it
 * Phase 2: Replace common hardcoded strings with t() calls
 * Phase 3: Collect all new translation keys
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d';
const PARTNER_DIR = join(ROOT, 'src/components/partner');
const CLUBHOME_DIR = join(ROOT, 'src/components/clubhome');

// Collect all .tsx files recursively
function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // Skip __tests__ directories
      if (entry === '__tests__') continue;
      collectFiles(full, files);
    } else if (entry.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

const partnerFiles = collectFiles(PARTNER_DIR);
const clubhomeFiles = collectFiles(CLUBHOME_DIR);

console.log(`Found ${partnerFiles.length} partner files`);
console.log(`Found ${clubhomeFiles.length} clubhome files`);

let partnerConverted = 0;
let clubhomeConverted = 0;
let partnerAlreadyHad = 0;
let clubhomeAlreadyHad = 0;
let skippedNoComponent = 0;

// New keys to add to locale files
const newPartnerKeys = {};
const newCommonKeys = {};

/**
 * Check if file has a React component (function or const export)
 */
function hasComponent(content) {
  return /export\s+(default\s+)?function\s+\w+|export\s+const\s+\w+\s*=\s*(memo<|React\.memo\(|\(|function)/.test(content);
}

/**
 * Check if file has any user-visible hardcoded strings in JSX
 */
function hasHardcodedJSXStrings(content) {
  // Look for strings inside JSX tags (between > and <)
  return />[\s]*[A-Z][a-zA-Z\s]+[\s]*</.test(content) ||
         /title="[A-Z]/.test(content) ||
         /placeholder="[A-Z]/.test(content) ||
         /description="[A-Z]/.test(content) ||
         /toast\.(error|success|warning|info)\("/.test(content);
}

/**
 * Add useTranslation import and hook to a file
 */
function addI18nToFile(filePath, namespace) {
  let content = readFileSync(filePath, 'utf-8');

  // Already has useTranslation
  if (content.includes('useTranslation')) {
    return { changed: false, alreadyHad: true };
  }

  // Skip if no component
  if (!hasComponent(content)) {
    return { changed: false, noComponent: true };
  }

  // Skip if no user-visible strings at all
  if (!hasHardcodedJSXStrings(content)) {
    return { changed: false, noStrings: true };
  }

  const importStatement = `import { useTranslation } from 'react-i18next';`;

  // Add import after the last import statement
  const lastImportIndex = content.lastIndexOf('\nimport ');
  if (lastImportIndex === -1) {
    // No imports? Add at top
    content = importStatement + '\n' + content;
  } else {
    // Find end of last import line
    const endOfImportLine = content.indexOf('\n', lastImportIndex + 1);
    // But we might have a multi-line import, find the next line that starts with something other than import or whitespace within braces
    let insertPos = endOfImportLine;

    // Handle multi-line imports: find the semicolon after the last import
    const afterLastImport = content.substring(lastImportIndex);
    const semiMatch = afterLastImport.match(/;/);
    if (semiMatch) {
      insertPos = lastImportIndex + semiMatch.index + 1;
    }

    content = content.substring(0, insertPos) + '\n' + importStatement + content.substring(insertPos);
  }

  // Add hook call inside the component
  // Find the component function body opening
  const hookCall = `const { t } = useTranslation('${namespace}');`;

  // Strategy: find the first { after the export function/const declaration that opens the component body
  // Then add the hook after any existing hooks (useState, useEffect, useQuery, etc.)

  // Look for patterns like:
  // export const Foo = ({ ... }) => {
  // export function Foo({ ... }) {
  // export const Foo = memo<...>(({ ... }) => {
  const componentPatterns = [
    /export\s+(?:default\s+)?function\s+\w+[^{]*\{/,
    /export\s+const\s+\w+\s*=\s*(?:memo(?:<[^>]*>)?\()?\s*\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{/,
    /export\s+const\s+\w+\s*=\s*(?:memo(?:<[^>]*>)?\()?\s*function[^{]*\{/,
    /export\s+const\s+\w+\s*=\s*\(\s*\{[^}]*\}[^)]*\)\s*=>\s*\{/,
    /export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/,
  ];

  let componentBodyStart = -1;
  for (const pattern of componentPatterns) {
    const match = content.match(pattern);
    if (match) {
      componentBodyStart = match.index + match[0].length;
      break;
    }
  }

  if (componentBodyStart === -1) {
    // Try a simpler approach: find the function/arrow after export
    const simpleMatch = content.match(/(export\s+(?:default\s+)?(?:const\s+\w+\s*=\s*)?(?:memo(?:<[^>]*>)?\()?)[\s\S]*?\)\s*(?::\s*\w+)?\s*=>\s*\{|export\s+(?:default\s+)?function\s+\w+[\s\S]*?\)\s*\{/);
    if (simpleMatch) {
      componentBodyStart = simpleMatch.index + simpleMatch[0].length;
    }
  }

  if (componentBodyStart === -1) {
    console.warn(`  Could not find component body in ${relative(ROOT, filePath)}`);
    return { changed: false, parseError: true };
  }

  // Insert hook after opening brace
  content = content.substring(0, componentBodyStart) + '\n  ' + hookCall + content.substring(componentBodyStart);

  writeFileSync(filePath, content, 'utf-8');
  return { changed: true };
}

// Common string replacements for both partner and clubhome
const commonReplacements = [
  // Toast messages
  [/toast\.error\("Failed to load/g, 'toast.error(t(\'common:error.failedToLoad\','],
  [/toast\.success\("Saved successfully"\)/g, 'toast.success(t(\'common:savedSuccessfully\'))'],
  [/toast\.error\("Something went wrong"\)/g, 'toast.error(t(\'common:error.somethingWentWrong\'))'],
];

// Process partner files
console.log('\n--- Processing PARTNER files ---');
for (const file of partnerFiles) {
  const rel = relative(ROOT, file);
  const result = addI18nToFile(file, 'partner');

  if (result.changed) {
    partnerConverted++;
    console.log(`  + ${rel}`);
  } else if (result.alreadyHad) {
    partnerAlreadyHad++;
  } else if (result.noComponent) {
    skippedNoComponent++;
  } else if (result.noStrings) {
    // Still add import for consistency if it has any component
    // Actually skip - no visible strings means no need for i18n
  } else if (result.parseError) {
    console.log(`  ! PARSE ERROR: ${rel}`);
  }
}

// Process clubhome files
console.log('\n--- Processing CLUBHOME files ---');
for (const file of clubhomeFiles) {
  const rel = relative(ROOT, file);
  const result = addI18nToFile(file, 'common');

  if (result.changed) {
    clubhomeConverted++;
    console.log(`  + ${rel}`);
  } else if (result.alreadyHad) {
    clubhomeAlreadyHad++;
  } else if (result.noComponent) {
    skippedNoComponent++;
  } else if (result.parseError) {
    console.log(`  ! PARSE ERROR: ${rel}`);
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Partner: ${partnerConverted} converted, ${partnerAlreadyHad} already had i18n`);
console.log(`Clubhome: ${clubhomeConverted} converted, ${clubhomeAlreadyHad} already had i18n`);
console.log(`Skipped (no component): ${skippedNoComponent}`);
console.log(`Total files processed: ${partnerFiles.length + clubhomeFiles.length}`);
