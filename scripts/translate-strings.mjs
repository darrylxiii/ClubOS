/**
 * Script to replace hardcoded English strings with t() calls in meetings components.
 *
 * Strategy: Use regex patterns to find and replace common string patterns.
 * We process each file, find hardcoded strings in JSX, and replace them.
 */

import fs from 'fs';
import path from 'path';

const MEETINGS_DIR = path.resolve('src/components/meetings');
const JSON_PATH = path.resolve('src/i18n/locales/en/meetings.json');

// Read existing JSON
const existingJson = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

// New keys we'll collect
const newKeys = {};

function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function getNestedKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (!current || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function camelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function generateKey(section, text) {
  // Generate a key from the text
  const words = text.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).slice(0, 4);
  const key = words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  return `${section}.${key}`;
}

function getAllTsxFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllTsxFiles(fullPath));
    } else if (entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Map of file name prefixes to translation sections
function getSectionForFile(filename) {
  const name = filename.replace('.tsx', '');
  // Map to sections
  const mappings = {
    'AIHighlight': 'highlights',
    'AdminRecording': 'adminRecording',
    'AudioLevel': 'audio',
    'Bandwidth': 'bandwidth',
    'Breakout': 'breakout',
    'Calendar': 'calendar',
    'Candidate': 'candidateBrief',
    'ClubAI': 'clubAi',
    'Conflict': 'conflict',
    'Connection': 'connection',
    'Create': 'create',
    'E2E': 'e2e',
    'Engagement': 'engagement',
    'Enhanced': 'enhanced',
    'Event': 'eventDetail',
    'External': 'external',
    'Generate': 'dossier',
    'Gesture': 'gesture',
    'Global': 'globalSearch',
    'Guest': 'guest',
    'Host': 'host',
    'Instant': 'instant',
    'Interview': 'interview',
    'Invite': 'invite',
    'Join': 'joinMeeting',
    'LiveKit': 'liveKit',
    'LiveTrans': 'liveTranslation',
    'LowLight': 'lowLight',
    'Meet': 'meetInterviewers',
    'MeetingA': 'analytics',
    'MeetingCard': 'meetingCard',
    'MeetingConn': 'connection',
    'MeetingCost': 'cost',
    'MeetingDash': 'dashboard',
    'MeetingDetail': 'details',
    'MeetingDossier': 'dossier',
    'MeetingHistory': 'history',
    'MeetingIntelligence': 'intelligence',
    'MeetingInvitation': 'invitation',
    'MeetingMode': 'mode',
    'MeetingNotification': 'notification',
    'MeetingPoll': 'poll',
    'MeetingQA': 'qa',
    'MeetingRecording': 'recordingCard',
    'MeetingSetting': 'settings',
    'MeetingStats': 'stats',
    'MeetingSummary': 'summary',
    'MeetingTemplate': 'template',
    'MeetingTimer': 'timer',
    'MeetingVideo': 'videoCall',
    'Mobile': 'mobile',
    'Network': 'network',
    'Notetaker': 'notetaker',
    'Participant': 'participants',
    'Performance': 'performance',
    'Personal': 'personalRoom',
    'PostMeeting': 'postMeeting',
    'PreJoin': 'preJoin',
    'Predictive': 'predictive',
    'RecordingC': 'recording',
    'RecordingConsent': 'recordingConsent',
    'RecordingInd': 'recording',
    'RecordingPlay': 'recordingPlayback',
    'Remote': 'remote',
    'Reschedule': 'reschedule',
    'Schedule': 'schedule',
    'ScreenShare': 'screenShare',
    'Security': 'security',
    'Send': 'sendToPilot',
    'Share': 'shareRecording',
    'Silent': 'silentObserver',
    'Speaking': 'speaking',
    'TURN': 'turn',
    'Timestamp': 'transcript',
    'Transcription': 'transcription',
    'Unified': 'unified',
    'Virtual': 'virtualBg',
    'WaitingRoom': 'waitingRoom',
    'LiveInterview': 'liveAnalysis',
  };

  for (const [prefix, section] of Object.entries(mappings)) {
    if (name.startsWith(prefix)) return section;
  }

  return camelCase(name);
}

// Common strings that should use common: namespace
const COMMON_STRINGS = new Set([
  'Save', 'Cancel', 'Delete', 'Edit', 'Close', 'Loading', 'Search',
  'No results', 'Submit', 'Back', 'Next', 'Done', 'OK', 'Yes', 'No',
  'Error', 'Success', 'Warning', 'Info', 'Confirm', 'Apply', 'Reset',
  'Export', 'Import', 'Create', 'View', 'Open', 'Copy', 'Send',
  'Refresh', 'Retry', 'Clear', 'Select', 'Add', 'Remove', 'Update'
]);

const COMMON_KEY_MAP = {
  'Save': 'common:actions.save',
  'Cancel': 'common:actions.cancel',
  'Delete': 'common:actions.delete',
  'Edit': 'common:actions.edit',
  'Close': 'common:actions.close',
  'Loading': 'common:status.loading',
  'Loading...': 'common:status.loading',
  'Search': 'common:actions.search',
  'Submit': 'common:actions.submit',
  'Back': 'common:actions.back',
  'Next': 'common:actions.next',
  'Done': 'common:actions.done',
  'Confirm': 'common:actions.confirm',
  'Apply': 'common:actions.apply',
  'Reset': 'common:actions.reset',
  'Export': 'common:actions.export',
  'Create': 'common:actions.create',
  'View': 'common:actions.view',
  'Open': 'common:actions.open',
  'Copy': 'common:actions.copy',
  'Send': 'common:actions.send',
  'Refresh': 'common:actions.refresh',
  'Retry': 'common:actions.retry',
  'Clear': 'common:actions.clear',
  'Select': 'common:actions.select',
  'Add': 'common:actions.add',
  'Remove': 'common:actions.remove',
  'Update': 'common:actions.update',
};

/**
 * Replace hardcoded strings in a file with t() calls.
 * This function uses regex to find patterns like:
 * - >Some Text<  (JSX text content)
 * - title="Some Text" / placeholder="Some Text" / aria-label="Some Text"
 * - toast.success("Some Text") / toast.error("Some Text")
 */
function replaceStringsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  const section = getSectionForFile(filename);
  let replacements = 0;

  // Skip if file already has extensive t() usage (likely already translated)
  const tCallCount = (content.match(/\bt\(/g) || []).length;
  const quotedStringCount = (content.match(/>[\s]*[A-Z][a-zA-Z\s]+[\s]*</g) || []).length;

  // Pattern 1: JSX text between tags: >Text Here<
  // Match: >Some Text< but not >{variable}<  or >{t(...)}<
  content = content.replace(
    />([\s]*)((?:[A-Z][a-zA-Z][\w\s',.!?:\/\-()]+?))([\s]*)</g,
    (match, pre, text, post) => {
      const trimmed = text.trim();

      // Skip if already translated, is a variable, is CSS class, is a component name, or is very short
      if (trimmed.length < 2) return match;
      if (/^[a-z]/.test(trimmed)) return match;
      if (/^[A-Z][a-z]*$/.test(trimmed) && trimmed.length < 4) return match;
      if (/^\{/.test(trimmed)) return match;
      if (/^</.test(trimmed)) return match;
      if (/className/.test(trimmed)) return match;
      if (/^(div|span|button|p|h[1-6]|Card|Badge|Button|Label|Input|Dialog|Alert)$/.test(trimmed)) return match;

      // Check for common namespace
      const commonKey = COMMON_KEY_MAP[trimmed];
      if (commonKey) {
        replacements++;
        return `>${pre}{t("${commonKey}", "${trimmed}")}${post}<`;
      }

      // Generate key for meetings namespace
      const key = generateKey(section, trimmed);
      if (!getNestedKey(existingJson, key)) {
        setNestedKey(newKeys, key, trimmed);
      }
      replacements++;
      return `>${pre}{t("${key}", "${trimmed.replace(/"/g, '\\"')}")}${post}<`;
    }
  );

  // Pattern 2: placeholder="..." / title="..." / aria-label="..."
  content = content.replace(
    /((?:placeholder|title|aria-label|alt)=)"([A-Z][a-zA-Z\s',.!?:\/\-()]+)"/g,
    (match, attr, text) => {
      const trimmed = text.trim();
      if (trimmed.length < 3) return match;

      const commonKey = COMMON_KEY_MAP[trimmed];
      if (commonKey) {
        replacements++;
        return `${attr}{t("${commonKey}", "${trimmed}")}`;
      }

      const key = generateKey(section, trimmed);
      if (!getNestedKey(existingJson, key)) {
        setNestedKey(newKeys, key, trimmed);
      }
      replacements++;
      return `${attr}{t("${key}", "${trimmed.replace(/"/g, '\\"')}")}`;
    }
  );

  // Pattern 3: toast.success("...") / toast.error("...") / toast.info("...")
  content = content.replace(
    /toast\.(success|error|info|warning)\("([A-Z][a-zA-Z\s',.!?:\/\-()]+)"\)/g,
    (match, type, text) => {
      const trimmed = text.trim();
      if (trimmed.length < 3) return match;

      const key = generateKey(section, trimmed);
      if (!getNestedKey(existingJson, key)) {
        setNestedKey(newKeys, key, trimmed);
      }
      replacements++;
      return `toast.${type}(t("${key}", "${trimmed.replace(/"/g, '\\"')}"))`;
    }
  );

  if (replacements > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`[${filename}] ${replacements} strings replaced (section: ${section})`);
  }

  return replacements;
}

// Process all files
const files = getAllTsxFiles(MEETINGS_DIR);
let totalReplacements = 0;

for (const file of files) {
  totalReplacements += replaceStringsInFile(file);
}

// Merge new keys into existing JSON
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (!(key in target)) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      if (!(key in target)) {
        target[key] = source[key];
      }
    }
  }
}

deepMerge(existingJson, newKeys);

// Write updated JSON
fs.writeFileSync(JSON_PATH, JSON.stringify(existingJson, null, 2) + '\n');

console.log(`\n--- Summary ---`);
console.log(`Total files processed: ${files.length}`);
console.log(`Total string replacements: ${totalReplacements}`);
console.log(`New translation keys added: ${Object.keys(newKeys).length} sections`);
console.log(`\nNew keys added to meetings.json`);
