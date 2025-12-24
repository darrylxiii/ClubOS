#!/usr/bin/env node

/**
 * Post-build verification script
 * Ensures the production build is correctly configured
 */

import fs from 'fs';
import path from 'path';

const DIST_DIR = 'dist';
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

console.log('🔍 Verifying production build...\n');

let errors = [];
let warnings = [];

// Check 1: dist/index.html exists
if (!fs.existsSync(INDEX_HTML)) {
  errors.push(`❌ ${INDEX_HTML} does not exist. Build may have failed.`);
} else {
  const content = fs.readFileSync(INDEX_HTML, 'utf-8');
  
  // Check 2: Should NOT contain /src/main.tsx (development reference)
  if (content.includes('/src/main.tsx')) {
    errors.push('❌ dist/index.html contains "/src/main.tsx" - this is a development reference that will NOT work in production!');
  }
  
  // Check 3: Should contain /assets/ references (production bundles)
  if (!content.includes('/assets/')) {
    errors.push('❌ dist/index.html does not contain "/assets/" references - production bundles may be missing!');
  }
  
  // Check 4: Should NOT contain cdn.tailwindcss.com (development CDN)
  if (content.includes('cdn.tailwindcss.com')) {
    warnings.push('⚠️  dist/index.html contains Tailwind CDN - this should only be used in development.');
  }
  
  // Check 5: Should contain the boot detection script
  if (!content.includes('__APP_BOOTED__')) {
    warnings.push('⚠️  dist/index.html may be missing the boot detection script.');
  }
  
  console.log('📄 Checking dist/index.html content...');
  
  // Extract and display script references
  const scriptMatches = content.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [];
  console.log(`   Found ${scriptMatches.length} script tag(s):`);
  scriptMatches.forEach(match => {
    const src = match.match(/src="([^"]+)"/)?.[1] || 'unknown';
    const isGood = src.startsWith('/assets/');
    console.log(`   ${isGood ? '✅' : '⚠️ '} ${src}`);
  });
}

// Check 6: Verify SW exists
const SW_PATH = path.join(DIST_DIR, 'sw.js');
if (!fs.existsSync(SW_PATH)) {
  warnings.push('⚠️  dist/sw.js not found - PWA may not work correctly.');
} else {
  console.log('\n✅ Service worker (sw.js) found');
}

// Check 7: Verify manifest exists
const MANIFEST_PATH = path.join(DIST_DIR, 'manifest.webmanifest');
if (!fs.existsSync(MANIFEST_PATH)) {
  warnings.push('⚠️  dist/manifest.webmanifest not found - PWA installation may not work.');
} else {
  console.log('✅ PWA manifest found');
}

// Summary
console.log('\n' + '='.repeat(50));

if (errors.length > 0) {
  console.log('\n🚨 ERRORS (build will likely fail in production):');
  errors.forEach(e => console.log(`   ${e}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ Build verification passed! Ready for deployment.');
} else if (errors.length === 0) {
  console.log('\n✅ Build verification passed with warnings.');
}

console.log('');

// Exit with error code if there are errors
if (errors.length > 0) {
  process.exit(1);
}
