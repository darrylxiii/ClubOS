import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baseDir = join(__dirname, '..');

const ns = process.argv[2];
const translationsFile = process.argv[3];

const ru = JSON.parse(readFileSync(join(baseDir, `src/i18n/locales/ru/${ns}.json`), 'utf8'));
const translations = JSON.parse(readFileSync(translationsFile, 'utf8'));

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const merged = deepMerge(ru, translations);
writeFileSync(join(baseDir, `src/i18n/locales/ru/${ns}.json`), JSON.stringify(merged, null, 2) + '\n');
console.log(`Merged translations into ru/${ns}.json`);
