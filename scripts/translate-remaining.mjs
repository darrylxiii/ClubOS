/**
 * Script to catch remaining hardcoded strings:
 * - placeholder='...' (single-quoted)
 * - title='...' (single-quoted)
 * - lowercase JSX text like >No events</span>
 * - Strings in conditions like ? 'text' : 'text'
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

  // Replace single-quoted placeholders
  content = content.replace(
    /(placeholder=)'([A-Z][a-zA-Z\s',.!?:\/\-()]+?)'/g,
    (match, attr, text) => {
      if (text.length < 3) return match;
      const key = `${section}.${camelCase(text)}`;
      setNestedKey(existingJson, key, text);
      replacements++;
      return `${attr}{t("${key}", "${text.replace(/"/g, '\\"')}")}`;
    }
  );

  // Replace single-quoted title attributes
  content = content.replace(
    /(title=)'([A-Z][a-zA-Z\s',.!?:\/\-()]+?)'/g,
    (match, attr, text) => {
      if (text.length < 3) return match;
      const key = `${section}.${camelCase(text)}`;
      setNestedKey(existingJson, key, text);
      replacements++;
      return `${attr}{t("${key}", "${text.replace(/"/g, '\\"')}")}`;
    }
  );

  // Replace >lowercase user-visible text< that was missed
  // Pattern: >Some lowercase text</ (between JSX tags, multiword)
  content = content.replace(
    />([\s]*)((?:[a-z][a-zA-Z]+\s[a-zA-Z\s]{3,}))([\s]*)<\//g,
    (match, pre, text, post) => {
      const trimmed = text.trim();
      // Skip if too short or looks like code
      if (trimmed.length < 5) return match;
      if (/^(className|onClick|onChange|onSubmit|disabled|type|value|key|ref|style|aria)/.test(trimmed)) return match;
      if (/^(const|let|var|return|import|export|function|if|else|for|while|switch|case)/.test(trimmed)) return match;
      // Skip CSS-like or code-like strings
      if (/[{}()=]/.test(trimmed)) return match;
      // Must contain at least one space (multiword)
      if (!/\s/.test(trimmed)) return match;

      const key = `${section}.${camelCase(trimmed)}`;
      setNestedKey(existingJson, key, trimmed);
      replacements++;
      return `>${pre}{t("${key}", "${trimmed.replace(/"/g, '\\"')}")}${post}</`;
    }
  );

  if (replacements > 0) {
    fs.writeFileSync(file, content);
    console.log(`[${filename}] ${replacements} remaining strings replaced`);
    totalReplacements += replacements;
  }
}

// Write updated JSON
fs.writeFileSync(JSON_PATH, JSON.stringify(existingJson, null, 2) + '\n');

console.log(`\n--- Summary ---`);
console.log(`Total remaining replacements: ${totalReplacements}`);
