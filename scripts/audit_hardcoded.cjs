const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const files = execSync('find src/components src/pages -name "*.tsx" -type f', { cwd: root, encoding: 'utf-8' }).trim().split('\n');

let totalHardcoded = 0;
let fileResults = [];

files.forEach(file => {
  const content = fs.readFileSync(path.join(root, file), 'utf-8');
  const lines = content.split('\n');
  let hardcoded = 0;
  let examples = [];

  lines.forEach((line, idx) => {
    if (/^\s*(import|\/\/|\/\*|\*|export (type|interface)|console\.)/.test(line)) return;

    // Pattern 1: >Hardcoded Text</  (JSX text content)
    const jsxMatches = line.match(/>[A-Z][a-zA-Z\s&:,.'"()\-]{2,}<\//g);
    if (jsxMatches) {
      jsxMatches.forEach(m => {
        const text = m.replace(/^>/, '').replace(/<\/$/, '').trim();
        if (/^[A-Z][a-z]+$/.test(text)) return; // skip single capitalized words (component-like)
        hardcoded++;
        if (examples.length < 3) examples.push(`  L${idx+1}: "${text}"`);
      });
    }

    // Pattern 2: {'Hardcoded Text'} in JSX
    const curlyMatches = line.match(/\{'[A-Z][^']{3,}'\}/g);
    if (curlyMatches) {
      curlyMatches.forEach(m => {
        const text = m.replace(/^\{'/, '').replace(/'\}$/, '');
        if (text.includes('t(') || text.includes('className')) return;
        hardcoded++;
        if (examples.length < 3) examples.push(`  L${idx+1}: "${text}"`);
      });
    }
  });

  if (hardcoded > 0) {
    fileResults.push({ file: file, count: hardcoded, examples });
    totalHardcoded += hardcoded;
  }
});

fileResults.sort((a, b) => b.count - a.count);
console.log(`TOTAL HARDCODED ENGLISH STRINGS: ${totalHardcoded}`);
console.log(`Across ${fileResults.length} files\n`);
console.log('Top 40 worst offenders:');
fileResults.slice(0, 40).forEach(f => {
  console.log(`  ${String(f.count).padStart(4)} strings: ${f.file}`);
  f.examples.forEach(e => console.log(`        ${e}`));
});
