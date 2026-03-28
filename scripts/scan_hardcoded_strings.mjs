#!/usr/bin/env node
/**
 * Hardcoded String Scanner
 * Finds strings in TSX/TS files that should be using i18n t() function
 * Detects: JSX text content, string literals in UI positions, etc.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, resolve, relative } from 'path';

const SRC_DIR = resolve(import.meta.dirname, '../src');
const OUTPUT = resolve(import.meta.dirname, '../hardcoded_strings_report.md');

// Patterns that indicate hardcoded user-facing strings
const HARDCODED_PATTERNS = [
  // JSX text: >Some text<
  { regex: />([A-Z][a-zA-Z\s]{3,50})</g, desc: 'JSX text content' },
  // String props that should be translated: title="..." placeholder="..." label="..."
  { regex: /(?:title|placeholder|label|description|alt|aria-label)="([A-Z][^"]{3,80})"/g, desc: 'String attribute' },
  // toast/notification messages 
  { regex: /(?:toast\.|showToast|notify|alert)\([^)]*["']([A-Z][^"']{5,100})["']/g, desc: 'Toast/notification' },
  // Error messages in throw/console
  { regex: /(?:throw new Error|console\.(?:error|warn))\(["']([A-Z][^"']{5,100})["']/g, desc: 'Error message' },
];

// Files/patterns to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /\.d\.ts$/,
  /\/test\//,
  /__tests__/,
  /\.stories\./,
];

// Known false positives (component names, imports, etc.)
const FALSE_POSITIVE_PATTERNS = [
  /^[A-Z][a-zA-Z]+$/, // Single PascalCase word = component name
  /^[A-Z_]+$/, // ALL_CAPS = constant
  /^https?:\/\//, // URLs
  /^[A-Z][a-z]+\.[A-Z]/, // Namespace references
  /className/, // CSS class references
  /^\s*\/\//, // Comments
  /^\s*\*/, // JSDoc
  /import /,
  /export /,
  /const |let |var /,
  /function /,
  /interface /,
  /type /,
];

function getAllFiles(dir, ext = ['.tsx', '.ts']) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (!entry.startsWith('.') && entry !== 'node_modules') {
          files.push(...getAllFiles(fullPath, ext));
        }
      } else if (ext.some(e => entry.endsWith(e))) {
        files.push(fullPath);
      }
    }
  } catch { /* skip */ }
  return files;
}

function shouldSkipFile(path) {
  return SKIP_PATTERNS.some(p => p.test(path));
}

function isFalsePositive(text) {
  return FALSE_POSITIVE_PATTERNS.some(p => p.test(text.trim()));
}

// Scan files
const files = getAllFiles(SRC_DIR).filter(f => !shouldSkipFile(f));
const findings = [];

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  
  // Check if file already uses useTranslation
  const usesI18n = content.includes('useTranslation') || content.includes("t('") || content.includes('t("') || content.includes('t(`');
  
  // Scan for JSX text content that's NOT using t()
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;
    // Skip import/export lines
    if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) continue;
    
    // Check for JSX text content: >Text here< (multi-word, starts with capital)
    const jsxTextRegex = />([A-Z][a-zA-Z\s,.'!?:&\-]{4,80})</g;
    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (!isFalsePositive(text) && !text.includes('{') && text.split(' ').length >= 2) {
        findings.push({
          file: relative(SRC_DIR, file),
          line: i + 1,
          text,
          type: 'JSX text content',
          usesI18n,
        });
      }
    }
    
    // Check string attributes
    const attrRegex = /(?:title|placeholder|label|description|alt|aria-label|helperText|errorMessage)=["']([A-Z][^"'{]+)["']/g;
    while ((match = attrRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (!isFalsePositive(text) && text.split(' ').length >= 2) {
        findings.push({
          file: relative(SRC_DIR, file),
          line: i + 1,
          text,
          type: 'String attribute',
          usesI18n,
        });
      }
    }
    
    // Check toast messages
    const toastRegex = /(?:toast|showToast|toastSuccess|toastError|sonner)\s*[\.(]\s*["'`]([A-Z][^"'`]{5,100})["'`]/g;
    while ((match = toastRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (!isFalsePositive(text)) {
        findings.push({
          file: relative(SRC_DIR, file),
          line: i + 1,
          text,
          type: 'Toast/notification',
          usesI18n,
        });
      }
    }
  }
}

// Generate report
let report = `# 🔍 Hardcoded String Scan Report\n`;
report += `**Generated**: ${new Date().toISOString()}\n\n`;
report += `## Summary\n\n`;
report += `| Metric | Count |\n`;
report += `|--------|-------|\n`;
report += `| Files scanned | ${files.length} |\n`;
report += `| Hardcoded strings found | ${findings.length} |\n`;
report += `| In files WITH i18n | ${findings.filter(f => f.usesI18n).length} |\n`;
report += `| In files WITHOUT i18n | ${findings.filter(f => !f.usesI18n).length} |\n\n`;

// Group by file
const byFile = {};
for (const f of findings) {
  if (!byFile[f.file]) byFile[f.file] = [];
  byFile[f.file].push(f);
}

const sortedFiles = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);

report += `## Files with Most Hardcoded Strings\n\n`;
report += `| File | Count | Has i18n? |\n`;
report += `|------|-------|-----------|\n`;
for (const [file, items] of sortedFiles.slice(0, 30)) {
  report += `| \`${file}\` | ${items.length} | ${items[0].usesI18n ? '✅' : '❌'} |\n`;
}

report += `\n## All Findings\n\n`;
for (const [file, items] of sortedFiles) {
  report += `### \`${file}\` (${items.length} strings)\n\n`;
  for (const item of items.slice(0, 20)) {
    report += `- **Line ${item.line}** [${item.type}]: \`${item.text.substring(0, 80)}\`\n`;
  }
  if (items.length > 20) {
    report += `- ... and ${items.length - 20} more\n`;
  }
  report += `\n`;
}

writeFileSync(OUTPUT, report);
console.log(`\n📝 Report written to: hardcoded_strings_report.md`);
console.log(`📊 Found ${findings.length} hardcoded strings across ${Object.keys(byFile).length} files`);
console.log(`   ${findings.filter(f => f.usesI18n).length} in files that already use i18n (easy fixes)`);
console.log(`   ${findings.filter(f => !f.usesI18n).length} in files without i18n (need hook setup)\n`);

// Also show top 15 offenders
console.log(`Top offenders:`);
sortedFiles.slice(0, 15).forEach(([file, items]) => {
  console.log(`  ${items.length.toString().padStart(3)} strings — ${file}`);
});
