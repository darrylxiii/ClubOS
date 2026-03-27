import { readFileSync, readdirSync } from 'fs';

const enDir = './src/i18n/locales/en';
const frDir = './src/i18n/locales/fr';

function countKeys(obj) {
  let c = 0;
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) c += countKeys(obj[k]);
    else c++;
  }
  return c;
}

function findMissing(e, f, p) {
  const m = [];
  for (const k of Object.keys(e)) {
    if (!(k in f)) {
      m.push(p + k);
    } else if (typeof e[k] === 'object' && e[k] !== null && typeof f[k] === 'object' && f[k] !== null) {
      m.push(...findMissing(e[k], f[k], p + k + '.'));
    }
  }
  return m;
}

const enFiles = readdirSync(enDir).filter(f => f.endsWith('.json')).sort();

let totalMissing = 0;
for (const file of enFiles) {
  try {
    const en = JSON.parse(readFileSync(`${enDir}/${file}`, 'utf8'));
    const fr = JSON.parse(readFileSync(`${frDir}/${file}`, 'utf8'));
    const enCount = countKeys(en);
    const frCount = countKeys(fr);
    const missing = findMissing(en, fr, '');
    const status = missing.length === 0 ? 'COMPLETE' : `MISSING ${missing.length}`;
    console.log(`${file.padEnd(20)} EN: ${String(enCount).padStart(5)}  FR: ${String(frCount).padStart(5)}  ${status}`);
    totalMissing += missing.length;
  } catch (err) {
    console.log(`${file.padEnd(20)} ERROR: ${err.message}`);
  }
}

console.log('');
console.log(`Total missing keys across all namespaces: ${totalMissing}`);
