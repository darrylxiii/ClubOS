import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = join(__dirname, '..');

const ns = process.argv[2];

const en = JSON.parse(readFileSync(join(baseDir, `src/i18n/locales/en/${ns}.json`), 'utf8'));
const ru = JSON.parse(readFileSync(join(baseDir, `src/i18n/locales/ru/${ns}.json`), 'utf8'));

function getVal(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function flattenKeys(obj, prefix) {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys = keys.concat(flattenKeys(v, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

const enKeys = new Set(flattenKeys(en, ''));
const ruKeys = new Set(flattenKeys(ru, ''));
const missing = [...enKeys].filter(k => !ruKeys.has(k));

console.log(`${ns}: ${missing.length} missing keys`);
for (const key of missing) {
  const val = JSON.stringify(getVal(en, key));
  console.log(`  ${key} = ${val.length > 150 ? val.substring(0, 150) + '...' : val}`);
}
