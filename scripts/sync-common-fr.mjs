import { readFileSync, writeFileSync } from 'fs';

const en = JSON.parse(readFileSync('./src/i18n/locales/en/common.json', 'utf8'));
const fr = JSON.parse(readFileSync('./src/i18n/locales/fr/common.json', 'utf8'));

// Classify missing top-level keys
const real = [];
const junk = [];

for (const k of Object.keys(en)) {
  if (k in fr) continue;

  // Detect junk: SQL column names, query strings, special chars
  const isJunk = k.includes(',') || k.includes('(') || k.includes('!') ||
                 k === '' || k === '_' || k === '@' || k === '*' ||
                 k === 'id' || k === 'en-EU' || k === 'nl-NL';

  if (isJunk) {
    junk.push(k);
  } else if (typeof en[k] === 'string' && en[k] === k) {
    // Key equals value - likely a junk/passthrough key
    junk.push(k);
  } else {
    real.push(k);
  }
}

console.log('Real missing sections:', real.length);
console.log('Junk keys:', junk.length);
console.log('');

// Copy junk keys as-is (they're technical, keep them identical)
for (const k of junk) {
  fr[k] = en[k];
}

// Show real sections
real.forEach(k => {
  const v = en[k];
  if (typeof v === 'object' && v !== null) {
    console.log(`${k} (${Object.keys(v).length} keys)`);
  } else {
    console.log(`${k} = ${String(v).substring(0, 80)}`);
  }
});

// Also check for keys missing within existing sections
function findMissingWithin(enObj, frObj, prefix) {
  const missing = [];
  for (const key of Object.keys(enObj)) {
    if (!(key in frObj)) {
      missing.push({ path: prefix + key, value: enObj[key] });
    } else if (typeof enObj[key] === 'object' && enObj[key] !== null &&
               typeof frObj[key] === 'object' && frObj[key] !== null) {
      missing.push(...findMissingWithin(enObj[key], frObj[key], prefix + key + '.'));
    }
  }
  return missing;
}

const withinMissing = findMissingWithin(en, fr, '');
// Filter out those we already handle as top-level
const withinOnly = withinMissing.filter(m => {
  const topKey = m.path.split('.')[0];
  return topKey in fr && !(real.includes(topKey)) && !(junk.includes(topKey));
});

console.log('\nKeys missing within existing sections:', withinOnly.length);
withinOnly.forEach(m => {
  const val = typeof m.value === 'object' ? `{${Object.keys(m.value).length} keys}` : String(m.value).substring(0, 80);
  console.log(`  ${m.path} = ${val}`);
});

// Write updated FR file (only junk keys added so far, real sections still needed)
writeFileSync('./src/i18n/locales/fr/common.json', JSON.stringify(fr, null, 2) + '\n');
console.log('\nJunk keys copied. File saved.');

function countKeys(obj) {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      count += countKeys(obj[key]);
    } else {
      count++;
    }
  }
  return count;
}
console.log('EN keys:', countKeys(en));
console.log('FR keys:', countKeys(fr));
