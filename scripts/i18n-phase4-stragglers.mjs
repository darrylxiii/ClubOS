#!/usr/bin/env node
/**
 * Phase 4: Find all partner/ and clubhome/ .tsx files that still
 * lack useTranslation AND contain hardcoded English text.
 * Add the import + hook, then re-run string replacements.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';

const ROOT = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d';

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === '__tests__') continue;
      collectFiles(full, files);
    } else if (entry.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function hasHardcodedStrings(content) {
  return />\s*[A-Z][a-zA-Z\s]{3,}<\//.test(content) ||
         /title="[A-Z]/.test(content) ||
         /placeholder="[A-Z]/.test(content) ||
         /toast\.(error|success|warning|info)\("/.test(content) ||
         /description:\s*"[A-Z]/.test(content);
}

function addImportAndHook(filePath, namespace) {
  let content = readFileSync(filePath, 'utf-8');

  if (content.includes('useTranslation')) return false;
  if (!hasHardcodedStrings(content)) return false;

  const importStatement = `import { useTranslation } from 'react-i18next';`;
  const hookCall = `  const { t } = useTranslation('${namespace}');`;

  // Add import after last import
  const lastImportMatch = content.match(/^import\s.+$/gm);
  if (!lastImportMatch) return false;

  const lastImport = lastImportMatch[lastImportMatch.length - 1];
  const lastImportIdx = content.lastIndexOf(lastImport);
  const insertAfterImport = lastImportIdx + lastImport.length;

  // Handle multi-line imports - find the ; after lastImport position
  let semiIdx = content.indexOf(';', insertAfterImport);
  if (semiIdx === -1) semiIdx = insertAfterImport;

  content = content.substring(0, semiIdx + 1) + '\n' + importStatement + content.substring(semiIdx + 1);

  // Find component body and insert hook
  const componentPatterns = [
    // export const Foo = memo<...>(({ ... }) => {
    /export\s+(?:default\s+)?const\s+\w+\s*=\s*memo(?:<[^>]*>)?\(\s*\(\s*\{[^}]*\}[^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{/,
    // export const Foo = memo(({ ... }) => {
    /export\s+(?:default\s+)?const\s+\w+\s*=\s*memo\(\s*\(\s*\{[^}]*\}[^)]*\)\s*=>\s*\{/,
    // export const Foo = memo(() => {
    /export\s+(?:default\s+)?const\s+\w+\s*=\s*memo\(\s*\(\s*\)\s*=>\s*\{/,
    // export function Foo(...) {
    /export\s+(?:default\s+)?function\s+\w+[^{]*\{/,
    // export const Foo = ({ ... }) => {
    /export\s+const\s+\w+\s*=\s*\(\s*\{[^}]*\}[^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{/,
    // export const Foo = (...) => {
    /export\s+const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/,
    // const Foo = memo<...>(({ ... }) => { (non-exported, for later export default)
    /const\s+\w+\s*=\s*memo(?:<[^>]*>)?\(\s*\(\s*\{[^}]*\}[^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{/,
    // const Foo = memo(() => {
    /const\s+\w+\s*=\s*memo\(\s*\(\s*\)\s*=>\s*\{/,
  ];

  let bodyStart = -1;
  for (const pattern of componentPatterns) {
    const match = content.match(pattern);
    if (match) {
      bodyStart = match.index + match[0].length;
      break;
    }
  }

  if (bodyStart === -1) {
    console.warn(`  ! Could not find component body in ${relative(ROOT, filePath)}`);
    return false;
  }

  content = content.substring(0, bodyStart) + '\n' + hookCall + content.substring(bodyStart);

  writeFileSync(filePath, content, 'utf-8');
  return true;
}

// Process remaining partner files
console.log('=== Adding useTranslation to remaining PARTNER files ===');
const partnerFiles = collectFiles(join(ROOT, 'src/components/partner'));
let partnerAdded = 0;
for (const f of partnerFiles) {
  if (addImportAndHook(f, 'partner')) {
    console.log(`  + ${relative(ROOT, f)}`);
    partnerAdded++;
  }
}

// Process remaining clubhome files
console.log('\n=== Adding useTranslation to remaining CLUBHOME files ===');
const clubhomeFiles = collectFiles(join(ROOT, 'src/components/clubhome'));
let clubhomeAdded = 0;
for (const f of clubhomeFiles) {
  if (addImportAndHook(f, 'common')) {
    console.log(`  + ${relative(ROOT, f)}`);
    clubhomeAdded++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Partner: ${partnerAdded} files updated`);
console.log(`Clubhome: ${clubhomeAdded} files updated`);
console.log(`Total: ${partnerAdded + clubhomeAdded} files`);
