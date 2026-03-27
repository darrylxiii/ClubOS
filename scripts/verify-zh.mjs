import fs from 'fs';

const base = decodeURIComponent(new URL('../src/i18n/locales', import.meta.url).pathname);
const namespaces = ['common','admin','analytics','auth','candidates','compliance','contracts','jobs','meetings','messages','onboarding','partner','settings'];

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

for (const ns of namespaces) {
  const en = JSON.parse(fs.readFileSync(`${base}/en/${ns}.json`, 'utf8'));
  const zh = JSON.parse(fs.readFileSync(`${base}/zh/${ns}.json`, 'utf8'));
  const enKeys = new Set(flattenKeys(en));
  const zhKeys = new Set(flattenKeys(zh));
  const missing = [...enKeys].filter(k => !zhKeys.has(k));
  console.log(`${ns}: EN=${enKeys.size} ZH=${zhKeys.size} missing=${missing.length}`);
}
