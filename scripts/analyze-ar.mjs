import { readFileSync } from 'fs';

const base = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/src/i18n/locales';
const en = JSON.parse(readFileSync(`${base}/en/common.json`, 'utf8'));
const ar = JSON.parse(readFileSync(`${base}/ar/common.json`, 'utf8'));

function findSame(enObj, arObj, prefix = '') {
  const results = [];
  for (const k in enObj) {
    const path = prefix ? prefix + '.' + k : k;
    if (typeof enObj[k] === 'object' && enObj[k] !== null) {
      if (typeof arObj[k] === 'object' && arObj[k] !== null) {
        results.push(...findSame(enObj[k], arObj[k], path));
      }
    } else if (arObj && arObj[k] === enObj[k]) {
      results.push({ path, val: enObj[k] });
    }
  }
  return results;
}

function findMissing(enObj, arObj, prefix = '') {
  const results = [];
  for (const k in enObj) {
    const path = prefix ? prefix + '.' + k : k;
    if (typeof enObj[k] === 'object' && enObj[k] !== null) {
      if (!arObj || !arObj[k]) {
        results.push({ path, val: '[SECTION MISSING]' });
      } else {
        results.push(...findMissing(enObj[k], arObj[k] || {}, path));
      }
    } else if (!arObj || arObj[k] === undefined) {
      results.push({ path, val: enObj[k] });
    }
  }
  return results;
}

const same = findSame(en, ar);
const missing = findMissing(en, ar);

console.log('=== SAMPLE UNTRANSLATED (first 150) ===');
same.slice(0, 150).forEach(s => console.log(s.path + ' => ' + JSON.stringify(s.val).substring(0, 120)));

console.log('\n=== SAMPLE MISSING (first 80) ===');
missing.slice(0, 80).forEach(s => console.log(s.path + ' => ' + JSON.stringify(s.val).substring(0, 120)));

// Collect unique EN values for dictionary
const enValues = new Set();
same.forEach(s => { if (typeof s.val === 'string') enValues.add(s.val); });
missing.forEach(s => { if (typeof s.val === 'string') enValues.add(s.val); });

console.log('\n=== UNIQUE UNTRANSLATED VALUES COUNT:', enValues.size);
const sorted = [...enValues].sort();
console.log('\n=== ALL UNIQUE VALUES (first 500) ===');
sorted.slice(0, 500).forEach(v => console.log(JSON.stringify(v).substring(0, 150)));
