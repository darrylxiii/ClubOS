import fs from 'fs';
import path from 'path';

const base = decodeURIComponent(new URL('../src/i18n/locales', import.meta.url).pathname);
const zhPath = path.join(base, 'zh', 'meetings.json');
const zhData = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

// --- recording section: add 34 missing keys ---
const recordingPatch = {
  start: "开始录制",
  stop: "停止录制",
  pause: "暂停录制",
  resume: "继续录制",
  inProgress: "正在录制",
  saved: "录制已保存",
  download: "下载录制",
  share: "分享录制",
  delete: "删除录制",
  createClip: "创建剪辑",
  createAShareableClip: "从此录制片段创建可分享的剪辑",
  shareLink: "分享链接",
  description: "描述",
  publicAccess: "公开访问",
  anyoneWithTheLink: "拥有链接的任何人都可以查看",
  linkExpiresIn: "链接过期时间",
  never: "永不",
  creating: "创建中...",
  copyToClipboard: "复制到剪贴板",
  optionalContextForViewers: "为观看者添加可选说明",
  recordingConsentRequired: "需要录制同意",
  thisMeetingWillBe: "本次会议将被录制，用于质量和培训目的。",
  theHostHasEnabled: "主持人已为本次会议启用了录制功能。",
  videoRecording: "视频录制",
  yourVideoFeedWill: "您的视频画面将包含在录制中",
  audioRecording: "音频录制",
  yourVoiceWillBe: "您的语音将被采集用于转录",
  automaticTranscription: "自动转录",
  speechtotextConversionOfThe: "会议的语音转文字转换",
  generateSummariesActionItems: "生成摘要、行动项和会议智能分析",
  yourDataIsEncrypted: "您的数据已加密并安全存储。录制内容仅供会议参与者和授权人员访问。您可以随时根据 GDPR/隐私要求请求删除。",
  youveOptedOutOf: "您已选择退出所有录制。您仍然可以参加会议，但不会保存您的参与录制。",
  leaveMeeting: "离开会议",
  clubAiIsRecording: "Club AI 正在录制"
};

// --- status section: add 6 missing keys ---
const statusPatch = {
  scheduled: "已安排",
  inProgress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
  rescheduled: "已重新安排",
  noShow: "未出席"
};

// --- joinMeeting section: add 14 missing keys ---
const joinMeetingPatch = {
  zoom: "Zoom",
  microsoftTeams: "Microsoft Teams",
  googleMeet: "Google Meet",
  other: "其他",
  captureExternalMeeting: "捕获外部会议",
  recordYourZoomTeams: "直接从浏览器录制您的 Zoom、Teams 或 Google Meet 窗口。",
  meetingTitle: "会议标题",
  platform: "平台",
  howItWorks: "使用方法：",
  openYourMeetingIn: "在另一个浏览器窗口或标签页中打开您的会议",
  privacy: "隐私：",
  yourRecordingStaysInhouse: "您的录制内容保留在内部。请确保所有参与者同意录制。",
  startCapture: "开始捕获",
  weeklySyncInterviewWith: "每周同步会、与 John 的面试等。"
};

// Merge patches into existing sections
if (!zhData.recording) zhData.recording = {};
Object.assign(zhData.recording, recordingPatch);

if (!zhData.status) zhData.status = {};
Object.assign(zhData.status, statusPatch);

if (!zhData.joinMeeting) zhData.joinMeeting = {};
Object.assign(zhData.joinMeeting, joinMeetingPatch);

fs.writeFileSync(zhPath, JSON.stringify(zhData, null, 2) + '\n', 'utf8');

console.log(`Patched meetings.json: +${Object.keys(recordingPatch).length} recording, +${Object.keys(statusPatch).length} status, +${Object.keys(joinMeetingPatch).length} joinMeeting`);
