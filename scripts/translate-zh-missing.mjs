import fs from 'fs';
import path from 'path';

const base = decodeURIComponent(new URL('../src/i18n/locales', import.meta.url).pathname);
const ns = process.argv[2] || 'admin';

const enData = JSON.parse(fs.readFileSync(path.join(base, 'en', `${ns}.json`), 'utf8'));
const zhData = JSON.parse(fs.readFileSync(path.join(base, 'zh', `${ns}.json`), 'utf8'));

// Translation dictionary for common English terms/phrases
const dict = {
  // Actions
  'Save': '保存', 'Cancel': '取消', 'Delete': '删除', 'Edit': '编辑',
  'Submit': '提交', 'Create': '创建', 'Update': '更新', 'Close': '关闭',
  'Confirm': '确认', 'Apply': '应用', 'Search': '搜索', 'Filter': '筛选',
  'Download': '下载', 'Upload': '上传', 'Export': '导出', 'Import': '导入',
  'View': '查看', 'Back': '返回', 'Next': '下一步', 'Previous': '上一步',
  'Refresh': '刷新', 'Reset': '重置', 'Copy': '复制', 'Share': '分享',
  'Add': '添加', 'Remove': '移除', 'Enable': '启用', 'Disable': '禁用',
  'Approve': '批准', 'Reject': '拒绝', 'Decline': '拒绝',
  'Send': '发送', 'Retry': '重试', 'Select': '选择', 'Configure': '配置',
  'Manage': '管理', 'Settings': '设置', 'Loading': '加载中',
  'Loading...': '加载中...', 'Saving...': '保存中...', 'Processing...': '处理中...',
  // Status
  'Active': '活跃', 'Inactive': '不活跃', 'Pending': '待处理',
  'Completed': '已完成', 'Failed': '失败', 'Success': '成功',
  'Error': '错误', 'Warning': '警告', 'Info': '信息',
  'Approved': '已批准', 'Rejected': '已拒绝', 'Archived': '已归档',
  'Draft': '草稿', 'Published': '已发布', 'Paused': '已暂停',
  'Online': '在线', 'Offline': '离线',
  // Labels
  'Name': '名称', 'Email': '邮箱', 'Phone': '电话', 'Title': '标题',
  'Description': '描述', 'Status': '状态', 'Date': '日期', 'Time': '时间',
  'Type': '类型', 'Category': '分类', 'Priority': '优先级',
  'Notes': '备注', 'Tags': '标签', 'Role': '角色', 'Actions': '操作',
  'Details': '详情', 'Overview': '概览', 'Summary': '摘要',
  'Total': '总计', 'Count': '数量', 'Average': '平均',
  'Dashboard': '仪表盘', 'Analytics': '分析', 'Reports': '报告',
  'Profile': '档案', 'Company': '公司', 'Team': '团队',
  'User': '用户', 'Users': '用户', 'Members': '成员',
  'Candidates': '候选人', 'Jobs': '职位', 'Applications': '申请',
  'Meetings': '会议', 'Messages': '消息', 'Notifications': '通知',
  'Documents': '文档', 'Files': '文件', 'Comments': '评论',
  'All': '全部', 'None': '无', 'Yes': '是', 'No': '否',
  'Low': '低', 'Medium': '中', 'High': '高',
  'Today': '今天', 'Yesterday': '昨天', 'Tomorrow': '明天',
  'Week': '周', 'Month': '月', 'Year': '年',
  'Days': '天', 'Hours': '小时', 'Minutes': '分钟',
  'New': '新建', 'Recent': '最近', 'Updated': '已更新',
  'Required': '必填', 'Optional': '可选',
};

// Auto-translate simple one-word or common phrases
function autoTranslate(enValue) {
  if (typeof enValue !== 'string') return enValue;

  // Exact match
  if (dict[enValue]) return dict[enValue];

  // Common patterns
  if (enValue === 'Loading...') return '加载中...';
  if (enValue === 'Saving...') return '保存中...';
  if (enValue === 'Processing...') return '处理中...';
  if (enValue.startsWith('No ') && enValue.endsWith(' found')) {
    return '未找到' + enValue.slice(3, -6);
  }

  // Return EN value as-is (will be translated manually)
  return enValue;
}

// Deep merge with auto-translation for missing keys
function deepMerge(en, zh) {
  const result = { ...zh };
  for (const key of Object.keys(en)) {
    if (!(key in result)) {
      if (typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key])) {
        result[key] = deepMerge(en[key], {});
      } else {
        result[key] = autoTranslate(en[key]);
      }
    } else if (
      typeof en[key] === 'object' && en[key] !== null && !Array.isArray(en[key]) &&
      typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(en[key], result[key]);
    }
  }
  return result;
}

const merged = deepMerge(enData, zhData);
const output = JSON.stringify(merged, null, 2);
fs.writeFileSync(path.join(base, 'zh', `${ns}.json`), output + '\n', 'utf8');

// Count
function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(flattenKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const zhKeys = new Set(flattenKeys(zhData));
const mergedKeys = flattenKeys(merged);
const added = mergedKeys.filter(k => !zhKeys.has(k));
console.log(`${ns}: merged ${added.length} new keys. Total keys: ${mergedKeys.length}`);
