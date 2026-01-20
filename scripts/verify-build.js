#!/usr/bin/env node

/**
 * Post-build verification script
 * Ensures the production build is correctly configured and will not brick on external domains
 * 
 * CRITICAL: This prevents "Boot timeout" issues caused by stale/incorrect HTML
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
  
  // CRITICAL Check 2: Should NOT contain /src/main.tsx (development reference)
  // This is the #1 cause of "Script error" on external domains
  if (content.includes('/src/main.tsx')) {
    errors.push('❌ CRITICAL: dist/index.html contains "/src/main.tsx" - this is a DEV reference that WILL FAIL in production!');
    errors.push('   The build process should transform this to /assets/index-[hash].js');
    errors.push('   Check vite.config.ts and ensure the build completed successfully.');
  }
  
  // Check 3: Should contain /assets/ references (production bundles)
  if (!content.includes('/assets/')) {
    errors.push('❌ dist/index.html does not contain "/assets/" references - production bundles may be missing!');
  }
  
  // Check 4: Should NOT contain cdn.tailwindcss.com (development CDN)
  if (content.includes('cdn.tailwindcss.com')) {
    warnings.push('⚠️  dist/index.html contains Tailwind CDN - this should only be used in development.');
  }
  
  // Check 5: Should contain the boot detection script and BUILD_ID
  if (!content.includes('__APP_BOOTED__')) {
    warnings.push('⚠️  dist/index.html may be missing the boot detection script.');
  }
  
  // Check 6: Verify BUILD_ID is present (for cache invalidation)
  if (!content.includes('__BUILD_ID__')) {
    warnings.push('⚠️  dist/index.html missing __BUILD_ID__ - cache invalidation may not work.');
  }
  
  // Check 7: Verify build sentinel is present
  const sentinelMatch = content.match(/<!-- BUILD_SENTINEL: ([^ ]+) -->/);
  if (sentinelMatch) {
    console.log(`✅ Build sentinel found: ${sentinelMatch[1]}`);
  }
  
  console.log('📄 Checking dist/index.html content...');
  
  // Extract and display script references
  const scriptMatches = content.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || [];
  console.log(`   Found ${scriptMatches.length} script tag(s):`);
  scriptMatches.forEach(match => {
    const src = match.match(/src="([^"]+)"/)?.[1] || 'unknown';
    const isGood = src.startsWith('/assets/');
    const isBad = src.includes('/src/');
    if (isBad) {
      console.log(`   ❌ ${src} (DEVELOPMENT REFERENCE - WILL FAIL)`);
    } else if (isGood) {
      console.log(`   ✅ ${src}`);
    } else {
      console.log(`   ⚠️  ${src}`);
    }
  });
  
  // Check for module script pointing to hashed bundle
  const moduleScriptMatch = content.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
  if (moduleScriptMatch) {
    const moduleSrc = moduleScriptMatch[1];
    if (moduleSrc.includes('/src/')) {
      errors.push(`❌ CRITICAL: Module script points to "${moduleSrc}" - this is a development path!`);
    } else if (moduleSrc.startsWith('/assets/') && moduleSrc.includes('.js')) {
      console.log(`\n✅ Module entry point correctly transformed: ${moduleSrc}`);
    }
  }
}

// Check 8: Verify SW exists
const SW_PATH = path.join(DIST_DIR, 'sw.js');
if (!fs.existsSync(SW_PATH)) {
  warnings.push('⚠️  dist/sw.js not found - PWA may not work correctly.');
} else {
  console.log('\n✅ Service worker (sw.js) found');
}

// Check 9: Verify manifest exists
const MANIFEST_PATH = path.join(DIST_DIR, 'manifest.webmanifest');
if (!fs.existsSync(MANIFEST_PATH)) {
  warnings.push('⚠️  dist/manifest.webmanifest not found - PWA installation may not work.');
} else {
  console.log('✅ PWA manifest found');
}

// Check 10: Verify no forbidden files were included
const FORBIDDEN_IN_DIST = ['types.ts', '.env', 'config.toml'];
FORBIDDEN_IN_DIST.forEach(file => {
  if (fs.existsSync(path.join(DIST_DIR, file))) {
    warnings.push(`⚠️  ${file} found in dist/ - this should not be deployed.`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));

if (errors.length > 0) {
  console.log('\n🚨 ERRORS (build WILL FAIL in production):');
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
  console.error('\n💥 BUILD VERIFICATION FAILED - DO NOT DEPLOY THIS BUILD\n');
  process.exit(1);
}
