#!/usr/bin/env node
/**
 * i18n string replacement for partner/ and clubhome/ components.
 * Replaces hardcoded English strings with t() calls and collects new keys.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
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

let totalReplacements = 0;

function processFile(filePath, namespace) {
  let content = readFileSync(filePath, 'utf-8');
  if (!content.includes('useTranslation')) return 0;

  const orig = content;
  const comp = componentKey(filePath);
  let count = 0;

  // Helper to add key
  function addKey(key, value) {
    if (namespace === 'partner') setNested(partnerKeys, key, value);
    else setNested(commonKeys, key, value);
  }

  function tCall(key) {
    return `t('${key}')`;
  }

  // 1. CardTitle static text
  content = content.replace(
    /(<CardTitle[^>]*>)\s*([A-Z][A-Za-z\s&/\-]+[a-z])\s*(<\/CardTitle>)/g,
    (m, open, text, close) => {
      if (text.includes('{') || text.includes('`') || text.includes("t(")) return m;
      const t = text.trim();
      const k = `${comp}.title`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 2. DialogTitle static text
  content = content.replace(
    /(<DialogTitle[^>]*>)\s*([A-Z][A-Za-z\s&/\-]+[a-z])\s*(<\/DialogTitle>)/g,
    (m, open, text, close) => {
      if (text.includes('{') || text.includes("t(")) return m;
      const t = text.trim();
      const k = `${comp}.dialogTitle`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 3. SheetTitle static text
  content = content.replace(
    /(<SheetTitle[^>]*>)\s*([A-Z][A-Za-z\s&/\-]+[a-z])\s*(<\/SheetTitle>)/g,
    (m, open, text, close) => {
      if (text.includes('{') || text.includes("t(")) return m;
      const t = text.trim();
      const k = `${comp}.sheetTitle`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 4. h2/h3/h4 static heading text
  content = content.replace(
    /(<h[2-4][^>]*>)\s*([A-Z][A-Za-z\s&/\-]+[a-z])\s*(<\/h[2-4]>)/g,
    (m, open, text, close) => {
      if (text.includes('{') || text.includes("t(")) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 5. Toast messages: toast.type("static text")
  content = content.replace(
    /toast\.(success|error|warning|info)\("([^"]{3,})"\)/g,
    (m, type, text) => {
      if (text.includes("t(") || text.includes('{') || text.includes('$')) return m;
      const sk = stringToKey(text);
      const k = `${comp}.toast.${sk}`;
      addKey(k, text);
      count++;
      return `toast.${type}(${tCall(k)})`;
    }
  );

  // 6. Toast with description: toast.type("text", { description: "desc" })
  content = content.replace(
    /toast\.(success|error|warning|info)\("([^"]{3,})",\s*\{\s*description:\s*"([^"]+)"/g,
    (m, type, text, desc) => {
      if (text.includes("t(") || text.includes('{')) return m;
      const sk = stringToKey(text);
      const k = `${comp}.toast.${sk}`;
      const dk = `${comp}.toast.${sk}Desc`;
      addKey(k, text);
      addKey(dk, desc);
      count++;
      return `toast.${type}(${tCall(k)}, { description: ${tCall(dk)}`;
    }
  );

  // 7. Common button texts via > pattern
  const buttons = [
    ['Cancel', 'common:cancel'],
    ['Save', 'common:save'],
    ['Save Changes', 'common:saveChanges'],
    ['Delete', 'common:delete'],
    ['Close', 'common:close'],
    ['Submit', 'common:submit'],
    ['Loading...', 'common:loading'],
    ['Saving...', 'common:saving'],
    ['Submitting...', 'common:submitting'],
    ['Add', 'common:add'],
    ['Edit', 'common:edit'],
    ['Remove', 'common:remove'],
    ['Back', 'common:back'],
    ['Next', 'common:next'],
    ['Confirm', 'common:confirm'],
    ['Refresh', 'common:refresh'],
    ['Apply', 'common:apply'],
    ['Reset', 'common:reset'],
    ['Clear', 'common:clear'],
    ['Clear All', 'common:clearAll'],
    ['Filter', 'common:filter'],
    ['Filters', 'common:filters'],
    ['Export', 'common:export'],
    ['Download', 'common:download'],
    ['Upload', 'common:upload'],
    ['Send', 'common:send'],
    ['Search', 'common:search'],
    ['View All', 'common:viewAll'],
    ['View Details', 'common:viewDetails'],
    ['No results', 'common:noResults'],
    ['No data', 'common:noData'],
    ['No data available', 'common:noDataAvailable'],
    ['Actions', 'common:actions'],
    ['View', 'common:view'],
    ['Copy', 'common:copy'],
    ['Share', 'common:share'],
    ['Dismiss', 'common:dismiss'],
    ['Done', 'common:done'],
    ['Select', 'common:select'],
    ['Update', 'common:update'],
    ['Retry', 'common:retry'],
    ['Try Again', 'common:tryAgain'],
    ['Continue', 'common:continue'],
    ['Decline', 'common:decline'],
    ['Accept', 'common:accept'],
    ['Approve', 'common:approve'],
    ['Reject', 'common:reject'],
    ['Archive', 'common:archive'],
    ['Invite', 'common:invite'],
    ['Activate', 'common:activate'],
    ['Deactivate', 'common:deactivate'],
  ];

  for (const [text, key] of buttons) {
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match >Cancel< or > Cancel < but not >{...}Cancel
    const regex = new RegExp(`(>\\s*)${escaped}(\\s*<)`, 'g');
    const newContent = content.replace(regex, (m, pre, post) => {
      if (m.includes('{')) return m;
      count++;
      return `${pre}{t('${key}')}${post}`;
    });
    content = newContent;
  }

  // 8. Label with static text
  content = content.replace(
    /(<Label[^>]*>)\s*([A-Z][A-Za-z\s()/\-*]+)\s*(<\/Label>)/g,
    (m, open, text, close) => {
      if (text.includes('{') || text.includes("t(") || text.trim().length < 3) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.label.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 9. placeholder="Static text" (only if starts with uppercase)
  content = content.replace(
    /placeholder="([A-Z][^"]{3,})"/g,
    (m, text) => {
      if (text.includes('{') || text.includes("t(") || text.startsWith('http') || text.startsWith('+')) return m;
      const sk = stringToKey(text);
      const k = `${comp}.placeholder.${sk}`;
      addKey(k, text);
      count++;
      return `placeholder={${tCall(k)}}`;
    }
  );

  // 10. Badge static text
  content = content.replace(
    /(<Badge[^>]*>)\s*([A-Z][A-Za-z\s]+)\s*(<\/Badge>)/g,
    (m, open, text, close) => {
      if (text.includes('{') || text.includes("t(") || text.trim().length < 3) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.badge.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 11. DropdownMenuLabel static text
  content = content.replace(
    /(<DropdownMenuLabel[^>]*>)\s*([A-Z][A-Za-z\s&/\-]+[a-z])\s*(<\/DropdownMenuLabel>)/g,
    (m, open, text, close) => {
      if (text.includes('{') || text.includes("t(")) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.menu.${sk}`;
      addKey(k, t);
      count++;
      return `${open}{${tCall(k)}}${close}`;
    }
  );

  // 12. TabsTrigger static text
  content = content.replace(
    /(<TabsTrigger[^>]*>)\s*([A-Z][A-Za-z\s&]+)\s*(<\/TabsTrigger>)/g,
    (m, open, text, close) => {
      if (text.includes('{') || text.includes("t(") || text.includes('<')) return m;
      const t = text.trim();
      const sk = stringToKey(t);
      const k = `${comp}.tab.${sk}`;
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
