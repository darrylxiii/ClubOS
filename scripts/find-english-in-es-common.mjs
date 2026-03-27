import { readFileSync } from 'fs';

const es = JSON.parse(readFileSync('src/i18n/locales/es/common.json', 'utf8'));
const en = JSON.parse(readFileSync('src/i18n/locales/en/common.json', 'utf8'));

function findEnglishLeaves(obj, path = '') {
  const results = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? path + '.' + key : key;
    if (typeof value === 'object' && value !== null) {
      results.push(...findEnglishLeaves(value, fullPath));
    } else if (typeof value === 'string') {
      if (/\b(Failed|Please|Upload|Select a|Search |Enter |Click|Loading|has been|will be|You don|This will|are not|No .+ yet|Could not|Unable to|Something went|successfully)\b/i.test(value)
          && !/^\w+_\w+/.test(value)) {
        results.push({ path: fullPath, value });
      }
    }
  }
  return results;
}

// Also check missing top-level keys
const enKeys = Object.keys(en);
const esKeys = new Set(Object.keys(es));
const missing = enKeys.filter(k => !esKeys.has(k));

const english = findEnglishLeaves(es);
console.log('Lines with English:', english.length);
console.log('Missing top-level keys:', missing.length);
if (missing.length > 0) console.log('Missing:', missing.join(', '));
console.log('---');
english.forEach(e => {
  console.log(`${e.path} => ${e.value.substring(0, 120)}`);
});
