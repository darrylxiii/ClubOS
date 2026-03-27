#!/usr/bin/env node
/**
 * Fix pre-existing bug: useTranslation hook placed inside function parameter destructuring.
 * Pattern to fix:
 *   export function Foo({
 *     const { t } = useTranslation('ns');  // <-- WRONG: inside params
 *     prop1,
 *     prop2,
 *   }: FooProps) {
 *
 * Fix to:
 *   export function Foo({
 *     prop1,
 *     prop2,
 *   }: FooProps) {
 *     const { t } = useTranslation('ns');  // <-- CORRECT: inside body
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d';

function collectTsxFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) collectTsxFiles(full, files);
      else if (entry.endsWith('.tsx')) files.push(full);
    } catch (e) {}
  }
  return files;
}

const files = collectTsxFiles(join(ROOT, 'src'));
let fixCount = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  const original = content;

  // Pattern: function/const component with destructured params that has useTranslation inside
  // We need to find cases where `const { t } = useTranslation(...)` appears between
  // an opening `({` and a closing `}: TypeName) {` or `}) => {`

  // Strategy: find all useTranslation lines and check if they're between ({ and }:
  const lines = content.split('\n');
  const hookLineIndices = [];

  for (let i = 0; i < lines.length; i++) {
    if (/^\s+const \{ t \} = useTranslation\(['"][^'"]+['"]\);?\s*$/.test(lines[i])) {
      // Check if this is inside a parameter destructuring block
      // Look backwards for an opening ({
      let inParams = false;
      let braceDepth = 0;

      for (let j = i - 1; j >= Math.max(0, i - 15); j--) {
        const line = lines[j].trim();
        // Count closing braces going backwards
        for (const ch of line) {
          if (ch === '}') braceDepth++;
          if (ch === '{') braceDepth--;
        }

        // If we find a function declaration with ({, we're in params
        if (/(?:function\s+\w+|const\s+\w+\s*[:=]|export\s+(?:default\s+)?(?:function|const))\s*.*\(\s*\{\s*$/.test(line) ||
            /^\s*\{\s*$/.test(line) && j > 0 && /\(\s*$/.test(lines[j-1].trim())) {
          // Check if the brace opened here hasn't been closed yet
          if (braceDepth <= 0) {
            inParams = true;
          }
          break;
        }

        // If we find a }: or }) which closes the params, we're not in params
        if (/^\}\s*:\s*\w/.test(line) || /^\}\s*\)\s*=>/.test(line) || /^\}\s*\)\s*\{/.test(line)) {
          break;
        }
      }

      if (inParams) {
        // Also verify: look forward for }: which closes params
        for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
          const line = lines[j].trim();
          if (/^\}\s*:\s*\w/.test(line) || /^\}[^{]*\)\s*(?:=>)?\s*\{/.test(line)) {
            inParams = true;
            break;
          }
          if (/^\}\s*$/.test(line)) {
            // Might be end of params
            if (j + 1 < lines.length && /^\s*\)\s*(?:=>)?\s*\{/.test(lines[j+1]) || /:\s*\w/.test(lines[j+1])) {
              inParams = true;
            }
            break;
          }
        }

        if (inParams) {
          hookLineIndices.push(i);
        }
      }
    }
  }

  if (hookLineIndices.length > 0) {
    // Remove hook lines from params and add them after the opening brace of the function body
    for (let idx = hookLineIndices.length - 1; idx >= 0; idx--) {
      const hookLineIdx = hookLineIndices[idx];
      const hookLine = lines[hookLineIdx].trim();

      // Remove the hook line
      lines.splice(hookLineIdx, 1);

      // Find the function body opening brace (}: Type) { or }) => {)
      for (let j = hookLineIdx; j < Math.min(lines.length, hookLineIdx + 20); j++) {
        if (/\)\s*(?:=>)?\s*\{\s*$/.test(lines[j]) || /\)\s*:\s*\w[^{]*\{\s*$/.test(lines[j])) {
          // Insert hook on the next line
          lines.splice(j + 1, 0, '  ' + hookLine);
          console.log(`  Fixed: ${relative(ROOT, file)} (line ${hookLineIdx + 1})`);
          fixCount++;
          break;
        }
      }
    }

    content = lines.join('\n');
    if (content !== original) {
      writeFileSync(file, content, 'utf-8');
    }
  }
}

// Also fix the special case: hook inside a non-component helper function
// getRoleLabel is a known case
const approvalFile = join(ROOT, 'src/components/admin/approval/ApprovalConfirmationStep.tsx');
let approvalContent = readFileSync(approvalFile, 'utf-8');
if (approvalContent.includes('const getRoleLabel = (role: string): string => {\n  const { t } = useTranslation')) {
  // Move the hook out of getRoleLabel - it's a non-component function
  // Best approach: remove hook from getRoleLabel, ensure component has it
  approvalContent = approvalContent.replace(
    'const getRoleLabel = (role: string): string => {\n  const { t } = useTranslation(\'admin\');\n',
    'const getRoleLabel = (role: string): string => {\n'
  );
  writeFileSync(approvalFile, approvalContent, 'utf-8');
  console.log(`  Fixed: ${relative(ROOT, approvalFile)} (removed hook from helper function)`);
  fixCount++;
}

console.log(`\nFixed ${fixCount} hook placement issues.`);
