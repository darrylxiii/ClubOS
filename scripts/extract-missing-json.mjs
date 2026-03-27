import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = join(__dirname, '..');

const ns = process.argv[2];
const outFile = process.argv[3] || join(__dirname, `${ns}_missing_en.json`);

const en = JSON.parse(readFileSync(join(baseDir, `src/i18n/locales/en/${ns}.json`), 'utf8'));
const ru = JSON.parse(readFileSync(join(baseDir, `src/i18n/locales/ru/${ns}.json`), 'utf8'));

function getVal(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    if (cur === undefined || cur === null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function buildMissing(enObj, ruObj, path) {
  const result = {};
  for (const [k, v] of Object.entries(enObj)) {
    const ruVal = ruObj ? ruObj[k] : undefined;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      const sub = buildMissing(v, typeof ruVal === 'object' ? ruVal : undefined, [...path, k]);
      if (Object.keys(sub).length > 0) {
        result[k] = sub;
      }
    } else {
      if (ruVal === undefined) {
        result[k] = v;
      }
    }
  }
  return result;
}

const missing = buildMissing(en, ru, []);
const count = JSON.stringify(missing).split('":').length - 1;
writeFileSync(outFile, JSON.stringify(missing, null, 2) + '\n');
console.log(`Extracted missing EN keys for ${ns} to ${outFile} (~${count} keys)`);
