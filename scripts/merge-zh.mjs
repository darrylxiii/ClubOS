import fs from 'fs';
import path from 'path';

const base = decodeURIComponent(new URL('../src/i18n/locales', import.meta.url).pathname);
const ns = process.argv[2] || 'admin';

// Deep merge: keeps zh values, adds missing keys from en
function deepMerge(en, zh) {
  const result = { ...zh };
  for (const key of Object.keys(en)) {
    if (!(key in result)) {
      // Key missing in ZH - add it with EN value as placeholder
      result[key] = en[key];
    } else if (
      typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key]) &&
      typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
    ) {
      // Both are objects - recurse
      result[key] = deepMerge(en[key], result[key]);
    }
    // else: key exists in ZH, keep ZH value
  }
  return result;
}

const enData = JSON.parse(fs.readFileSync(path.join(base, 'en', `${ns}.json`), 'utf8'));
const zhData = JSON.parse(fs.readFileSync(path.join(base, 'zh', `${ns}.json`), 'utf8'));

const merged = deepMerge(enData, zhData);

// Output merged JSON
const output = JSON.stringify(merged, null, 2);
fs.writeFileSync(path.join(base, 'zh', `${ns}.json`), output + '\n', 'utf8');

// Count what was added
function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(flattenKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const zhKeys = new Set(flattenKeys(zhData));
const mergedKeys = flattenKeys(merged);
const added = mergedKeys.filter(k => !zhKeys.has(k));
console.log(`${ns}: merged ${added.length} new keys (EN placeholders). Total keys: ${mergedKeys.length}`);
