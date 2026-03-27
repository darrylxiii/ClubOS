/**
 * Script to replace single-quoted toast messages and other missed strings.
 */

import fs from 'fs';
import path from 'path';

const MEETINGS_DIR = path.resolve('src/components/meetings');
const JSON_PATH = path.resolve('src/i18n/locales/en/meetings.json');

const existingJson = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

function setNestedKey(obj, keyPath, value) {
  const parts = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) current[parts[i]] = {};
    current = current[parts[i]];
  }
  if (!(parts[parts.length - 1] in current)) {
    current[parts[parts.length - 1]] = value;
  }
}

function camelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function getSectionForFile(filename) {
  const name = filename.replace('.tsx', '');
  const mappings = {
    'AIHighlight': 'highlights', 'AdminRecording': 'adminRecording',
    'AudioLevel': 'audio', 'Bandwidth': 'bandwidth', 'BreakoutRoom': 'breakout',
    'Calendar': 'calendar', 'Candidate': 'candidateBrief', 'ClubAI': 'clubAi',
    'Conflict': 'conflict', 'Connection': 'connection', 'Create': 'create',
    'E2E': 'e2e', 'Engagement': 'engagement', 'Enhanced': 'enhanced',
    'Event': 'eventDetail', 'External': 'external', 'Generate': 'dossier',
    'Gesture': 'gesture', 'Global': 'globalSearch', 'Guest': 'guest',
    'Host': 'host', 'Instant': 'instant', 'Interview': 'interview',
    'Invite': 'invite', 'JoinExternal': 'joinExternal', 'JoinMeeting': 'joinMeeting',
    'LiveKit': 'liveKit', 'LiveTrans': 'liveTranslation', 'LowLight': 'lowLight',
    'MeetYour': 'meetInterviewers', 'MeetingAnalytics': 'analytics',
    'MeetingCard': 'meetingCard', 'MeetingConnection': 'connection',
    'MeetingCost': 'cost', 'MeetingDashboard': 'dashboard',
    'MeetingDetails': 'details', 'MeetingDossier': 'dossier',
    'MeetingHistory': 'history', 'MeetingIntelligence': 'intelligence',
    'MeetingInvitation': 'invitation', 'MeetingMode': 'mode',
    'MeetingNotification': 'notification', 'MeetingPoll': 'poll',
    'MeetingQA': 'qa', 'MeetingRecording': 'recordingCard',
    'MeetingSetting': 'meetingSettings', 'MeetingStats': 'stats',
    'MeetingSummary': 'summary', 'MeetingTemplate': 'template',
    'MeetingTimer': 'timer', 'MeetingVideo': 'videoCall',
    'Mobile': 'mobile', 'Network': 'network', 'Notetaker': 'notetaker',
    'Participant': 'participants', 'Performance': 'performance',
    'Personal': 'personalRoom', 'PostMeeting': 'postMeeting',
    'PreJoin': 'preJoin', 'Predictive': 'predictive',
    'RecordingClip': 'recordingClip', 'RecordingConsent': 'recordingConsent',
    'RecordingInd': 'recording', 'RecordingPlayback': 'recordingPlayback',
    'Remote': 'remote', 'Reschedule': 'reschedule', 'Schedule': 'schedule',
    'ScreenShare': 'screenShare', 'Security': 'security',
    'Send': 'sendToPilot', 'Share': 'shareRecording', 'Silent': 'silentObserver',
    'Speaking': 'speaking', 'TURN': 'turn', 'Timestamp': 'transcript',
    'Transcription': 'transcription', 'Unified': 'unified',
    'Virtual': 'virtualBg', 'WaitingRoom': 'waitingRoom',
    'LiveInterview': 'liveAnalysis',
  };

  for (const [prefix, section] of Object.entries(mappings)) {
    if (name.startsWith(prefix)) return section;
  }
  return camelCase(name);
}

function getAllTsxFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getAllTsxFiles(fullPath));
    else if (entry.name.endsWith('.tsx')) files.push(fullPath);
  }
  return files;
}

const files = getAllTsxFiles(MEETINGS_DIR);
let totalReplacements = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const filename = path.basename(file);
  const section = getSectionForFile(filename);
  let replacements = 0;

  // Replace single-quoted toast messages
  content = content.replace(
    /toast\.(success|error|info|warning)\('([^']+)'\)/g,
    (match, type, text) => {
      // Skip if text contains template literals or variables
      if (text.includes('${') || text.includes('`')) return match;

      const key = `${section}.toast${camelCase(text.slice(0, 40)).charAt(0).toUpperCase() + camelCase(text.slice(0, 40)).slice(1)}`;
      setNestedKey(existingJson, key, text);
      replacements++;
      return `toast.${type}(t("${key}", "${text.replace(/"/g, '\\"')}"))`;
    }
  );

  // Replace single-quoted toast messages with objects (description/duration)
  content = content.replace(
    /toast\.(success|error|info|warning)\('([^']+)',\s*\{/g,
    (match, type, text) => {
      if (text.includes('${') || text.includes('`')) return match;

      const key = `${section}.toast${camelCase(text.slice(0, 40)).charAt(0).toUpperCase() + camelCase(text.slice(0, 40)).slice(1)}`;
      setNestedKey(existingJson, key, text);
      replacements++;
      return `toast.${type}(t("${key}", "${text.replace(/"/g, '\\"')}"), {`;
    }
  );

  // Replace remaining >lowercase text< JSX content (that starts lowercase but is user-visible)
  // E.g., >min< or >event(s)< - skip these as they're too likely false positives

  if (replacements > 0) {
    fs.writeFileSync(file, content);
    console.log(`[${filename}] ${replacements} toast strings replaced`);
    totalReplacements += replacements;
  }
}

// Write updated JSON
fs.writeFileSync(JSON_PATH, JSON.stringify(existingJson, null, 2) + '\n');

console.log(`\n--- Summary ---`);
console.log(`Total toast replacements: ${totalReplacements}`);
