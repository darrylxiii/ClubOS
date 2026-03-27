import { readFileSync } from 'fs';

const en = JSON.parse(readFileSync('./src/i18n/locales/en/common.json', 'utf8'));
const fr = JSON.parse(readFileSync('./src/i18n/locales/fr/common.json', 'utf8'));

function findMissing(e, f, p) {
  const m = [];
  for (const k of Object.keys(e)) {
    if (!(k in f)) {
      m.push({ path: p + k, value: e[k] });
    } else if (typeof e[k] === 'object' && e[k] !== null && typeof f[k] === 'object' && f[k] !== null) {
      m.push(...findMissing(e[k], f[k], p + k + '.'));
    }
  }
  return m;
}

const missing = findMissing(en, fr, '');
missing.forEach(m => {
  const val = typeof m.value === 'object' ? JSON.stringify(m.value) : m.value;
  console.log(m.path + ' ||| ' + val);
});
