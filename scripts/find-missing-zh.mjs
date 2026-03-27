import fs from 'fs';

const base = decodeURIComponent(new URL('../src/i18n/locales', import.meta.url).pathname);
const ns = process.argv[2] || 'meetings';

function flattenKeys(obj, prefix = '') {
  let result = {};
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(result, flattenKeys(obj[k], fullKey));
    } else {
      result[fullKey] = obj[k];
    }
  }
  return result;
}

const en = JSON.parse(fs.readFileSync(`${base}/en/${ns}.json`, 'utf8'));
const zh = JSON.parse(fs.readFileSync(`${base}/zh/${ns}.json`, 'utf8'));
const enFlat = flattenKeys(en);
const zhFlat = flattenKeys(zh);
const missing = Object.keys(enFlat).filter(k => !(k in zhFlat));

const groups = {};
for (const k of missing) {
  const top = k.split('.')[0];
  if (!groups[top]) groups[top] = [];
  groups[top].push({ key: k, val: enFlat[k] });
}

for (const [g, items] of Object.entries(groups)) {
  console.log(`--- ${g} (${items.length}) ---`);
  for (const { key, val } of items) {
    console.log(`${JSON.stringify(key)} => ${JSON.stringify(val)}`);
  }
}
