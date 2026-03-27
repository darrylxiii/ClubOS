import { readFileSync } from 'fs';
import { join } from 'path';

const base = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/src/i18n/locales';
const ns = process.argv[2];

const en = JSON.parse(readFileSync(join(base, 'en', `${ns}.json`), 'utf8'));
const es = JSON.parse(readFileSync(join(base, 'es', `${ns}.json`), 'utf8'));

function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const enKeys = new Set(flattenKeys(en));
const esKeys = new Set(flattenKeys(es));

const missing = [...enKeys].filter(k => !esKeys.has(k));
console.log(JSON.stringify({
  namespace: ns,
  enKeyCount: enKeys.size,
  esKeyCount: esKeys.size,
  missingCount: missing.length,
  missingKeys: missing
}, null, 2));
