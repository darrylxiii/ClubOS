#!/usr/bin/env node
/**
 * Fix script: Remove useTranslation from non-component helper functions.
 *
 * Detects functions that are NOT React components (don't start with uppercase,
 * or are arrow functions assigned to lowercase variables defined outside components)
 * and removes the useTranslation hook from them.
 *
 * Also ensures the main component function in each file has useTranslation.
 */

import fs from 'fs';
import path from 'path';

const ADMIN_DIR = path.resolve('src/components/admin');

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

// Check if a function is a React component (PascalCase) or custom hook (use*)
function isComponentOrHook(funcName) {
  if (!funcName) return false;
  // PascalCase = React component
  if (/^[A-Z]/.test(funcName)) return true;
  // use* = custom React hook
  if (/^use[A-Z]/.test(funcName)) return true;
  return false;
}

let totalFixed = 0;

const files = walkDir(ADMIN_DIR).sort();

for (const filePath of files) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let modified = false;

  // Find all useTranslation lines and check their context
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("const { t } = useTranslation('admin');")) continue;

    // Look backwards to find the function/const declaration this belongs to
    let funcName = null;
    let isInsideComponent = false;
    let braceDepth = 0;

    // Count brace depth from the useTranslation line back to find the enclosing function
    for (let j = i - 1; j >= 0; j--) {
      const line = lines[j];
      // Count braces (simplified)
      for (const ch of line) {
        if (ch === '}') braceDepth++;
        if (ch === '{') braceDepth--;
      }

      // If braceDepth goes negative, we've found the function opening
      if (braceDepth < 0) {
        // Check what function this is
        const funcDecl = lines.slice(Math.max(0, j-1), j+1).join(' ');

        // Arrow function: const Name = ...
        const arrowMatch = funcDecl.match(/(?:export\s+)?const\s+(\w+)/);
        // Function declaration: function Name
        const funcMatch = funcDecl.match(/function\s+(\w+)/);

        funcName = arrowMatch?.[1] || funcMatch?.[1];
        break;
      }
    }

    if (funcName && !isComponentOrHook(funcName)) {
      // This is a non-component helper function - remove the useTranslation line
      const rel = path.relative(ADMIN_DIR, filePath);
      console.log(`  [FIX] ${rel}: Removing useTranslation from "${funcName}"`);

      // Remove the useTranslation line and the blank line after it
      if (i + 1 < lines.length && lines[i + 1].trim() === '') {
        lines.splice(i, 2);
      } else {
        lines.splice(i, 1);
      }
      modified = true;
      totalFixed++;
      i--; // Re-check this index
    }
  }

  if (modified) {
    content = lines.join('\n');

    // Now check if the main component function has useTranslation
    // Look for the main exported component
    const componentPatterns = [
      /(?:export\s+(?:default\s+)?)?(?:const|function)\s+([A-Z]\w+)/g,
    ];

    for (const pattern of componentPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const compName = match[1];
        // Find the opening brace of this component
        const startIdx = match.index + match[0].length;
        const braceIdx = content.indexOf('{', startIdx);
        if (braceIdx === -1) continue;

        // Check if useTranslation exists between the opening brace and the next 500 chars
        const afterBrace = content.slice(braceIdx, braceIdx + 500);
        if (!afterBrace.includes("useTranslation('admin')")) {
          // Check if this component uses t() anywhere
          // Find the matching closing brace
          let depth = 0;
          let endIdx = braceIdx;
          for (let k = braceIdx; k < content.length; k++) {
            if (content[k] === '{') depth++;
            if (content[k] === '}') depth--;
            if (depth === 0) { endIdx = k; break; }
          }
          const componentBody = content.slice(braceIdx, endIdx);
          if (componentBody.includes("t('admin:") || componentBody.includes('t("admin:')) {
            // Component uses t() but doesn't have useTranslation - add it
            const insertPos = braceIdx + 1;
            content = content.slice(0, insertPos) +
              "\n  const { t } = useTranslation('admin');" +
              content.slice(insertPos);
            console.log(`  [ADD] ${path.relative(ADMIN_DIR, filePath)}: Added useTranslation to "${compName}"`);
          }
        }
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

console.log(`\nFixed ${totalFixed} incorrect hook placements`);
