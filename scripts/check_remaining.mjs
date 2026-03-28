#!/usr/bin/env node
import { readFileSync } from 'fs';
const en = JSON.parse(readFileSync('src/i18n/locales/en/common.json','utf-8'));
const nl = JSON.parse(readFileSync('src/i18n/locales/nl/common.json','utf-8'));

const untranslated = [];
function find(enObj, nlObj, path) {
  for (const [k,v] of Object.entries(enObj)) {
    const p = path ? path+'.'+k : k;
    if (v && typeof v === 'object') {
      find(v, nlObj && nlObj[k] || {}, p);
    } else if (typeof v === 'string' && v.length > 3 && nlObj && nlObj[k] === v) {
      if (/^[a-z_]+(,\s*[a-z_!]+)+$/i.test(v)) continue;
      if (/^(https?:\/\/|mailto:|tel:)/.test(v)) continue;
      untranslated.push({key: p, val: v.substring(0,120)});
    }
  }
}
find(en, nl, '');

const sections = {};
untranslated.forEach(({key, val}) => {
  const sec = key.split('.')[0];
  if (!sections[sec]) sections[sec] = [];
  sections[sec].push({key, val});
});

const sorted = Object.entries(sections).sort((a,b) => b[1].length - a[1].length);
console.log('Total untranslated:', untranslated.length);
sorted.slice(0,15).forEach(([sec, items]) => {
  console.log('\n' + sec + ': ' + items.length + ' keys');
  items.slice(0,5).forEach(i => console.log('  ' + i.val.substring(0,100)));
});
