#!/usr/bin/env node
/**
 * Script to replace common hardcoded English strings with t() calls
 * in files that already have useTranslation set up.
 *
 * This handles the most common patterns across all target directories.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

// Files modified by the import script that need string replacement
const DIRECTORIES = [
  'src/components/jobs',
  'src/components/job-dashboard',
  'src/components/candidate-onboarding',
  'src/components/candidate-profile',
  'src/components/candidate',
  'src/components/crm',
];

function getAllTsxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      results.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
      results.push(fullPath);
    }
  }
  return results;
}

function getNamespace(filePath) {
  if (filePath.includes('/jobs/') || filePath.includes('/job-dashboard/')) return 'jobs';
  if (filePath.includes('/candidate')) return 'candidates';
  if (filePath.includes('/crm/')) return 'common';
  return 'common';
}

// Common string replacements - pattern -> { key, ns (optional) }
// These are exact JSX text replacements
const JSX_REPLACEMENTS = [
  // Common buttons/labels
  { from: '>Cancel</Button>', to: (ns) => `>{t('common:cancel', 'Cancel')}</Button>` },
  { from: '>Cancel</button>', to: (ns) => `>{t('common:cancel', 'Cancel')}</button>` },
  { from: '>Confirm</AlertDialogAction>', to: (ns) => `>{t('common:confirm', 'Confirm')}</AlertDialogAction>` },
  { from: '>Loading...</', to: (ns) => `>{t('common:loading', 'Loading...')}</` },
  { from: '>Loading history...</', to: (ns) => `>{t('common:loadingHistory', 'Loading history...')}</` },
  { from: '>Dismiss</Button>', to: (ns) => `>{t('common:dismiss', 'Dismiss')}</Button>` },
  { from: '>Dismiss</button>', to: (ns) => `>{t('common:dismiss', 'Dismiss')}</button>` },
  { from: '>Save</Button>', to: (ns) => `>{t('common:save', 'Save')}</Button>` },
  { from: '>Delete</Button>', to: (ns) => `>{t('common:delete', 'Delete')}</Button>` },
  { from: '>Submit</Button>', to: (ns) => `>{t('common:submit', 'Submit')}</Button>` },
  { from: '>Close</Button>', to: (ns) => `>{t('common:close', 'Close')}</Button>` },
  { from: '>Clear All</Button>', to: (ns) => `>{t('common:clearAll', 'Clear All')}</Button>` },
  { from: '>Clear</Button>', to: (ns) => `>{t('common:clear', 'Clear')}</Button>` },
  { from: `>Re-process</`, to: (ns) => `>{t('common:reprocess', 'Re-process')}</` },
  { from: '>View All <', to: (ns) => `>{t('common:viewAll', 'View All')} <` },
  { from: '>View all<', to: (ns) => `>{t('common:viewAll', 'View all')}<` },
  // Add Location button
  { from: '>Add Location</Button>', to: (ns) => `>{t('${ns === 'jobs' ? 'jobs' : 'common'}:addLocation', 'Add Location')}</Button>` },
];

let totalReplacements = 0;

for (const dirRel of DIRECTORIES) {
  const dirAbs = path.join(ROOT, dirRel);
  const files = getAllTsxFiles(dirAbs);

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');

    // Only process files that have useTranslation
    if (!content.includes('useTranslation')) continue;

    const ns = getNamespace(file);
    let fileReplacements = 0;

    for (const rep of JSX_REPLACEMENTS) {
      if (content.includes(rep.from)) {
        content = content.replace(new RegExp(escapeRegExp(rep.from), 'g'), rep.to(ns));
        fileReplacements++;
      }
    }

    if (fileReplacements > 0) {
      fs.writeFileSync(file, content, 'utf-8');
      totalReplacements += fileReplacements;
      console.log(`[${ns}] ${fileReplacements} replacements in: ${path.relative(ROOT, file)}`);
    }
  }
}

console.log(`\nDone! Total replacements: ${totalReplacements}`);

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
