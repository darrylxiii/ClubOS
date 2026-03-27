import fs from 'fs';
import path from 'path';

const base = decodeURIComponent(new URL('../src/i18n/locales', import.meta.url).pathname);
const zhPath = path.join(base, 'zh', 'common.json');
const zhData = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

// Fix toast: replace string "Toast" with proper object
// Note: EN has "0"-"4" keys spelling T-o-a-s-t which is a bug in EN;
// we still sync them for parity, plus the real key
zhData.toast = {
  "0": "T",
  "1": "o",
  "2": "a",
  "3": "s",
  "4": "t",
  "youreFullySetUpYour": "您已全部设置完成"
};

// Fix communication: replace spread-character object with proper structure
zhData.communication = {
  resolved: "已解决",
  confidence: "{{confidence}}% 置信度",
  detected: "发现于 {{date}}",
  noCommunications: "暂无沟通记录",
  noCommunicationsDesc: "消息、邮件和会议将显示在此处",
  unknownDate: "未知日期",
  noContent: "暂无内容",
  showLess: "收起",
  showAIAnalysis: "显示 AI 分析",
  summary: "摘要",
  aiAnalysis: "AI 分析",
  stats: {
    totalCandidates: "候选人总数",
    healthyRelationships: "健康关系",
    atRisk: "存在风险",
    avgResponseRate: "平均回复率",
    avgEngagement: "平均参与度"
  },
  workflow: {
    quickActions: "快速操作",
    createTask: "创建跟进任务",
    createTaskDesc: "为此关系在 Club Pilot 中添加任务",
    sendAlert: "发送提醒",
    sendAlertDesc: "通知指定策略师关注此模式",
    scheduleFollowup: "安排跟进",
    scheduleFollowupDesc: "设置未来联系提醒",
    escalate: "升级至策略师",
    escalateDesc: "为此案例分配高级策略师",
    executeRecommended: "执行推荐操作",
    actionExecuted: "操作已执行",
    actionExecutedDesc: "已成功执行 {{action}}",
    actionFailed: "操作失败",
    actionFailedDesc: "执行操作失败",
    workflowExecuted: "工作流已执行",
    workflowExecutedDesc: "已执行 {{count}} 项推荐操作",
    workflowFailed: "工作流失败",
    workflowFailedDesc: "执行工作流失败"
  }
};

// Fix shared: replace string "Shared" with proper object
zhData.shared = {
  speaking: "正在发言"
};

// Fix timeline: replace string "Timeline" with proper object
zhData.timeline = {
  activity: "活动",
  failedToLoad: "加载活动时间线失败。",
  retry: "重试",
  noActivity: "暂无活动记录。",
  eventCount: "{{count}} 个事件",
  loadMore: "加载更多（还剩 {{count}} 条）",
  via: "通过 {{source}}"
};

fs.writeFileSync(zhPath, JSON.stringify(zhData, null, 2) + '\n', 'utf8');

console.log('Patched common.json: toast (6), communication (34), shared (1), timeline (7) = 48 keys total');
