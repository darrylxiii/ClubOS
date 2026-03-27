/**
 * Script to add i18n translations to all meetings components.
 *
 * This script:
 * 1. Adds useTranslation import if not present
 * 2. Adds const { t } = useTranslation('meetings') if not present
 * 3. Collects all hardcoded strings for manual review
 */

import fs from 'fs';
import path from 'path';

const MEETINGS_DIR = path.resolve('src/components/meetings');
const JSON_PATH = path.resolve('src/i18n/locales/en/meetings.json');

// Read existing JSON
const existingJson = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

function getAllTsxFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

function hasUseTranslationImport(content) {
  return /import\s+\{[^}]*useTranslation[^}]*\}\s+from\s+['"]react-i18next['"]/.test(content);
}

function hasUseTranslationHook(content) {
  return /const\s+\{\s*t\s*\}\s*=\s*useTranslation/.test(content);
}

function addUseTranslationImport(content) {
  // Add after the last import from react or after the first import
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIndex = i;
      // Find the closing of multi-line imports
      if (!lines[i].includes(';') && !lines[i].includes("from")) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes(';') || lines[j].includes("from")) {
            lastImportIndex = j;
            break;
          }
        }
      }
    }
  }

  if (lastImportIndex === -1) return content;

  // Find first import line to add before it (after react imports)
  let insertAfter = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import .* from ['"]react['"]/)) {
      insertAfter = i;
      break;
    }
  }

  if (insertAfter === -1) {
    // Just add after line 0
    insertAfter = 0;
  }

  lines.splice(insertAfter + 1, 0, "import { useTranslation } from 'react-i18next';");
  return lines.join('\n');
}

function addUseTranslationHook(content) {
  // Find the component function and add the hook after the opening
  // Look for patterns like:
  // export function ComponentName(...) {
  // export default function ComponentName(...) {
  // export const ComponentName = (...) => {
  // function ComponentName(...) {

  // Strategy: find the first line with 'const [' or 'const {' or 'return (' after the function opening
  // and add the hook just before it

  const lines = content.split('\n');

  // Find function body start
  let funcBodyStart = -1;
  let braceDepth = 0;
  let inFunction = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function declaration for the main export
    if (line.match(/^export\s+(default\s+)?function\s+\w+/) ||
        line.match(/^export\s+const\s+\w+\s*=/) ||
        line.match(/^export\s+function\s+\w+/)) {
      inFunction = true;
    }

    if (inFunction) {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      if (braceDepth > 0 && funcBodyStart === -1) {
        funcBodyStart = i;
      }

      // Found the opening brace of the function
      if (funcBodyStart >= 0) {
        // Look for the next line that has code (not empty, not comment)
        for (let j = funcBodyStart + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('//') && !nextLine.startsWith('/*')) {
            // Insert hook before this line
            const indent = lines[j].match(/^(\s*)/)?.[1] || '  ';
            lines.splice(j, 0, `${indent}const { t } = useTranslation('meetings');`);
            return lines.join('\n');
          }
        }
      }
    }
  }

  return content;
}

const files = getAllTsxFiles(MEETINGS_DIR);
let filesModified = 0;
let filesAlreadyDone = 0;
let filesNeedingHook = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const basename = path.basename(file);
  let modified = false;

  // Step 1: Add import if not present
  if (!hasUseTranslationImport(content)) {
    content = addUseTranslationImport(content);
    modified = true;
    console.log(`[IMPORT] Added useTranslation import to ${basename}`);
  }

  // Step 2: Add hook if not present
  if (!hasUseTranslationHook(content)) {
    content = addUseTranslationHook(content);
    modified = true;
    filesNeedingHook++;
    console.log(`[HOOK] Added useTranslation hook to ${basename}`);
  } else {
    filesAlreadyDone++;
  }

  if (modified) {
    fs.writeFileSync(file, content);
    filesModified++;
  }
}

console.log(`\n--- Summary ---`);
console.log(`Total files: ${files.length}`);
console.log(`Files modified: ${filesModified}`);
console.log(`Files already had hook: ${filesAlreadyDone}`);
console.log(`Files needing hook added: ${filesNeedingHook}`);
