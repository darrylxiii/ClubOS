#!/usr/bin/env node
/**
 * Bulk i18n conversion script
 * Adds useTranslation import + hook to all TSX files that have user-visible text
 * but don't yet use useTranslation.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve('src/components');

// Get list of unconverted files (excluding ui/, tests)
const unconvertedFiles = execSync(
  `grep -rL "useTranslation" src/components/ --include="*.tsx" | grep -v __tests__ | grep -v .test. | grep -v .spec. | grep -v "src/components/ui/"`,
  { encoding: 'utf-8' }
).trim().split('\n').filter(Boolean);

console.log(`Found ${unconvertedFiles.length} unconverted files (excluding ui/)`);

// Determine namespace based on directory
function getNamespace(filePath) {
  if (filePath.includes('/admin/')) return 'admin';
  if (filePath.includes('/partner/') || filePath.includes('/partner-funnel/')) return 'partner';
  if (filePath.includes('/meetings/') || filePath.includes('/video-call/')) return 'meetings';
  if (filePath.includes('/jobs/')) return 'jobs';
  if (filePath.includes('/messages/')) return 'messages';
  if (filePath.includes('/candidates/') || filePath.includes('/candidate-profile/') || filePath.includes('/candidate/') || filePath.includes('/candidate-onboarding/')) return 'candidates';
  if (filePath.includes('/analytics/')) return 'analytics';
  if (filePath.includes('/settings/')) return 'settings';
  return 'common';
}

// Check if file has user-visible English text that needs translation
function hasUserVisibleText(content) {
  // Skip if it's a pure re-export or context provider with no JSX text
  const lines = content.split('\n');

  // Look for hardcoded English text patterns in JSX
  const patterns = [
    />\s*[A-Z][a-z]+\s+[a-z]/,           // >Word word (JSX text)
    />\s*[A-Z][a-z]{2,}[^<]*</,           // >SomeText<
    /title=["'][A-Z]/,                     // title="Something"
    /placeholder=["'][A-Z]/,               // placeholder="Something"
    /label=["'][A-Z]/,                     // label="Something"
    /aria-label=["'][A-Z]/,               // aria-label="Something"
    /toast\(\s*["'][A-Z]/,                 // toast("Something")
    /toast\.\w+\(\s*["'][A-Z]/,           // toast.success("Something")
    /toast\(\s*\{\s*title:\s*["'][A-Z]/,  // toast({ title: "Something" })
    /description:\s*["'][A-Z]/,            // description: "Something"
    />\s*No\s+\w+/,                        // >No items
    />\s*Loading/,                          // >Loading
    />\s*Error/,                            // >Error
    />\s*Search/,                           // >Search
    />\s*Cancel</,                          // >Cancel<
    />\s*Save</,                            // >Save<
    />\s*Delete</,                          // >Delete<
    />\s*Edit</,                            // >Edit<
    />\s*Create</,                          // >Create<
    />\s*Submit</,                          // >Submit<
    />\s*Send</,                            // >Send<
    />\s*Close</,                           // >Close<
    />\s*Add</,                             // >Add<
    />\s*Remove</,                          // >Remove<
    />\s*Confirm</,                         // >Confirm<
    />\s*Update</,                          // >Update<
  ];

  for (const pattern of patterns) {
    if (pattern.test(content)) return true;
  }
  return false;
}

// Check if file uses forwardRef (needs special handling)
function usesForwardRef(content) {
  return content.includes('forwardRef');
}

// Check if the component is a class component
function isClassComponent(content) {
  return /class\s+\w+\s+extends\s+(React\.)?Component/.test(content);
}

// Add import statement
function addImport(content) {
  // Check if react-i18next is already imported for something else
  if (content.includes('react-i18next')) {
    // Add useTranslation to existing import
    return content.replace(
      /import\s*\{([^}]*)\}\s*from\s*['"]react-i18next['"]/,
      (match, imports) => {
        if (imports.includes('useTranslation')) return match;
        return `import { ${imports.trim()}, useTranslation } from 'react-i18next'`;
      }
    );
  }

  // Find the right place to add the import - after the last import
  const lines = content.split('\n');
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].match(/^\s*import /)) {
      lastImportIndex = i;
      // Handle multi-line imports
      while (i < lines.length && !lines[i].includes(';') && !lines[i].match(/['"]\s*;?\s*$/)) {
        i++;
        lastImportIndex = i;
      }
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, "import { useTranslation } from 'react-i18next';");
    return lines.join('\n');
  }

  // Fallback: add at top
  return "import { useTranslation } from 'react-i18next';\n" + content;
}

// Add the hook call after the component function declaration
function addHook(content, namespace) {
  const hookLine = `  const { t } = useTranslation('${namespace}');`;

  // Pattern 1: const Component = (...) => {
  // Pattern 2: function Component(...) {
  // Pattern 3: export const Component = (...) => {
  // Pattern 4: export function Component(...) {
  // Pattern 5: const Component: React.FC = () => {

  // Try to find the first component function and add hook after opening brace
  // This is complex, so we'll use a simpler approach: add after the first { that follows a component declaration

  // First, check if there's already a hook at the top level
  if (content.includes("useTranslation(")) return content;

  // Strategy: find patterns like "=> {" or "function X() {" or "Component = () => {"
  // and add the hook after the first line that's a top-level component start

  const lines = content.split('\n');
  let insideImports = true;
  let braceDepth = 0;
  let foundComponent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip imports
    if (line.match(/^import\s/) || line.match(/^\s*import\s/)) {
      insideImports = true;
      continue;
    }
    if (insideImports && (line.match(/^['"]/) || line.match(/^\s*\}/))) {
      continue;
    }
    insideImports = false;

    // Look for component function patterns
    if (!foundComponent) {
      // Match: const X = (...) => { or function X(...) { or export default function X
      const isComponentStart =
        (line.match(/(?:export\s+)?(?:const|let)\s+\w+\s*(?::\s*React\.\w+(?:<[^>]*>)?\s*)?=\s*\([^)]*\)\s*(?::\s*\w+)?\s*=>\s*\{/) ||
         line.match(/(?:export\s+)?(?:const|let)\s+\w+\s*(?::\s*React\.\w+(?:<[^>]*>)?\s*)?=\s*\(\s*$/) ||
         line.match(/(?:export\s+)?function\s+\w+/) ||
         line.match(/(?:export\s+default\s+)?function\s+\w+/) ||
         line.match(/^\s*\(\s*\{/) // destructured props
        );

      if (isComponentStart) {
        // Find the opening brace of the function body
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].includes('{')) {
            // Check if next line already has a const { t }
            if (j + 1 < lines.length && lines[j + 1].includes('useTranslation')) {
              foundComponent = true;
              break;
            }
            // Insert hook after this line
            lines.splice(j + 1, 0, hookLine);
            foundComponent = true;
            break;
          }
        }
      }
    }

    if (foundComponent) break;
  }

  if (!foundComponent) {
    // Fallback: try a more aggressive approach
    // Look for arrow function patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/=>\s*\{/) && !line.match(/^\s*\/\//) && !line.match(/^\s*\*/)) {
        if (i + 1 < lines.length && !lines[i + 1].includes('useTranslation')) {
          lines.splice(i + 1, 0, hookLine);
          foundComponent = true;
          break;
        }
      }
    }
  }

  if (!foundComponent) {
    // Last resort: find first function body
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/function\s+\w+/) || lines[i].match(/\w+\s*=\s*\(/)) {
        for (let j = i; j < Math.min(i + 15, lines.length); j++) {
          if (lines[j].includes('{') && !lines[j].match(/^\s*\/\//)) {
            lines.splice(j + 1, 0, hookLine);
            foundComponent = true;
            break;
          }
        }
        if (foundComponent) break;
      }
    }
  }

  return lines.join('\n');
}

// Pure wrapper/structural files that should be skipped
const SKIP_FILES = new Set([
  'src/components/ThemeProvider.tsx',
  'src/components/ProtectedRoute.tsx',
  'src/components/ProtectedLayout.tsx',
  'src/components/RoleGate.tsx',
  'src/components/FeatureGate.tsx',
  'src/components/BackgroundVideo.tsx',
  'src/components/OceanBackgroundVideo.tsx',
  'src/components/DynamicBackground.tsx',
  'src/components/LivePulse.tsx',
  'src/components/NavigationGroup.tsx',
  'src/components/PerformanceMonitor.tsx',
  'src/components/tracing/NavigationTracer.tsx',
  'src/components/tracking/TrackedComponents.tsx',
  'src/components/tracking/TrackingProvider.tsx',
  'src/components/mobile/MobileLayoutProvider.tsx',
  'src/components/mobile/SwipeableListItem.tsx',
  'src/components/native/PushNotificationHandler.tsx',
  'src/components/auth/ShaderAnimation.tsx',
  'src/components/charts/LazyCharts.tsx',
  'src/components/feed/LazyMedia.tsx',
  'src/components/workspace/LazyWorkspaceEditor.tsx',
  'src/components/workspace/BlockSelectionHighlight.tsx',
  'src/components/workspace/CollaborativeCursors.tsx',
  'src/components/admin/shared/MetricCard.tsx',
  'src/components/admin/shared/MetricCardSkeleton.tsx',
  'src/components/admin/shared/TrendChart.tsx',
  'src/components/admin/shared/AlertPanel.tsx',
  'src/components/partner/PartnerGlassCard.tsx',
  'src/components/partner/job-card/JobCardCheckbox.tsx',
  'src/components/partner/job-card/JobSparkline.tsx',
  'src/components/partner-funnel/StepTransition.tsx',
  'src/components/meetings/RemoteAudioRenderer.tsx',
  'src/components/blog/BlogCardSkeleton.tsx',
  'src/components/blog/BlogSchema.tsx',
  'src/components/blog/ReadingProgress.tsx',
  'src/components/email/EmailRowSkeleton.tsx',
  'src/components/email/SearchOperatorBadge.tsx',
  'src/components/email/VirtualEmailList.tsx',
  'src/components/unified-tasks/TaskCardSkeleton.tsx',
  'src/components/voice/ClubAIWaveform.tsx',
  'src/components/shared/AudioLevelMeter.tsx',
  'src/components/video-call/OnScreenReactions.tsx',
  'src/components/video-call/VideoGrid.tsx',
  'src/components/workspace/database/cells/CheckboxCell.tsx',
  'src/components/workspace/database/cells/DatabaseCell.tsx',
  'src/components/academy/CourseProgressRing.tsx',
  'src/components/candidates/StageDurationBadge.tsx',
  'src/components/deals/DealHealthBadge.tsx',
  'src/components/financial/EntityBadge.tsx',
  'src/components/routes/JobDashboardRoute.tsx',
  'src/components/LoadingSkeletons.tsx',
  'src/components/PageLoader.tsx',
  'src/components/ActivityTracker.tsx',
  'src/components/time-tracking/ActivityMonitoringIndicator.tsx',
]);

let converted = 0;
let skippedNoText = 0;
let skippedManual = 0;
let errors = 0;

for (const filePath of unconvertedFiles) {
  try {
    // Skip known pure wrappers
    if (SKIP_FILES.has(filePath)) {
      skippedManual++;
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf-8');

    // Skip class components (rare, would need different handling)
    if (isClassComponent(content)) {
      console.log(`SKIP (class component): ${filePath}`);
      skippedManual++;
      continue;
    }

    // Check if file has user-visible text
    if (!hasUserVisibleText(content)) {
      skippedNoText++;
      continue;
    }

    const namespace = getNamespace(filePath);

    // Add import
    content = addImport(content);

    // Add hook
    content = addHook(content, namespace);

    fs.writeFileSync(filePath, content, 'utf-8');
    converted++;
    console.log(`CONVERTED: ${filePath} (ns: ${namespace})`);

  } catch (err) {
    console.error(`ERROR: ${filePath}: ${err.message}`);
    errors++;
  }
}

console.log(`\n--- Summary ---`);
console.log(`Converted: ${converted}`);
console.log(`Skipped (no text): ${skippedNoText}`);
console.log(`Skipped (manual/wrapper): ${skippedManual}`);
console.log(`Errors: ${errors}`);
console.log(`Total processed: ${unconvertedFiles.length}`);
