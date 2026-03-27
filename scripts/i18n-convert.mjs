#!/usr/bin/env node
/**
 * Bulk i18n conversion script for React components.
 * Adds useTranslation import and const { t } = useTranslation() to components
 * that don't already have them.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const BASE = '/Users/darryl/CLUB OS 2026 /thequantumclub-87fd343d/src/components';

const DIRS = [
  'academy',
  'incubator',
  'interview',
  'assessments',
  'achievements',
  'blog',
  'social',
];

// Skip files that are pure types, utilities, or have no UI strings
const SKIP_FILES = new Set([
  'BlogSchema.tsx',       // SEO meta tags, no visible UI strings
  'BlogCardSkeleton.tsx', // No visible UI text
  'ReadingProgress.tsx',  // No text
  'FloatingShareBar.tsx', // No text (delegates to SocialShareButtons)
  'SnippetOptimizedList.tsx', // Dynamic content only
  'AcademySidebar.tsx',   // Container only
  'AverageRatingDisplay.tsx', // Numbers only
  'CourseProgressRing.tsx',   // No text
  'IncubatorTimer.tsx',       // Dynamic labels only
]);

let processed = 0;
let skipped = 0;
let alreadyDone = 0;

for (const dir of DIRS) {
  const dirPath = join(BASE, dir);
  let files;
  try {
    files = readdirSync(dirPath).filter(f => f.endsWith('.tsx'));
  } catch (e) {
    console.log(`Skipping ${dir}: ${e.message}`);
    continue;
  }

  for (const file of files) {
    if (SKIP_FILES.has(file)) {
      skipped++;
      continue;
    }

    const filePath = join(dirPath, file);
    let content = readFileSync(filePath, 'utf-8');

    // Already has useTranslation import
    if (content.includes("useTranslation")) {
      alreadyDone++;
      continue;
    }

    // Check if it's a class component (BlogErrorBoundary)
    if (content.includes('extends Component')) {
      // Skip class components - they need different treatment
      skipped++;
      continue;
    }

    // Add import
    // Find the first import line
    const importRegex = /^import\s/m;
    const match = content.match(importRegex);
    if (match && match.index !== undefined) {
      content = content.slice(0, match.index) +
        "import { useTranslation } from 'react-i18next';\n" +
        content.slice(match.index);
    }

    // Add const { t } = useTranslation() after the component function declaration
    // Look for patterns like:
    // export const X = memo(({ ... }) => {
    // export const X = ({ ... }) => {
    // const X: React.FC = ({ ... }) => {
    // export function X({ ... }) {

    // Strategy: find the first useState, useEffect, useRef, or useAuth call,
    // and add the hook right before it. If none found, add after the opening of the component body.

    // Find where to add the hook - before the first hook call
    const hookPatterns = [
      /const \[.*?\] = useState/,
      /const .*? = useRef/,
      /const .*? = useEffect/,
      /const \{ user \} = useAuth/,
      /const \{ .*? \} = useAuth/,
      /const .*? = useNavigate/,
      /const .*? = useParams/,
      /const .*? = useLocation/,
      /const analytics = useAnalyticsData/,
    ];

    let inserted = false;

    for (const pattern of hookPatterns) {
      const hookMatch = content.match(pattern);
      if (hookMatch && hookMatch.index !== undefined) {
        // Find the beginning of this line
        const lineStart = content.lastIndexOf('\n', hookMatch.index) + 1;
        const indent = content.slice(lineStart, hookMatch.index);
        content = content.slice(0, lineStart) +
          indent + "const { t } = useTranslation();\n" +
          content.slice(lineStart);
        inserted = true;
        break;
      }
    }

    // If no hooks found, try to find after the arrow function opening
    if (!inserted) {
      // Look for => { pattern and add after it
      const arrowPatterns = [
        /=>\s*\{[\s]*\n/,
        /\)\s*=>\s*\{[\s]*\n/,
      ];
      for (const pattern of arrowPatterns) {
        const arrowMatch = content.match(pattern);
        if (arrowMatch && arrowMatch.index !== undefined) {
          const insertPos = arrowMatch.index + arrowMatch[0].length;
          content = content.slice(0, insertPos) +
            "  const { t } = useTranslation();\n" +
            content.slice(insertPos);
          inserted = true;
          break;
        }
      }
    }

    if (!inserted) {
      console.log(`WARNING: Could not find hook insertion point in ${file}`);
      skipped++;
      continue;
    }

    writeFileSync(filePath, content, 'utf-8');
    processed++;
    console.log(`Processed: ${dir}/${file}`);
  }
}

console.log(`\nDone! Processed: ${processed}, Already done: ${alreadyDone}, Skipped: ${skipped}`);
