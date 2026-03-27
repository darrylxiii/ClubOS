#!/usr/bin/env node
/**
 * Script to add useTranslation import + hook to React components that lack it.
 * Handles adding the import line and inserting the hook call.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

// Config: directory -> namespace
const DIRECTORIES = {
  'src/components/jobs': 'jobs',
  'src/components/job-dashboard': 'jobs',
  'src/components/candidate-onboarding': 'candidates',
  'src/components/candidate-profile': 'candidates',
  'src/components/candidate': 'candidates',
  'src/components/crm': 'common',
};

function getAllTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip __tests__ directories
      if (entry.name === '__tests__') continue;
      results.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
      results.push(fullPath);
    }
  }
  return results;
}

function hasUserVisibleStrings(content) {
  // Check if file has JSX with hardcoded English text
  // Skip files that are purely structural (lazy wrappers, no text)
  const lines = content.split('\n');
  for (const line of lines) {
    // Skip comments, imports, types
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ') || trimmed.startsWith('export type') || trimmed.startsWith('export interface')) continue;
    // Look for hardcoded strings in JSX
    if (/>[\s]*[A-Z][a-zA-Z\s]+[\s]*</.test(line)) return true;
    if (/["'][A-Z][a-zA-Z\s]{3,}["']/.test(line) && !line.includes('className') && !line.includes('variant') && !line.includes('import')) return true;
  }
  return false;
}

let modified = 0;
let skipped = 0;

for (const [dirRel, ns] of Object.entries(DIRECTORIES)) {
  const dirAbs = path.join(ROOT, dirRel);
  const files = getAllTsxFiles(dirAbs);

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');

    // Already has useTranslation
    if (content.includes('useTranslation')) {
      skipped++;
      continue;
    }

    // Skip files with no meaningful user-visible strings
    if (!hasUserVisibleStrings(content)) {
      skipped++;
      continue;
    }

    // Add import
    // Find the right place - after the last import from react or before the first non-react import
    const importLine = `import { useTranslation } from 'react-i18next';`;

    // Find the last import line
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') || (lines[i].trim().startsWith('} from') && lastImportIndex >= 0)) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex === -1) {
      // No imports found, add at top
      content = importLine + '\n' + content;
    } else {
      // Insert after last import
      lines.splice(lastImportIndex + 1, 0, importLine);
      content = lines.join('\n');
    }

    // Now add the hook call - find the first function component body
    // Look for patterns like: "export function X(" or "export const X = memo((" or "export const X = ({"
    // Then find the first { after the return type and add the hook

    // Strategy: find "}) => {" or ") {" patterns that start a component body, then add hook after the first line
    const hookLine = `  const { t } = useTranslation('${ns}');`;

    // Try to find the component function opening
    const componentPatterns = [
      // export function Foo({ ... }: FooProps) {
      /^(export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{)/m,
      // export const Foo = memo(({ ... }: FooProps) => {
      /(\)\s*=>\s*\{)/m,
      // export const Foo = ({ ... }: FooProps) => {
      /(\}\s*:\s*\w+\)\s*=>\s*\{)/m,
      // }: FooProps) => {
      /(:\s*\w+Props\)\s*=>\s*\{)/m,
      // Simple arrow: ) => {
      /(=>\s*\{)/m,
    ];

    let hookAdded = false;
    const contentLines = content.split('\n');

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      // Look for the main component export function opening
      if ((line.includes('export function') || line.includes('export const') || line.includes('export default function'))
          && !line.includes('interface') && !line.includes('type ')) {
        // Find the opening brace of the function body
        let braceIndex = i;
        while (braceIndex < contentLines.length && !contentLines[braceIndex].trimEnd().endsWith('{')) {
          braceIndex++;
        }
        if (braceIndex < contentLines.length) {
          // Check if next line already has useTranslation
          if (braceIndex + 1 < contentLines.length && contentLines[braceIndex + 1].includes('useTranslation')) {
            hookAdded = true;
            break;
          }
          contentLines.splice(braceIndex + 1, 0, hookLine);
          hookAdded = true;
          break;
        }
      }
    }

    if (hookAdded) {
      content = contentLines.join('\n');
    }

    fs.writeFileSync(file, content, 'utf-8');
    modified++;
    console.log(`[${ns}] Modified: ${path.relative(ROOT, file)}`);
  }
}

console.log(`\nDone! Modified: ${modified}, Skipped: ${skipped}`);
