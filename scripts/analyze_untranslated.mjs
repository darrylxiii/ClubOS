import { readFileSync } from 'fs';
import { resolve } from 'path';

const LOCALES = resolve(import.meta.dirname, '../src/i18n/locales');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

const en = JSON.parse(readFileSync(`${LOCALES}/en/common.json`, 'utf-8'));
const nl = JSON.parse(readFileSync(`${LOCALES}/nl/common.json`, 'utf-8'));

const enFlat = flatten(en);
const nlFlat = flatten(nl);

let same = 0, diff = 0, missing = 0;
const sameBySection = {};

for (const [key, enVal] of Object.entries(enFlat)) {
  if (!(key in nlFlat)) { missing++; continue; }
  if (typeof enVal !== 'string') continue;
  if (enVal === nlFlat[key]) {
    same++;
    if (enVal.length > 3 && !/^[\d\s.,;:!?%$€£¥#+\-\/=@()\[\]{}|\\<>]+$/.test(enVal) && !/^(https?:|mailto:|tel:)/.test(enVal)) {
      const section = key.split('.')[0];
      if (!sameBySection[section]) sameBySection[section] = [];
      sameBySection[section].push({ key, value: enVal });
    }
  } else {
    diff++;
  }
}

console.log('Same value (potentially untranslated):', same);
console.log('Different value (translated):', diff);
console.log('Missing from NL:', missing);
console.log('');
console.log('Untranslated by section:');
const sorted = Object.entries(sameBySection).sort((a, b) => b[1].length - a[1].length);
sorted.forEach(([section, items]) => {
  console.log(`  ${section}: ${items.length} untranslated`);
});
console.log('');
console.log('Top 30 examples:');
sorted.slice(0, 5).forEach(([section, items]) => {
  items.slice(0, 6).forEach(({key, value}) => {
    console.log(`  ${key} = "${value.substring(0, 80)}"`);
  });
});
