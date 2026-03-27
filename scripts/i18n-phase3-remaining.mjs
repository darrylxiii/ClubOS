#!/usr/bin/env node
/**
 * Phase 3: Catch remaining hardcoded strings that Phase 2 missed.
 * Targets: <p>, <span>, <h1-h6>, <td>, <th>, <div> static text,
 * remaining toast messages, title/description attributes,
 * TooltipContent, AlertTitle, AlertDescription, CardDescription,
 * DialogDescription, aria-label, SelectItem static text, etc.
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

function componentKey(filePath) {
  let name = basename(filePath, '.tsx');
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function stringToKey(str) {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    .substring(0, 40);
}

const partnerKeys = {};
const commonKeys = {};
let totalReplacements = 0;

function setNested(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  if (!cur[parts[parts.length - 1]]) {
    cur[parts[parts.length - 1]] = value;
  }
}

function processFile(filePath, namespace) {
  let content = readFileSync(filePath, 'utf-8');
  if (!content.includes('useTranslation')) return 0;

  const orig = content;
  const comp = componentKey(filePath);
  let count = 0;

  function addKey(key, value) {
    if (namespace === 'partner') setNested(partnerKeys, key, value);
    else setNested(commonKeys, key, value);
  }

  function tCall(key) {
    return `t('${key}')`;
  }

  // Skip if text looks like it's already translated or dynamic
  function shouldSkip(text) {
    return text.includes('{') || text.includes('`') || text.includes("t(") ||
           text.includes('$') || text.includes('className') || text.includes('onClick') ||
           text.trim().length < 3 || text.includes('...') && text.trim() === '...';
  }

  // 1. <p> tag static text (capitalized English)
  content = content.replace(
    /(<p[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-()]+[a-z.!?)])\s*(<\/p>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      // Don't replace if it's just a CSS class reference or very short
      const t = text.trim();
      if (t.length < 4) return m;
      const sk = stringToKey(t);
      const k = `${comp}.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 2. <span> tag static text
  content = content.replace(
    /(<span[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-()]+[a-z.!?)])\s*(<\/span>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      if (t.length < 4) return m;
      // Don't match if it's part of a JSX expression
      if (open.includes('{')) return m;
      const sk = stringToKey(t);
      const k = `${comp}.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 3. <td> tag static text
  content = content.replace(
    /(<td[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-]+[a-z.!?])\s*(<\/td>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      if (t.length < 4) return m;
      const sk = stringToKey(t);
      const k = `${comp}.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 4. <th> tag static text
  content = content.replace(
    /(<th[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-]+[a-z.!?])\s*(<\/th>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      if (t.length < 4) return m;
      const sk = stringToKey(t);
      const k = `${comp}.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 5. CardDescription static text
  content = content.replace(
    /(<CardDescription[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-()]+[a-z.!?)])\s*(<\/CardDescription>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      const k = `${comp}.description`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 6. DialogDescription static text
  content = content.replace(
    /(<DialogDescription[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-()]+[a-z.!?)])\s*(<\/DialogDescription>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      const k = `${comp}.dialogDescription`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 7. AlertTitle static text
  content = content.replace(
    /(<AlertTitle[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-]+[a-z.!?])\s*(<\/AlertTitle>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.alert.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 8. AlertDescription static text
  content = content.replace(
    /(<AlertDescription[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-()]+[a-z.!?)])\s*(<\/AlertDescription>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.alert.${sk}Desc`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 9. TooltipContent static text
  content = content.replace(
    /(<TooltipContent[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-]+[a-z.!?])\s*(<\/TooltipContent>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.tooltip.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 10. DropdownMenuItem static text
  content = content.replace(
    /(<DropdownMenuItem[^>]*>)\s*([A-Z][A-Za-z\s&/\-]+[a-z])\s*(<\/DropdownMenuItem>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.menu.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 11. SelectItem static display text (after the value)
  // Pattern: <SelectItem value="...">Static Text</SelectItem>
  content = content.replace(
    /(<SelectItem[^>]*>)\s*([A-Z][A-Za-z\s&/\-+]+[a-z+])\s*(<\/SelectItem>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.option.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 12. Remaining toast.success/error with static strings
  content = content.replace(
    /toast\.(success|error|warning|info)\("([A-Z][^"]{3,})"\)/g,
    (m, type, text) => {
      if (shouldSkip(text)) return m;
      const sk = stringToKey(text);
      const k = `${comp}.toast.${sk}`;
      addKey(k, text);
      count++;
      return `toast.${type}(${tCall(k)})`;
    }
  );

  // 13. toast with description object
  content = content.replace(
    /toast\.(success|error|warning|info)\("([A-Z][^"]{3,})",\s*\{\s*description:\s*"([^"]+)"/g,
    (m, type, text, desc) => {
      if (shouldSkip(text)) return m;
      const sk = stringToKey(text);
      const k = `${comp}.toast.${sk}`;
      const dk = `${comp}.toast.${sk}Desc`;
      addKey(k, text);
      addKey(dk, desc);
      count++;
      return `toast.${type}(${tCall(k)}, { description: ${tCall(dk)}`;
    }
  );

  // 14. title="Static English" attributes
  content = content.replace(
    /title="([A-Z][^"]{3,})"/g,
    (m, text) => {
      if (shouldSkip(text) || text.startsWith('http') || text.includes('.')) return m;
      const sk = stringToKey(text);
      const k = `${comp}.title.${sk}`;
      addKey(k, text);
      count++;
      return `title={${tCall(k)}}`;
    }
  );

  // 15. description: "Static English" in object literals (for toast, etc.)
  // Only if not already handled above
  content = content.replace(
    /description:\s*"([A-Z][^"]{3,})"/g,
    (m, text) => {
      if (shouldSkip(text)) return m;
      const sk = stringToKey(text);
      const k = `${comp}.desc.${sk}`;
      addKey(k, text);
      count++;
      return `description: ${tCall(k)}`;
    }
  );

  // 16. Standalone text between JSX tags that starts with uppercase and is a full sentence/phrase
  // Target: >Some Static Text Here< patterns in div/section/article
  content = content.replace(
    /(<(?:div|section|article)[^>]*>)\s*([A-Z][A-Za-z\s,.!?'&/\-()]{5,}[a-z.!?)])\s*(<\/(?:div|section|article)>)/g,
    (m, open, text, close) => {
      if (shouldSkip(text)) return m;
      const t = text.trim();
      if (t.length < 6) return m;
      const sk = stringToKey(t);
      const k = `${comp}.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  if (content !== orig) {
    writeFileSync(filePath, content, 'utf-8');
    totalReplacements += count;
    return count;
  }
  return 0;
}

// Process partner files
console.log('=== Processing PARTNER files ===');
const partnerFiles = collectFiles(join(ROOT, 'src/components/partner'));
let partnerCount = 0;
for (const f of partnerFiles) {
  const c = processFile(f, 'partner');
  if (c > 0) {
    console.log(`  ${relative(ROOT, f)}: ${c} replacements`);
    partnerCount += c;
  }
}

// Process clubhome files
console.log('\n=== Processing CLUBHOME files ===');
const clubhomeFiles = collectFiles(join(ROOT, 'src/components/clubhome'));
let clubhomeCount = 0;
for (const f of clubhomeFiles) {
  const c = processFile(f, 'common');
  if (c > 0) {
    console.log(`  ${relative(ROOT, f)}: ${c} replacements`);
    clubhomeCount += c;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Partner: ${partnerCount} replacements`);
console.log(`Clubhome: ${clubhomeCount} replacements`);
console.log(`Total: ${totalReplacements}`);

// Deep merge helper
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (!(key in result)) {
      result[key] = source[key];
    }
  }
  return result;
}

function flattenObj(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(result, flattenObj(v, full));
    } else {
      result[full] = v;
    }
  }
  return result;
}

// Update partner.json
const PARTNER_JSON = join(ROOT, 'src/i18n/locales/en/partner.json');
try {
  const existing = JSON.parse(readFileSync(PARTNER_JSON, 'utf-8'));
  const merged = deepMerge(existing, partnerKeys);
  writeFileSync(PARTNER_JSON, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  const newKeyCount = Object.keys(flattenObj(partnerKeys)).length;
  console.log(`\nUpdated partner.json (+${newKeyCount} keys)`);
} catch (e) {
  console.error('Error updating partner.json:', e.message);
}

// Update common.json
const COMMON_JSON = join(ROOT, 'src/i18n/locales/en/common.json');
try {
  const existing = JSON.parse(readFileSync(COMMON_JSON, 'utf-8'));
  const merged = deepMerge(existing, commonKeys);
  writeFileSync(COMMON_JSON, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  const newKeyCount = Object.keys(flattenObj(commonKeys)).length;
  console.log(`Updated common.json (+${newKeyCount} keys)`);
} catch (e) {
  console.error('Error updating common.json:', e.message);
}
