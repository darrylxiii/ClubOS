import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EN = join(ROOT, 'src', 'i18n', 'locales', 'en');
const FR = join(ROOT, 'src', 'i18n', 'locales', 'fr');

const ns = ['common','admin','partner','meetings','settings','messages','analytics','candidates'];
ns.forEach(n => {
  const en = JSON.parse(readFileSync(join(EN, n+'.json'), 'utf-8'));
  const fr = JSON.parse(readFileSync(join(FR, n+'.json'), 'utf-8'));
  const u = [];
  function walk(e, f, x) {
    for (const k of Object.keys(e)) {
      const z = x ? x+'.'+k : k;
      if (typeof e[k] === 'object' && e[k] !== null) walk(e[k], f?.[k]||{}, z);
      else if (typeof e[k] === 'string' && f?.[k] === e[k]) u.push(e[k]);
    }
  }
  walk(en, fr, '');
  console.log(`${n}: ${u.length} untranslated`);
  u.slice(0, 40).forEach(v => console.log(`  ${JSON.stringify(v)}`));
  if (u.length > 40) console.log(`  ...+${u.length - 40}`);
});
