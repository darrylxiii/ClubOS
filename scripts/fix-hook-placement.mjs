#!/usr/bin/env node
/**
 * Fixes misplaced useTranslation hooks that were inserted inside
 * the destructuring parameters of memo() components.
 *
 * Moves them from:
 *   memo(({
 *     const { t } = useTranslation('ns');
 *     prop1,
 * To:
 *   memo(({
 *     prop1,
 *   ...
 *   }) => {
 *     const { t } = useTranslation('ns');
 */
import fs from 'fs';
import path from 'path';

const files = [
  'src/components/candidate/AssessmentDetailModal.tsx',
  'src/components/job-dashboard/PipelineKanbanColumn.tsx',
  'src/components/job-dashboard/PipelineKanbanCard.tsx',
  'src/components/job-dashboard/PipelineKanbanBoard.tsx',
  'src/components/job-dashboard/PipelineEmailComposer.tsx',
  'src/components/job-dashboard/JobDashboardStatsBar.tsx',
  'src/components/job-dashboard/JobDashboardHeader.tsx',
  'src/components/job-dashboard/InterviewProgressIndicator.tsx',
  'src/components/job-dashboard/CollapsibleSection.tsx',
  'src/components/jobs/UrgencyMeter.tsx',
  'src/components/jobs/QuickStatsGrid.tsx',
  'src/components/jobs/MultiLocationInput.tsx',
  'src/components/jobs/JobLocationDisplay.tsx',
  'src/components/jobs/HorizontalFilters.tsx',
  'src/components/jobs/HiringProgressBar.tsx',
];

const ROOT = process.cwd();

for (const fileRel of files) {
  const filePath = path.join(ROOT, fileRel);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Pattern: inside memo(({ ... }) =>  the hook is right after the opening
  // Find: `memo(({`  then on the next line `  const { t } = useTranslation('...');`
  const hookLineRegex = /^(\s*const \{ t \} = useTranslation\('[^']+'\);)\s*$/m;

  const lines = content.split('\n');
  let hookLine = null;
  let hookLineIndex = -1;
  let insideMemoDestructuring = false;
  let closingBraceLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Detect memo(({ pattern
    if (trimmed.includes('memo(({') || trimmed.includes('memo((')) {
      insideMemoDestructuring = true;
    }

    // If we're inside memo destructuring and find the hook line
    if (insideMemoDestructuring && hookLineRegex.test(lines[i])) {
      hookLine = lines[i].match(hookLineRegex)?.[1]?.trim();
      hookLineIndex = i;
      // Now find the closing `}) => {` or `}: ...Props) => {`
      for (let j = i + 1; j < lines.length; j++) {
        const jTrimmed = lines[j].trim();
        if (jTrimmed.includes(') => {') || jTrimmed.includes('=> {')) {
          closingBraceLineIndex = j;
          break;
        }
      }
      break;
    }
  }

  if (hookLine && hookLineIndex >= 0 && closingBraceLineIndex >= 0) {
    // Remove the misplaced hook line
    lines.splice(hookLineIndex, 1);
    // Adjust index since we removed a line
    const adjustedClosingIndex = closingBraceLineIndex - 1;

    // Insert hook after the closing `=> {` line
    lines.splice(adjustedClosingIndex + 1, 0, `  ${hookLine}`);

    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed: ${fileRel}`);
  } else {
    console.log(`Skipped (pattern not matched): ${fileRel}`);
  }
}

console.log('\nDone!');
