#!/usr/bin/env node
/**
 * Comprehensive ZH (Simplified Chinese) translation fixer
 *
 * Walks every key in EN and ZH JSON files.
 * - If ZH === EN (untranslated), translate to proper Chinese
 * - If ZH is mixed English/Chinese (broken), fix it
 * - If ZH is already good Chinese, keep it
 *
 * Uses a massive dictionary + phrase patterns + compositional translation.
 */

import fs from 'fs';
import path from 'path';

const base = decodeURIComponent(new URL('../src/i18n/locales', import.meta.url).pathname);

const NAMESPACES = [
  'common', 'admin', 'analytics', 'auth', 'candidates', 'compliance',
  'contracts', 'jobs', 'meetings', 'messages', 'onboarding', 'partner', 'settings'
];

// ============================================================================
// BRAND NAMES - never translate these
// ============================================================================
const BRAND_NAMES = new Set([
  'The Quantum Club', 'Club OS', 'Club AI', 'QUIN', 'Club Pilot', 'ClubPilot',
  'Club Radio', 'Club DJ', 'Club Home', 'Quantum Meetings', 'Club Sync',
  'Google', 'GitHub', 'Apple', 'LinkedIn', 'Microsoft', 'Slack', 'Zoom',
  'WhatsApp', 'Stripe', 'Resend', 'Twilio', 'Moneybird', 'Greenhouse',
  'Instantly', 'Apify', 'ElevenLabs', 'LiveKit', 'Fireflies', 'Fathom',
  'Findymail', 'MillionVerifier', 'Brandfetch', 'Supabase', 'Spotify',
  'YouTube', 'Vimeo', 'Calendly', 'HubSpot', 'Salesforce',
]);

// Technical terms to keep in English
const KEEP_ENGLISH = new Set([
  'KPI', 'CRM', 'API', 'Dashboard', 'Pipeline', 'CSS', 'HTML', 'JSON', 'CSV',
  'PDF', 'URL', 'SSO', 'SAML', 'OAuth', 'MFA', '2FA', 'IP', 'DNS', 'SSL',
  'TLS', 'HTTP', 'HTTPS', 'REST', 'SDK', 'CLI', 'IDE', 'SLA', 'OKR',
  'ROI', 'ARR', 'MRR', 'NPS', 'EEO', 'GDPR', 'SOC', 'SCIM', 'RBAC',
  'AUC-ROC', 'ML', 'AI', 'GPT', 'LLM', 'RAG', 'WebSocket', 'Webhook',
  'Edge Function', 'UUID', 'HMAC', 'JWT', 'SQL', 'RLS', 'CORS',
]);

// ============================================================================
// COMPREHENSIVE WORD-LEVEL DICTIONARY (900+ entries)
// ============================================================================
const WORD_DICT = {
  // --- Actions / Verbs ---
  'Save': '保存', 'Cancel': '取消', 'Delete': '删除', 'Edit': '编辑',
  'Search': '搜索', 'Filter': '筛选', 'Close': '关闭', 'Open': '打开',
  'Add': '添加', 'Remove': '移除', 'Update': '更新', 'Create': '创建',
  'Submit': '提交', 'Confirm': '确认', 'Back': '返回', 'Next': '下一步',
  'Previous': '上一步', 'Loading': '加载中', 'Start': '开始', 'Stop': '停止',
  'Pause': '暂停', 'Resume': '继续', 'Restart': '重启', 'Reset': '重置',
  'Apply': '应用', 'Reject': '拒绝', 'Approve': '批准', 'Decline': '拒绝',
  'Accept': '接受', 'Send': '发送', 'Receive': '接收', 'Reply': '回复',
  'Forward': '转发', 'Copy': '复制', 'Paste': '粘贴', 'Cut': '剪切',
  'Share': '分享', 'Print': '打印', 'Preview': '预览', 'Publish': '发布',
  'Unpublish': '取消发布', 'Archive': '归档', 'Unarchive': '取消归档',
  'Restore': '恢复', 'Refresh': '刷新', 'Retry': '重试', 'Select': '选择',
  'Deselect': '取消选择', 'Enable': '启用', 'Disable': '禁用',
  'Activate': '激活', 'Deactivate': '停用', 'Lock': '锁定', 'Unlock': '解锁',
  'Mute': '静音', 'Unmute': '取消静音', 'Show': '显示', 'Hide': '隐藏',
  'Expand': '展开', 'Collapse': '收起', 'Zoom': '缩放', 'Rotate': '旋转',
  'Drag': '拖动', 'Drop': '放置', 'Sort': '排序', 'Group': '分组',
  'Merge': '合并', 'Split': '拆分', 'Link': '链接', 'Unlink': '取消链接',
  'Pin': '置顶', 'Unpin': '取消置顶', 'Star': '收藏', 'Unstar': '取消收藏',
  'Like': '点赞', 'Unlike': '取消点赞', 'Follow': '关注', 'Unfollow': '取消关注',
  'Subscribe': '订阅', 'Unsubscribe': '取消订阅', 'Bookmark': '收藏',
  'Download': '下载', 'Upload': '上传', 'Export': '导出', 'Import': '导入',
  'Sync': '同步', 'Connect': '连接', 'Disconnect': '断开连接',
  'Install': '安装', 'Uninstall': '卸载', 'Configure': '配置',
  'Manage': '管理', 'Monitor': '监控', 'Track': '追踪', 'Analyze': '分析',
  'Generate': '生成', 'Calculate': '计算', 'Estimate': '预估',
  'Assign': '分配', 'Reassign': '重新分配', 'Delegate': '委派',
  'Schedule': '安排', 'Reschedule': '重新安排', 'Postpone': '推迟',
  'Invite': '邀请', 'Join': '加入', 'Leave': '离开', 'Quit': '退出',
  'Register': '注册', 'Enroll': '报名', 'Sign': '签名',
  'Verify': '验证', 'Validate': '验证', 'Authenticate': '认证',
  'Authorize': '授权', 'Revoke': '撤销', 'Suspend': '暂停',
  'Ban': '封禁', 'Block': '屏蔽', 'Report': '举报',
  'Escalate': '升级', 'Resolve': '解决', 'Dismiss': '忽略',
  'Acknowledge': '确认收到', 'Notify': '通知', 'Remind': '提醒',
  'Recommend': '推荐', 'Suggest': '建议', 'Propose': '提议',
  'Request': '请求', 'Respond': '回应', 'Process': '处理',
  'Review': '审核', 'Audit': '审计', 'Inspect': '检查',
  'Test': '测试', 'Debug': '调试', 'Deploy': '部署',
  'Migrate': '迁移', 'Transfer': '转移', 'Move': '移动',
  'Reorder': '重新排序', 'Customize': '自定义', 'Personalize': '个性化',
  'Optimize': '优化', 'Improve': '改进', 'Enhance': '增强',
  'Upgrade': '升级', 'Downgrade': '降级', 'Renew': '续订',
  'Extend': '延长', 'Shorten': '缩短', 'Adjust': '调整',
  'Modify': '修改', 'Change': '更改', 'Switch': '切换',
  'Toggle': '切换', 'Swap': '交换', 'Replace': '替换',
  'Insert': '插入', 'Append': '追加', 'Prepend': '前置',
  'Attach': '附加', 'Detach': '分离', 'Embed': '嵌入',
  'Extract': '提取', 'Parse': '解析', 'Format': '格式化',
  'Encode': '编码', 'Decode': '解码', 'Encrypt': '加密', 'Decrypt': '解密',
  'Compress': '压缩', 'Decompress': '解压', 'Redact': '脱敏',
  'Sanitize': '清理', 'Cleanse': '清洗', 'Purge': '清除',
  'Retry': '重试', 'Retrying': '重试中', 'Reloading': '重新加载中',
  'Reload': '重新加载', 'Resend': '重新发送', 'Rerun': '重新运行',
  'Undo': '撤销', 'Redo': '重做', 'Discard': '丢弃',
  'Browse': '浏览', 'Explore': '探索', 'Discover': '发现',
  'Navigate': '导航', 'Scroll': '滚动', 'Swipe': '滑动',
  'Tap': '点击', 'Click': '点击', 'Press': '按下',
  'Hold': '长按', 'Release': '释放', 'Trigger': '触发',
  'Run': '运行', 'Execute': '执行', 'Launch': '启动',
  'Initialize': '初始化', 'Load': '加载', 'Fetch': '获取',
  'Query': '查询', 'Lookup': '查找', 'Find': '查找',
  'Locate': '定位', 'Identify': '识别', 'Detect': '检测',
  'Scan': '扫描', 'Screen': '筛查', 'Match': '匹配',
  'Compare': '比较', 'Evaluate': '评估', 'Assess': '评估',
  'Measure': '测量', 'Count': '计数', 'Tally': '统计',
  'Aggregate': '汇总', 'Summarize': '汇总', 'Consolidate': '整合',
  'Organize': '整理', 'Categorize': '分类', 'Classify': '分类',
  'Label': '标记', 'Tag': '标签', 'Mark': '标记',
  'Annotate': '标注', 'Highlight': '高亮', 'Emphasize': '强调',
  'Focus': '聚焦', 'Prioritize': '优先处理', 'Rank': '排名',
  'Rate': '评分', 'Score': '评分', 'Grade': '评级',
  'Certify': '认证', 'Accredit': '授权', 'License': '许可',
  'Implement': '实施', 'Integrate': '集成', 'Incorporate': '纳入',
  'Adopt': '采用', 'Adapt': '适配', 'Calibrate': '校准',
  'Reconcile': '对账', 'Backfill': '补录', 'Populate': '填充',
  'Provision': '配置', 'Deprovision': '取消配置',
  'Onboard': '入职引导', 'Offboard': '离职处理',
  'Shortlist': '入围', 'Whitelist': '白名单', 'Blacklist': '黑名单',

  // --- Nouns / Labels ---
  'Error': '错误', 'Success': '成功', 'Warning': '警告', 'Info': '信息',
  'Name': '名称', 'Email': '邮箱', 'Phone': '电话', 'Status': '状态',
  'Date': '日期', 'Time': '时间', 'Description': '描述', 'Title': '标题',
  'Type': '类型', 'Priority': '优先级', 'Notes': '备注', 'Comments': '评论',
  'Settings': '设置', 'Profile': '个人资料', 'Overview': '概览',
  'Reports': '报告', 'Analytics': '分析', 'Details': '详情',
  'Summary': '摘要', 'History': '历史', 'Log': '日志', 'Logs': '日志',
  'Record': '记录', 'Records': '记录', 'Entry': '条目', 'Entries': '条目',
  'Item': '项目', 'Items': '项目', 'List': '列表', 'Table': '表格',
  'Grid': '网格', 'Card': '卡片', 'Cards': '卡片',
  'Panel': '面板', 'Tab': '标签页', 'Tabs': '标签页',
  'Section': '部分', 'Page': '页面', 'Pages': '页面',
  'View': '查看', 'Views': '视图', 'Mode': '模式',
  'Layout': '布局', 'Theme': '主题', 'Style': '样式',
  'Color': '颜色', 'Font': '字体', 'Size': '大小',
  'Width': '宽度', 'Height': '高度', 'Position': '位置',
  'Margin': '外边距', 'Padding': '内边距', 'Border': '边框',
  'Image': '图片', 'Photo': '照片', 'Video': '视频',
  'Audio': '音频', 'File': '文件', 'Files': '文件',
  'Folder': '文件夹', 'Directory': '目录', 'Path': '路径',
  'Document': '文档', 'Documents': '文档', 'Attachment': '附件',
  'Attachments': '附件', 'Template': '模板', 'Templates': '模板',
  'Draft': '草稿', 'Drafts': '草稿', 'Version': '版本',
  'Versions': '版本', 'Revision': '修订', 'Revisions': '修订',
  'Comment': '评论', 'Reaction': '回应', 'Reply': '回复',
  'Replies': '回复', 'Thread': '对话', 'Threads': '对话',
  'Chat': '聊天', 'Conversation': '对话', 'Discussion': '讨论',
  'Message': '消息', 'Messages': '消息', 'Notification': '通知',
  'Notifications': '通知', 'Alert': '警报', 'Alerts': '警报',
  'Reminder': '提醒', 'Reminders': '提醒',
  'Task': '任务', 'Tasks': '任务', 'Todo': '待办', 'Todos': '待办',
  'Ticket': '工单', 'Tickets': '工单', 'Issue': '问题', 'Issues': '问题',
  'Bug': '缺陷', 'Feature': '功能', 'Enhancement': '增强',
  'Story': '故事', 'Stories': '动态', 'Epic': '史诗',
  'Sprint': 'Sprint', 'Milestone': '里程碑', 'Milestones': '里程碑',
  'Goal': '目标', 'Goals': '目标', 'Target': '目标', 'Targets': '目标',
  'Objective': '目标', 'Objectives': '目标',
  'Result': '结果', 'Results': '结果', 'Outcome': '成果',
  'Achievement': '成就', 'Achievements': '成就', 'Badge': '徽章', 'Badges': '徽章',
  'Reward': '奖励', 'Rewards': '奖励', 'Points': '积分',
  'Level': '等级', 'Rank': '排名', 'Tier': '层级',
  'Progress': '进度', 'Completion': '完成度', 'Percentage': '百分比',
  'Score': '评分', 'Rating': '评级', 'Ratings': '评级',
  'Feedback': '反馈', 'Review': '评审', 'Reviews': '评价',
  'Assessment': '评估', 'Assessments': '评估', 'Evaluation': '评价',
  'Quiz': '测验', 'Exam': '考试', 'Test': '测试',
  'Question': '问题', 'Questions': '问题', 'Answer': '回答', 'Answers': '回答',
  'Option': '选项', 'Options': '选项', 'Choice': '选择', 'Choices': '选择',
  'Preference': '偏好', 'Preferences': '偏好设置',
  'Permission': '权限', 'Permissions': '权限',
  'Role': '角色', 'Roles': '角色', 'Access': '访问', 'Scope': '范围',
  'Account': '账户', 'Accounts': '账户', 'User': '用户', 'Users': '用户',
  'Admin': '管理员', 'Administrator': '管理员',
  'Member': '成员', 'Members': '成员', 'Owner': '所有者',
  'Manager': '经理', 'Supervisor': '主管', 'Leader': '负责人',
  'Team': '团队', 'Teams': '团队', 'Department': '部门', 'Departments': '部门',
  'Organization': '组织', 'Company': '公司', 'Companies': '公司',
  'Client': '客户', 'Clients': '客户', 'Customer': '客户', 'Customers': '客户',
  'Partner': '合作伙伴', 'Partners': '合作伙伴',
  'Vendor': '供应商', 'Supplier': '供应商',
  'Contact': '联系人', 'Contacts': '联系人',
  'Lead': '线索', 'Leads': '线索', 'Prospect': '潜在客户', 'Prospects': '潜在客户',
  'Deal': '交易', 'Deals': '交易', 'Opportunity': '商机', 'Opportunities': '商机',
  'Campaign': '活动', 'Campaigns': '推广活动',
  'Funnel': '漏斗', 'Stage': '阶段', 'Stages': '阶段',
  'Phase': '阶段', 'Step': '步骤', 'Steps': '步骤',
  'Workflow': '工作流', 'Workflows': '工作流',
  'Automation': '自动化', 'Rule': '规则', 'Rules': '规则',
  'Trigger': '触发器', 'Action': '操作', 'Actions': '操作',
  'Condition': '条件', 'Conditions': '条件',
  'Event': '事件', 'Events': '事件',
  'Calendar': '日历', 'Agenda': '日程', 'Schedule': '日程安排',
  'Meeting': '会议', 'Meetings': '会议',
  'Appointment': '预约', 'Booking': '预约', 'Bookings': '预约',
  'Slot': '时段', 'Slots': '时段', 'Availability': '可用性',
  'Interview': '面试', 'Interviews': '面试',
  'Candidate': '候选人', 'Candidates': '候选人',
  'Applicant': '申请人', 'Applicants': '申请人',
  'Application': '申请', 'Applications': '申请',
  'Resume': '简历', 'CV': '简历', 'Portfolio': '作品集',
  'Job': '职位', 'Jobs': '职位', 'Position': '岗位', 'Positions': '岗位',
  'Vacancy': '空缺', 'Opening': '空缺职位',
  'Offer': '录用通知', 'Offers': '录用通知',
  'Hiring': '招聘', 'Recruitment': '招聘', 'Talent': '人才',
  'Onboarding': '入职引导', 'Offboarding': '离职处理',
  'Salary': '薪资', 'Compensation': '薪酬', 'Benefits': '福利',
  'Bonus': '奖金', 'Commission': '佣金', 'Commissions': '佣金',
  'Payroll': '工资单', 'Payout': '付款', 'Payouts': '付款',
  'Contract': '合同', 'Contracts': '合同', 'Agreement': '协议',
  'Invoice': '发票', 'Invoices': '发票', 'Receipt': '收据',
  'Payment': '付款', 'Payments': '付款', 'Transaction': '交易',
  'Billing': '账单', 'Subscription': '订阅', 'Plan': '方案',
  'Pricing': '定价', 'Discount': '折扣', 'Coupon': '优惠券',
  'Tax': '税费', 'Fee': '费用', 'Fees': '费用', 'Cost': '成本',
  'Revenue': '收入', 'Income': '收入', 'Profit': '利润',
  'Expense': '支出', 'Expenses': '支出', 'Budget': '预算',
  'Forecast': '预测', 'Projection': '预估', 'Trend': '趋势', 'Trends': '趋势',
  'Growth': '增长', 'Decline': '下降', 'Change': '变化',
  'Increase': '增加', 'Decrease': '减少', 'Variance': '差异',
  'Metric': '指标', 'Metrics': '指标', 'Measure': '度量',
  'Indicator': '指标', 'Benchmark': '基准', 'Baseline': '基线',
  'Performance': '绩效', 'Productivity': '生产力', 'Efficiency': '效率',
  'Quality': '质量', 'Accuracy': '准确率', 'Reliability': '可靠性',
  'Uptime': '正常运行时间', 'Downtime': '停机时间', 'Latency': '延迟',
  'Throughput': '吞吐量', 'Bandwidth': '带宽', 'Capacity': '容量',
  'Utilization': '利用率', 'Coverage': '覆盖率',
  'Conversion': '转化', 'Retention': '留存', 'Churn': '流失',
  'Acquisition': '获客', 'Engagement': '互动',
  'Satisfaction': '满意度', 'Loyalty': '忠诚度',
  'Sentiment': '情感', 'Mood': '情绪', 'Tone': '语气',
  'Impact': '影响', 'Risk': '风险', 'Threat': '威胁',
  'Vulnerability': '漏洞', 'Incident': '事件', 'Incidents': '事件',
  'Breach': '泄露', 'Attack': '攻击', 'Fraud': '欺诈',
  'Compliance': '合规', 'Regulation': '法规', 'Policy': '策略',
  'Standard': '标准', 'Framework': '框架', 'Guideline': '准则',
  'Security': '安全', 'Privacy': '隐私', 'Consent': '同意',
  'Encryption': '加密', 'Token': '令牌', 'Session': '会话',
  'Authentication': '认证', 'Authorization': '授权',
  'Credential': '凭据', 'Credentials': '凭据',
  'Password': '密码', 'Passcode': '验证码',
  'Certificate': '证书', 'Certificates': '证书',
  'Key': '密钥', 'Keys': '密钥',
  'Secret': '密钥', 'Secrets': '密钥',
  'Signature': '签名', 'Fingerprint': '指纹',
  'Audit': '审计', 'Inspection': '检查', 'Investigation': '调查',
  'Finding': '发现', 'Findings': '发现',
  'Recommendation': '建议', 'Recommendations': '建议',
  'Suggestion': '建议', 'Insight': '洞察', 'Insights': '洞察',
  'Intelligence': '情报', 'Signal': '信号', 'Signals': '信号',
  'Pattern': '模式', 'Anomaly': '异常', 'Outlier': '异常值',
  'Exception': '异常', 'Deviation': '偏差',
  'Threshold': '阈值', 'Limit': '限制', 'Quota': '配额',
  'Cap': '上限', 'Floor': '下限', 'Range': '范围',
  'Min': '最小', 'Max': '最大', 'Minimum': '最小值', 'Maximum': '最大值',
  'Average': '平均', 'Mean': '均值', 'Median': '中位数',
  'Total': '总计', 'Subtotal': '小计', 'Grand Total': '总合计',
  'Sum': '合计', 'Count': '数量', 'Percentage': '百分比',
  'Ratio': '比率', 'Rate': '率', 'Index': '指数',
  'Duration': '时长', 'Frequency': '频率', 'Interval': '间隔',
  'Period': '期间', 'Cycle': '周期', 'Span': '跨度',
  'Hour': '小时', 'Hours': '小时', 'Minute': '分钟', 'Minutes': '分钟',
  'Second': '秒', 'Seconds': '秒', 'Day': '天', 'Days': '天',
  'Week': '周', 'Weeks': '周', 'Month': '月', 'Months': '月',
  'Year': '年', 'Years': '年', 'Quarter': '季度',
  'Today': '今天', 'Yesterday': '昨天', 'Tomorrow': '明天',
  'Now': '现在', 'Recently': '最近', 'Soon': '即将',
  'Morning': '上午', 'Afternoon': '下午', 'Evening': '晚上',
  'Active': '活跃', 'Inactive': '未激活', 'Pending': '待处理',
  'Approved': '已批准', 'Rejected': '已拒绝', 'Completed': '已完成',
  'Failed': '失败', 'Cancelled': '已取消', 'Canceled': '已取消',
  'Expired': '已过期', 'Suspended': '已暂停', 'Banned': '已封禁',
  'Blocked': '已屏蔽', 'Paused': '已暂停', 'Stopped': '已停止',
  'Running': '运行中', 'Started': '已开始', 'Finished': '已完成',
  'Done': '完成', 'Ready': '就绪', 'Waiting': '等待中',
  'Queued': '排队中', 'Scheduled': '已安排', 'Overdue': '已逾期',
  'Late': '迟到', 'Early': '提前', 'On Time': '准时',
  'Open': '打开', 'Closed': '已关闭', 'Resolved': '已解决',
  'Published': '已发布', 'Unpublished': '未发布',
  'Archived': '已归档', 'Deleted': '已删除', 'Removed': '已移除',
  'Hidden': '已隐藏', 'Visible': '可见', 'Public': '公开', 'Private': '私密',
  'Internal': '内部', 'External': '外部', 'Custom': '自定义',
  'Default': '默认', 'Required': '必填', 'Optional': '可选',
  'Enabled': '已启用', 'Disabled': '已禁用',
  'Connected': '已连接', 'Disconnected': '已断开',
  'Online': '在线', 'Offline': '离线', 'Away': '离开',
  'Available': '可用', 'Unavailable': '不可用', 'Busy': '忙碌',
  'New': '新建', 'Old': '旧的', 'Recent': '最近',
  'Updated': '已更新', 'Modified': '已修改', 'Changed': '已更改',
  'Created': '已创建', 'Added': '已添加', 'Saved': '已保存',
  'Sent': '已发送', 'Received': '已接收', 'Read': '已读', 'Unread': '未读',
  'Seen': '已查看', 'Unseen': '未查看', 'Starred': '已收藏',
  'Pinned': '已置顶', 'Flagged': '已标记', 'Marked': '已标记',
  'Selected': '已选择', 'Checked': '已选中', 'Unchecked': '未选中',
  'Verified': '已验证', 'Unverified': '未验证',
  'Confirmed': '已确认', 'Accepted': '已接受',
  'Shared': '已共享', 'Linked': '已链接',
  'Uploaded': '已上传', 'Downloaded': '已下载',
  'Synced': '已同步', 'Imported': '已导入', 'Exported': '已导出',
  'Processed': '已处理', 'Analyzed': '已分析',
  'Assigned': '已分配', 'Unassigned': '未分配',
  'Claimed': '已认领', 'Unclaimed': '未认领',
  'Enrolled': '已报名', 'Graduated': '已毕业',
  'Hired': '已录用', 'Placed': '已安置', 'Terminated': '已终止',

  // --- UI Labels ---
  'All': '全部', 'None': '无', 'Yes': '是', 'No': '否',
  'True': '是', 'False': '否', 'On': '开', 'Off': '关',
  'More': '更多', 'Less': '更少', 'Other': '其他', 'Others': '其他',
  'Unknown': '未知', 'N/A': '不适用', 'TBD': '待定',
  'Empty': '空', 'Blank': '空白', 'Null': '空值',
  'Low': '低', 'Medium': '中', 'High': '高', 'Critical': '关键',
  'Urgent': '紧急', 'Normal': '正常', 'Minor': '次要', 'Major': '重要',
  'Ascending': '升序', 'Descending': '降序',
  'First': '第一', 'Last': '最后', 'Latest': '最新',
  'Newest': '最新', 'Oldest': '最早',
  'Top': '顶部', 'Bottom': '底部', 'Left': '左', 'Right': '右',
  'Center': '中心', 'Middle': '中间',
  'Header': '页头', 'Footer': '页脚', 'Sidebar': '侧边栏',
  'Toolbar': '工具栏', 'Menu': '菜单', 'Submenu': '子菜单',
  'Breadcrumb': '面包屑导航', 'Navigation': '导航',
  'Home': '首页', 'Dashboard': '仪表盘',
  'Inbox': '收件箱', 'Outbox': '发件箱', 'Sent': '已发送',
  'Spam': '垃圾邮件', 'Trash': '回收站',
  'Label': '标签', 'Labels': '标签',
  'Category': '分类', 'Categories': '分类',
  'Subcategory': '子分类',
  'Topic': '主题', 'Topics': '主题',
  'Subject': '主题', 'Body': '正文', 'Content': '内容',
  'Link': '链接', 'Links': '链接',
  'Button': '按钮', 'Icon': '图标', 'Badge': '徽章',
  'Tooltip': '提示', 'Popup': '弹窗', 'Modal': '弹窗',
  'Dialog': '对话框', 'Drawer': '抽屉', 'Dropdown': '下拉菜单',
  'Picker': '选择器', 'Selector': '选择器', 'Chooser': '选择器',
  'Slider': '滑块', 'Switch': '开关', 'Checkbox': '复选框',
  'Input': '输入', 'Output': '输出',
  'Form': '表单', 'Field': '字段', 'Column': '列', 'Row': '行',
  'Cell': '单元格', 'Placeholder': '占位符',
  'Heading': '标题', 'Subtitle': '副标题', 'Caption': '说明文字',
  'Text': '文本', 'String': '字符串', 'Number': '数字',
  'Boolean': '布尔值', 'Array': '数组', 'Object': '对象',
  'Map': '映射', 'Set': '集合',
  'Chart': '图表', 'Graph': '图形', 'Diagram': '图示',
  'Visualization': '可视化', 'Heatmap': '热力图',
  'Timeline': '时间线', 'Gantt': '甘特图',
  'Pie': '饼图', 'Bar': '柱状图', 'Line': '折线图',
  'Area': '面积图', 'Scatter': '散点图',
  'Gauge': '仪表盘', 'Meter': '仪表',
  'Widget': '组件', 'Component': '组件', 'Module': '模块',
  'Plugin': '插件', 'Extension': '扩展', 'Addon': '附加组件',
  'Integration': '集成', 'Connector': '连接器',
  'Workspace': '工作区', 'Environment': '环境',
  'Instance': '实例', 'Cluster': '集群', 'Node': '节点',
  'Service': '服务', 'Endpoint': '端点', 'Route': '路由',

  // --- HR/Recruitment Domain ---
  'Recruiter': '招聘官', 'Recruiters': '招聘官',
  'Strategist': '策略师', 'Strategists': '策略师',
  'Employer': '雇主', 'Employee': '员工', 'Employees': '员工',
  'Staff': '员工', 'Workforce': '劳动力',
  'Freelancer': '自由职业者', 'Contractor': '承包商',
  'Consultant': '顾问', 'Advisor': '顾问',
  'Intern': '实习生', 'Trainee': '学员',
  'Placement': '安置', 'Placements': '安置',
  'Referral': '推荐', 'Referrals': '推荐',
  'Headcount': '编制', 'FTE': '全职当量',
  'Pipeline': 'Pipeline', 'Funnel': '漏斗',
  'Sourcing': '寻访', 'Screening': '筛选',
  'Shortlisted': '已入围', 'Longlist': '初选名单',
  'Offer Letter': '录用通知书', 'Employment': '雇佣',
  'Probation': '试用期', 'Notice Period': '通知期',
  'Background Check': '背景调查', 'Reference Check': '背景推荐调查',
  'Skills': '技能', 'Skill': '技能',
  'Experience': '经验', 'Expertise': '专业能力',
  'Qualification': '资质', 'Qualifications': '资质',
  'Education': '教育', 'Degree': '学位',
  'Certification': '认证', 'Certifications': '认证',
  'Industry': '行业', 'Sector': '行业',
  'Market': '市场', 'Marketplace': '市场',
  'Workspace': '工作区', 'Remote': '远程', 'Hybrid': '混合办公',
  'Full-time': '全职', 'Part-time': '兼职',
  'Temporary': '临时', 'Permanent': '正式',
  'Seniority': '资历', 'Junior': '初级', 'Senior': '高级',
  'Mid-level': '中级', 'Executive': '高管', 'C-level': '高管层',
  'Leadership': '领导力', 'Management': '管理',
  'Culture': '文化', 'Values': '价值观', 'Mission': '使命',
  'Vision': '愿景', 'Strategy': '战略',
  'Diversity': '多元化', 'Inclusion': '包容性', 'Equity': '公平',

  // --- Communication ---
  'Inbox': '收件箱', 'Outreach': '外联', 'Follow-up': '跟进',
  'Touchpoint': '接触点', 'Interaction': '互动',
  'Response': '回复', 'Response Time': '响应时间',
  'Open Rate': '打开率', 'Click Rate': '点击率',
  'Bounce Rate': '跳出率', 'Delivery': '投递',
  'Deliverability': '投递率', 'Unsubscribe': '退订',
  'Sequence': '序列', 'Cadence': '节奏',
  'Personalization': '个性化', 'Segmentation': '分群',
  'Audience': '受众', 'Recipient': '收件人', 'Recipients': '收件人',
  'Sender': '发件人', 'CC': '抄送', 'BCC': '密送',

  // --- Finance ---
  'Receivable': '应收款', 'Payable': '应付款',
  'Balance': '余额', 'Credit': '贷方', 'Debit': '借方',
  'Refund': '退款', 'Chargeback': '退单',
  'Reconciliation': '对账', 'Ledger': '账簿',
  'Fiscal': '财务', 'Quarterly': '季度',
  'Annual': '年度', 'Monthly': '月度', 'Weekly': '每周',
  'Accrual': '应计', 'Depreciation': '折旧',
  'Asset': '资产', 'Assets': '资产', 'Liability': '负债',
  'Equity': '权益', 'Valuation': '估值',

  // --- Technical / System ---
  'System': '系统', 'Server': '服务器', 'Database': '数据库',
  'Cache': '缓存', 'Queue': '队列', 'Worker': '工作进程',
  'Process': '进程', 'Thread': '线程', 'Connection': '连接',
  'Request': '请求', 'Response': '响应',
  'Payload': '有效负载', 'Header': '请求头',
  'Parameter': '参数', 'Variable': '变量',
  'Function': '函数', 'Method': '方法', 'Class': '类',
  'Interface': '接口', 'Schema': '模式',
  'Migration': '迁移', 'Backup': '备份', 'Snapshot': '快照',
  'Rollback': '回滚', 'Deployment': '部署',
  'Release': '发布', 'Build': '构建', 'Compile': '编译',
  'Debug': '调试', 'Staging': '预发布', 'Production': '生产环境',
  'Development': '开发', 'Testing': '测试',
  'Monitor': '监控', 'Health': '健康', 'Healthy': '健康',
  'Unhealthy': '不健康', 'Degraded': '降级',
  'Timeout': '超时', 'Error Rate': '错误率',
  'Success Rate': '成功率', 'Failure Rate': '失败率',
  'Circuit Breaker': '熔断器', 'Rate Limit': '速率限制',
  'Throttle': '节流', 'Retry Logic': '重试逻辑',
  'Fallback': '降级方案', 'Recovery': '恢复',
  'Disaster Recovery': '灾难恢复', 'Failover': '故障转移',
  'Load Balancer': '负载均衡器', 'Proxy': '代理',
  'Gateway': '网关', 'Firewall': '防火墙',
  'Whitelist': '白名单', 'Blocklist': '黑名单',
  'Configuration': '配置', 'Config': '配置',
};

// ============================================================================
// PHRASE-LEVEL DICTIONARY (700+ common phrases)
// ============================================================================
const PHRASE_DICT = {
  // --- Common UI phrases ---
  'No results found': '未找到结果',
  'No results': '无结果',
  'Are you sure?': '您确定吗？',
  'Are you sure you want to': '您确定要',
  'Loading...': '加载中...',
  'Something went wrong': '出了些问题',
  'Please try again': '请重试',
  'Please try again later': '请稍后重试',
  'No data available': '暂无数据',
  'No data': '暂无数据',
  'View all': '查看全部',
  'View All': '查看全部',
  'Save changes': '保存更改',
  'Save Changes': '保存更改',
  'Select all': '全选',
  'Select All': '全选',
  'Clear all': '清除全部',
  'Clear All': '清除全部',
  'Sign in': '登录',
  'Sign In': '登录',
  'Sign out': '退出登录',
  'Sign Out': '退出登录',
  'Log in': '登录',
  'Log In': '登录',
  'Log out': '退出登录',
  'Log Out': '退出登录',
  'Go back': '返回',
  'Go Back': '返回',
  'Learn more': '了解更多',
  'Learn More': '了解更多',
  'Read more': '阅读更多',
  'Read More': '阅读更多',
  'See more': '查看更多',
  'See More': '查看更多',
  'Show more': '显示更多',
  'Show More': '显示更多',
  'Show less': '收起',
  'Show Less': '收起',
  'See all': '查看全部',
  'See All': '查看全部',
  'All caught up': '已全部处理',
  'No pending tasks': '没有待处理的任务',
  'Active Jobs': '活跃职位',
  'Top Performers': '最佳表现者',
  'View Calendar': '查看日历',
  'Quick Launch': '快速启动',
  'Getting started': '开始使用',
  'Get started': '开始使用',
  'Get Started': '开始使用',
  'Coming soon': '即将推出',
  'Coming Soon': '即将推出',
  'Under development': '开发中',
  'Under Development': '开发中',
  'Not available': '暂不可用',
  'Not Available': '暂不可用',
  'Try again': '重试',
  'Try Again': '重试',
  'Reload page': '重新加载页面',
  'Reload Page': '重新加载页面',
  'Contact support': '联系客服',
  'Contact Support': '联系客服',
  'Contact us': '联系我们',
  'Help Center': '帮助中心',
  'Support Tickets': '客服工单',
  'Submit Ticket': '提交工单',
  'Leave meeting': '离开会议',
  'Leave Meeting': '离开会议',
  'Join now': '立即加入',
  'Join Now': '立即加入',
  'Join meeting': '加入会议',
  'Join Meeting': '加入会议',
  'Send message': '发送消息',
  'Send Message': '发送消息',
  'Voice message': '语音消息',
  'Voice Message': '语音消息',
  'Upload image': '上传图片',
  'Upload Image': '上传图片',
  'Upload file': '上传文件',
  'Upload File': '上传文件',
  'Mute sounds': '静音',
  'Enable sounds': '开启声音',
  'Stop recording': '停止录制',
  'Stop generation': '停止生成',
  'Toggle sidebar': '切换侧边栏',
  'Toggle Sidebar': '切换侧边栏',
  'Retry loading sidebar': '重新加载侧边栏',
  'New message': '新消息',
  'New Message': '新消息',
  'No messages': '暂无消息',
  'No Messages': '暂无消息',
  'No notifications': '暂无通知',
  'No Notifications': '暂无通知',
  'Mark as read': '标为已读',
  'Mark as Read': '标为已读',
  'Mark all as read': '全部标为已读',
  'Mark All as Read': '全部标为已读',
  'Delete all': '全部删除',
  'Delete All': '全部删除',
  'Clear filters': '清除筛选',
  'Clear Filters': '清除筛选',
  'Reset filters': '重置筛选',
  'Reset Filters': '重置筛选',
  'Apply filters': '应用筛选',
  'Apply Filters': '应用筛选',
  'No items found': '未找到项目',
  'No items': '暂无项目',
  'Add new': '新增',
  'Add New': '新增',
  'Create new': '新建',
  'Create New': '新建',
  'Edit profile': '编辑个人资料',
  'Edit Profile': '编辑个人资料',
  'View profile': '查看个人资料',
  'View Profile': '查看个人资料',
  'View details': '查看详情',
  'View Details': '查看详情',
  'View more': '查看更多',
  'View More': '查看更多',
  'per page': '每页',
  'Per Page': '每页',
  'rows per page': '每页行数',
  'Rows per page': '每页行数',
  'items per page': '每页条数',
  'of': '共',
  'to': '至',
  'Showing': '显示',
  'Displaying': '显示',
  'results': '条结果',
  'entries': '条目',
  'selected': '已选择',
  'items selected': '项已选择',
  'item selected': '项已选择',
  'out of': '共',
  'Loading data': '加载数据中',
  'Loading data...': '加载数据中...',
  'Saving...': '保存中...',
  'Processing...': '处理中...',
  'Uploading...': '上传中...',
  'Downloading...': '下载中...',
  'Deleting...': '删除中...',
  'Updating...': '更新中...',
  'Syncing...': '同步中...',
  'Sending...': '发送中...',
  'Generating...': '生成中...',
  'Verifying...': '验证中...',
  'Searching...': '搜索中...',
  'Fetching...': '获取中...',
  'Connecting...': '连接中...',
  'Initializing...': '初始化中...',
  'Preparing...': '准备中...',
  'Importing...': '导入中...',
  'Exporting...': '导出中...',
  'Analyzing...': '分析中...',
  'Calculating...': '计算中...',
  'Retrying...': '重试中...',
  'Reloading...': '重新加载中...',
  'Refreshing...': '刷新中...',
  'Please wait...': '请稍候...',
  'Please wait': '请稍候',
  'Just a moment...': '请稍候...',
  'Almost done...': '即将完成...',
  'Successfully saved': '保存成功',
  'Successfully created': '创建成功',
  'Successfully updated': '更新成功',
  'Successfully deleted': '删除成功',
  'Successfully sent': '发送成功',
  'Successfully uploaded': '上传成功',
  'Successfully imported': '导入成功',
  'Successfully exported': '导出成功',
  'Changes saved': '更改已保存',
  'Changes saved successfully': '更改已成功保存',
  'Operation completed': '操作完成',
  'Action completed': '操作完成',
  'Request sent': '请求已发送',
  'Request failed': '请求失败',
  'Connection error': '连接错误',
  'Network error': '网络错误',
  'Server error': '服务器错误',
  'Unknown error': '未知错误',
  'An error occurred': '发生了错误',
  'An unexpected error occurred': '发生了意外错误',
  'Permission denied': '权限不足',
  'Access denied': '访问被拒绝',
  'Unauthorized': '未授权',
  'Forbidden': '禁止访问',
  'Not found': '未找到',
  'Page not found': '页面未找到',
  'Session expired': '会话已过期',
  'Invalid input': '输入无效',
  'Required field': '必填字段',
  'This field is required': '此字段为必填项',
  'Invalid email': '邮箱格式无效',
  'Invalid format': '格式无效',
  'Too short': '太短',
  'Too long': '太长',
  'Confirm delete': '确认删除',
  'Confirm Delete': '确认删除',
  'Are you sure you want to delete this?': '您确定要删除吗？',
  'This action cannot be undone': '此操作无法撤销',
  'This action cannot be undone.': '此操作无法撤销。',
  'Permanently delete': '永久删除',
  'Move to trash': '移至回收站',
  'Undo': '撤销',
  'No changes': '无更改',
  'Unsaved changes': '未保存的更改',
  'You have unsaved changes': '您有未保存的更改',
  'Discard changes': '丢弃更改',
  'Discard Changes': '丢弃更改',
  'Keep editing': '继续编辑',
  'Last updated': '最近更新',
  'Last modified': '最近修改',
  'Created at': '创建于',
  'Updated at': '更新于',
  'Modified at': '修改于',
  'Powered by': '由...提供支持',
  'Built with': '基于...构建',
  'Version': '版本',
  'About': '关于',
  'Feedback': '反馈',
  'Report a bug': '报告问题',
  'Request a feature': '功能建议',
  'Documentation': '文档',
  'Privacy Policy': '隐私政策',
  'Terms of Service': '服务条款',
  'Cookie Policy': 'Cookie 政策',
  'Cookie policy': 'Cookie 政策',
  'End User License Agreement': '最终用户许可协议',

  // --- Navigation phrases ---
  'All Pages': '所有页面',
  'My Profile': '我的个人资料',
  'My Skills': '我的技能',
  'My Performance': '我的绩效',
  'My Analytics': '我的分析',
  'My Communications': '我的通讯',
  'My Proposals': '我的提案',
  'My Contracts': '我的合同',
  'My Settings': '我的设置',
  'Email Settings': '邮箱设置',
  'Admin Panel': '管理面板',
  'Meeting Intelligence': '会议智能分析',
  'Cover Letter Builder': '求职信生成器',
  'Referrals & Invites': '推荐与邀请',
  'Browse Projects': '浏览项目',
  'Freelancer Setup': '自由职业者设置',
  'Gig Marketplace': '零工市场',
  'Social Feed': '社交动态',
  'Partner Hub': '合作伙伴中心',
  'Post Project': '发布项目',
  'Find Talent': '发现人才',
  'Expert Marketplace': '专家市场',
  'Reply Inbox': '回复收件箱',
  'Partner Funnel': '合作伙伴漏斗',
  'Partner Relationships': '合作伙伴关系',
  'Relationships Dashboard': '关系仪表盘',
  'User Management': '用户管理',
  'Talent Pool': '人才库',
  'Talent Lists': '人才列表',
  'All Candidates': '全部候选人',
  'All Jobs': '全部职位',
  'Job Approvals': '职位审批',
  'Job Board Distribution': '职位发布分发',
  'All Companies': '全部公司',
  'Target Companies': '目标公司',
  'Member Management': '成员管理',
  'Interview Kits': '面试工具包',
  'Background Checks': '背景调查',
  'Employee Onboarding': '员工入职引导',
  'Pipeline Stages': 'Pipeline 阶段',
  'Offer Management': '录用管理',
  'Job Templates': '职位模板',
  'Candidate Scheduling': '候选人排期',
  'Scorecard Library': '评分卡库',
  'Assessments Hub': '评估中心',
  'Global Analytics': '全局分析',
  'Performance Hub': '绩效中心',
  'Communication Hub': '通讯中心',
  'Meeting Analytics': '会议分析',
  'Time to Fill': '招聘周期',
  'Recruiter Productivity': '招聘官生产力',
  'Source ROI': '渠道 ROI',
  'Email Analytics': '邮件分析',
  'Feature Control Center': '功能控制中心',
  'Employee Dashboard': '员工仪表盘',
  'System Health': '系统健康',
  'Bulk Operations': '批量操作',
  'Custom Fields': '自定义字段',
  'Workflow Builder': '工作流构建器',
  'Approval Chains': '审批链',
  'Notifications Config': '通知配置',
  'Report Builder': '报告构建器',
  'Avatar Traffic Control': '虚拟身份流量管控',
  'Page Templates': '页面模板',
  'Blog Engine': '博客引擎',
  'Email Builder': '邮件构建器',
  'Headcount Planning': '编制规划',
  'Security Hub': '安全中心',
  'Session Management': '会话管理',
  'Custom Roles': '自定义角色',
  'Status Page': '状态页面',
  'Finance Hub': '财务中心',
  'Inventory Hub': '资产中心',
  'Usage Metering': '用量计量',
  'Customer Health': '客户健康度',
  'Compliance Hub': '合规中心',
  'Consent Management': '许可管理',
  'Enterprise Management': '企业管理',
  'Due Diligence Center': '尽职调查中心',
  'Risk Management': '风险管理',
  'Translations Hub': '翻译中心',
  'Data Retention': '数据保留',
  'Investor Metrics': '投资者指标',
  'Developer Portal': '开发者门户',
  'Integration Marketplace': '集成市场',
  'All Projects': '全部项目',
  'All Proposals': '全部提案',
  'Social Management': '社交管理',

  // --- Navigation groups ---
  'Communication': '通讯', 'Learning': '学习',
  'AI & Tools': 'AI 与工具', 'OS Notes': 'OS 备注',
  'Career': '职业', 'Club Projects': 'Club 项目',
  'Social': '社交', 'CRM & Outreach': 'CRM 与外联',
  'Partnerships': '合作伙伴', 'Talent Management': '人才管理',
  'Assessments & Games': '评估与游戏',
  'Analytics & Intelligence': '分析与情报',
  'Agentic OS': 'Agentic OS', 'Operations': '运维',
  'Security & Monitoring': '安全与监控',
  'Finance': '财务', 'Governance': '治理',
  'Developer': '开发者',

  // --- Status messages ---
  'Releasing soon': '即将发布',
  'This feature is currently under development.': '此功能正在开发中。',
  'This feature is currently under development': '此功能正在开发中',
  'No description available': '暂无描述',
  'No description': '暂无描述',
  'No items to display': '暂无可显示的项目',
  'Nothing to show': '暂无内容',
  'Nothing here yet': '暂无内容',
  'No recent activity': '暂无近期活动',
  'No upcoming events': '暂无即将到来的事件',
  'No upcoming meetings': '暂无即将到来的会议',

  // --- Table / Grid ---
  'Sort by': '排序方式',
  'Sort By': '排序方式',
  'Group by': '分组方式',
  'Group By': '分组方式',
  'Filter by': '筛选条件',
  'Filter By': '筛选条件',
  'Order by': '排序',
  'Search by': '按...搜索',
  'Search by name': '按名称搜索',
  'Search by email': '按邮箱搜索',
  'Search by name or email': '按名称或邮箱搜索',
  'Search by name, email or location': '按名称、邮箱或位置搜索',
  'Filter by status': '按状态筛选',
  'Filter by role': '按角色筛选',
  'Filter by type': '按类型筛选',
  'Filter by date': '按日期筛选',
  'Filter by category': '按分类筛选',
  'All statuses': '全部状态',
  'All Statuses': '全部状态',
  'All roles': '全部角色',
  'All types': '全部类型',
  'All categories': '全部分类',
  'No records found': '未找到记录',
  'No records': '暂无记录',

  // --- Admin phrases ---
  'View as candidate': '以候选人身份查看',
  'View as Candidate': '以候选人身份查看',
  'Edit user': '编辑用户',
  'Edit User': '编辑用户',
  'View user': '查看用户',
  'View User': '查看用户',
  'Open in new tab': '在新标签页中打开',
  'Open in New Tab': '在新标签页中打开',
  'Candidates exported': '候选人已导出',
  'Company members': '公司成员',
  'Company Members': '公司成员',
  'Loading partners': '加载合作伙伴中',
  'Loading partners...': '加载合作伙伴中...',
  'No partners found': '未找到合作伙伴',
  'No company': '无公司',
  'Loading...': '加载中...',
  'New users': '新用户',
  'Strong growth': '强劲增长',
  'Strong Growth': '强劲增长',
  'Salary range': '薪资范围',
  'Salary Range': '薪资范围',
  'Last login': '上次登录',
  'Last Login': '上次登录',

  // --- Meeting phrases ---
  'Start meeting': '开始会议',
  'Start Meeting': '开始会议',
  'End meeting': '结束会议',
  'End Meeting': '结束会议',
  'Schedule meeting': '安排会议',
  'Schedule Meeting': '安排会议',
  'Meeting scheduled': '会议已安排',
  'Meeting cancelled': '会议已取消',
  'Meeting notes': '会议记录',
  'Meeting Notes': '会议记录',
  'No meetings scheduled': '暂无已安排的会议',
  'Upcoming meetings': '即将到来的会议',
  'Past meetings': '过去的会议',
  'Meeting recording': '会议录制',
  'Meeting transcript': '会议记录',

  // --- Job phrases ---
  'Post a job': '发布职位',
  'Post a Job': '发布职位',
  'Job posted': '职位已发布',
  'Job description': '职位描述',
  'Job Description': '职位描述',
  'Job title': '职位名称',
  'Job Title': '职位名称',
  'Job type': '职位类型',
  'Job Type': '职位类型',
  'Full time': '全职',
  'Full Time': '全职',
  'Part time': '兼职',
  'Part Time': '兼职',
  'Work from home': '居家办公',
  'On-site': '现场办公',
  'Apply now': '立即申请',
  'Apply Now': '立即申请',
  'Save job': '收藏职位',
  'Save Job': '收藏职位',
  'Saved jobs': '已收藏的职位',
  'Saved Jobs': '已收藏的职位',
  'Similar jobs': '相似职位',
  'Similar Jobs': '相似职位',
  'Recommended jobs': '推荐职位',
  'Recommended Jobs': '推荐职位',
  'Active jobs': '活跃职位',

  // --- Candidate phrases ---
  'Add candidate': '添加候选人',
  'Add Candidate': '添加候选人',
  'Edit candidate': '编辑候选人',
  'Candidate profile': '候选人档案',
  'Candidate Profile': '候选人档案',
  'Candidate status': '候选人状态',
  'Upload resume': '上传简历',
  'Upload Resume': '上传简历',
  'Download resume': '下载简历',

  // --- Calendar phrases ---
  'New event': '新建事件',
  'All day': '全天',
  'Add to calendar': '添加到日历',
  'Time zone': '时区',
  'Time Zone': '时区',
  'Business hours': '工作时间',
  'Business Hours': '工作时间',
  'Out of office': '不在办公室',

  // --- Profile fields ---
  'First name': '名', 'First Name': '名',
  'Last name': '姓', 'Last Name': '姓',
  'Full name': '全名', 'Full Name': '全名',
  'Display name': '显示名称', 'Display Name': '显示名称',
  'Phone number': '电话号码', 'Phone Number': '电话号码',
  'Email address': '邮箱地址', 'Email Address': '邮箱地址',
  'Date of birth': '出生日期', 'Date of Birth': '出生日期',
  'Country': '国家', 'City': '城市', 'State': '州/省',
  'Address': '地址', 'Zip code': '邮编', 'Zip Code': '邮编',
  'Bio': '个人简介', 'About me': '关于我', 'About Me': '关于我',
  'Website': '网站', 'Social links': '社交链接',
  'Profile picture': '头像', 'Profile Picture': '头像',
  'Cover photo': '封面照片', 'Cover Photo': '封面照片',
  'Avatar': '头像',

  // --- CRM / Sales ---
  'Add prospect': '添加潜在客户',
  'Add Prospect': '添加潜在客户',
  'Deal value': '交易金额',
  'Deal Value': '交易金额',
  'Close date': '预计成交日期',
  'Close Date': '预计成交日期',
  'Win rate': '赢单率',
  'Win Rate': '赢单率',
  'Loss reason': '丢单原因',
  'Loss Reason': '丢单原因',
  'Next action': '下一步操作',
  'Next Action': '下一步操作',
  'Pipeline value': 'Pipeline 价值',
  'Weighted pipeline': '加权 Pipeline',
  'Lead score': '线索评分',
  'Lead Score': '线索评分',
  'Lead source': '线索来源',
  'Lead Source': '线索来源',
  'Sales cycle': '销售周期',
  'Deal stage': '交易阶段',
  'Conversion rate': '转化率',
  'Conversion Rate': '转化率',
  'Revenue forecast': '收入预测',
  'Account health': '客户健康度',
  'Customer lifetime value': '客户终身价值',
  'Churn rate': '流失率',
  'Retention rate': '留存率',

  // --- Security / Settings ---
  'Change password': '修改密码',
  'Change Password': '修改密码',
  'Two-factor authentication': '双因素认证',
  'Two-Factor Authentication': '双因素认证',
  'Enable 2FA': '启用双因素认证',
  'Login history': '登录历史',
  'Active sessions': '活跃会话',
  'Trusted devices': '信任设备',
  'API keys': 'API 密钥',
  'Access token': '访问令牌',
  'Audit log': '审计日志',
  'Audit Log': '审计日志',
  'Security alerts': '安全警报',
  'Rate limiting': '速率限制',

  // --- Misc common phrases ---
  'Drag and drop': '拖放',
  'Drag to reorder': '拖动以重新排序',
  'Click to expand': '点击展开',
  'Click to collapse': '点击收起',
  'Scroll to top': '回到顶部',
  'Back to top': '回到顶部',
  'Step 1': '第 1 步', 'Step 2': '第 2 步', 'Step 3': '第 3 步',
  'Step 4': '第 4 步', 'Step 5': '第 5 步',
  'step': '步骤', 'steps': '步骤',
  'without': '无',
  'until': '直到', 'since': '自从',
  'before': '之前', 'after': '之后',
  'between': '之间', 'above': '以上', 'below': '以下',
  'more than': '超过', 'less than': '少于',
  'at least': '至少', 'at most': '最多',
  'up to': '最多', 'no more than': '不超过',
  'every': '每个',
  'never': '从不', 'always': '始终', 'sometimes': '有时',
  'often': '经常', 'rarely': '很少', 'once': '一次',
  'twice': '两次', 'daily': '每天', 'weekly': '每周',
  'monthly': '每月', 'yearly': '每年', 'annually': '每年',
  'remaining': '剩余', 'elapsed': '已经过',
  'available': '可用',
  'total': '总计', 'current': '当前', 'previous': '上一个',
  'Never': '从不',
  'Missing': '缺少',
  'Joined': '加入时间',
  'Unsuspend': '解除暂停',
};

// Words that should NEVER be substituted inside other words via compositional translation
// These are too short / ambiguous and cause "Fav或ites", "Schedul在g" type bugs
const SKIP_COMPOSITIONAL = new Set([
  'in', 'In', 'or', 'Or', 'at', 'At', 'on', 'On', 'by', 'By',
  'to', 'To', 'of', 'Of', 'for', 'For', 'and', 'And', 'an', 'An',
  'as', 'As', 'if', 'If', 'is', 'Is', 'it', 'It', 'do', 'Do',
  'go', 'Go', 'no', 'No', 'so', 'So', 'up', 'Up', 'we', 'We',
  'be', 'Be', 'he', 'He', 'me', 'Me', 'my', 'My', 'us', 'Us',
  'am', 'Am', 'a', 'A', 'I',
  'per', 'Per', 'each', 'the', 'The', 'with', 'With', 'from', 'From',
  // These short words cause mid-word replacements
  'ago', 'are', 'but', 'can', 'did', 'get', 'got', 'had', 'has', 'her',
  'him', 'his', 'how', 'its', 'let', 'may', 'new', 'not', 'now', 'old',
  'one', 'our', 'out', 'own', 'put', 'ran', 'run', 'say', 'set', 'she',
  'the', 'too', 'try', 'two', 'use', 'was', 'way', 'who', 'why', 'yet',
  'you', 'her', 'off',
]);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a string contains any Chinese characters
 */
function containsChinese(str) {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(str);
}

/**
 * Check if a string is purely English (no Chinese characters)
 */
function isPureEnglish(str) {
  // Remove {{variables}}, HTML tags, numbers, punctuation
  const cleaned = str
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[0-9.,!?;:'"()\-\[\]{}@#$%^&*+=|\\/<>~`_]/g, '')
    .trim();
  if (!cleaned) return false;
  return !containsChinese(cleaned);
}

/**
 * Check if a string is mixed English/Chinese (broken translation)
 */
function isMixedBroken(str) {
  if (!containsChinese(str)) return false;
  // Remove {{variables}}, HTML tags, brand names
  let cleaned = str;
  cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  for (const brand of BRAND_NAMES) {
    cleaned = cleaned.replace(new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
  }
  for (const tech of KEEP_ENGLISH) {
    cleaned = cleaned.replace(new RegExp('\\b' + tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), '');
  }
  cleaned = cleaned.replace(/[0-9.,!?;:'"()\-\[\]{}@#$%^&*+=|\\/<>~`_\s]/g, '');

  const hasEng = /[a-zA-Z]{2,}/.test(cleaned);
  const hasCN = containsChinese(cleaned);
  return hasEng && hasCN;
}

/**
 * Translate a single English string to Chinese using dictionary lookup
 */
function translateString(enValue) {
  if (typeof enValue !== 'string') return null;

  // Preserve empty strings
  if (!enValue.trim()) return enValue;

  // 1. Exact phrase match first (most reliable)
  if (PHRASE_DICT[enValue]) return PHRASE_DICT[enValue];

  // 2. Exact word match
  if (WORD_DICT[enValue]) return WORD_DICT[enValue];

  // 3. Common suffix patterns
  // "Xing..." -> "X中..."
  const progressMatch = enValue.match(/^(.+)(ing)\.{3}$/);
  if (progressMatch) {
    const base = progressMatch[1];
    const baseTranslated = WORD_DICT[base] || WORD_DICT[base + 'e'] || WORD_DICT[base + progressMatch[1].slice(-1)];
    if (baseTranslated) return baseTranslated + '中...';
  }

  // 4. "No X found" pattern
  const noFoundMatch = enValue.match(/^No (.+?) found\.?$/i);
  if (noFoundMatch) {
    const noun = noFoundMatch[1];
    const nounZh = WORD_DICT[noun] || WORD_DICT[noun.charAt(0).toUpperCase() + noun.slice(1)] || noun;
    return `未找到${nounZh}`;
  }

  // 5. "No X available" pattern
  const noAvailMatch = enValue.match(/^No (.+?) available\.?$/i);
  if (noAvailMatch) {
    const noun = noAvailMatch[1];
    const nounZh = WORD_DICT[noun] || WORD_DICT[noun.charAt(0).toUpperCase() + noun.slice(1)] || noun;
    return `暂无可用${nounZh}`;
  }

  // 6. "X successfully" pattern
  const successMatch = enValue.match(/^(.+?) successfully\.?$/i);
  if (successMatch) {
    const action = successMatch[1];
    const actionZh = WORD_DICT[action] || PHRASE_DICT[action];
    if (actionZh) return `${actionZh}成功`;
  }

  // 7. "Failed to X" pattern
  const failedMatch = enValue.match(/^Failed to (.+?)\.?$/i);
  if (failedMatch) {
    const action = failedMatch[1];
    const actionZh = translateCompositional(action);
    return `${actionZh}失败`;
  }

  // 8. "Unable to X" pattern
  const unableMatch = enValue.match(/^Unable to (.+?)\.?$/i);
  if (unableMatch) {
    const action = unableMatch[1];
    const actionZh = translateCompositional(action);
    return `无法${actionZh}`;
  }

  // 9. "X has been Y" pattern
  const hasBeenMatch = enValue.match(/^(.+?) has been (.+?)\.?$/i);
  if (hasBeenMatch) {
    const subject = hasBeenMatch[1];
    const action = hasBeenMatch[2];
    const subjectZh = translateCompositional(subject);
    const actionZh = WORD_DICT[action] || WORD_DICT[action.charAt(0).toUpperCase() + action.slice(1)] || action;
    return `${subjectZh}已${actionZh}`;
  }

  // 10. Try compositional translation (word by word)
  return translateCompositional(enValue);
}

/**
 * Compositional translation: translate word by word / phrase by phrase
 * Uses a tokenize-then-translate approach to avoid mid-word replacements
 */
function translateCompositional(enValue) {
  if (typeof enValue !== 'string') return enValue;

  // Protect {{variables}} and HTML tags by replacing with placeholders
  const placeholders = [];
  let protected_ = enValue;
  protected_ = protected_.replace(/\{\{[^}]+\}\}/g, (m) => {
    placeholders.push(m);
    return `__PH${placeholders.length - 1}__`;
  });
  protected_ = protected_.replace(/<[^>]+>/g, (m) => {
    placeholders.push(m);
    return `__PH${placeholders.length - 1}__`;
  });

  // Try exact multi-word phrase matches first (longest first, case-insensitive)
  // But ONLY match at word boundaries
  const sortedPhrases = Object.entries(PHRASE_DICT)
    .filter(([en]) => en.length >= 4) // Skip very short phrases
    .sort((a, b) => b[0].length - a[0].length);

  let result = protected_;
  for (const [en, zh] of sortedPhrases) {
    const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'gi');
    result = result.replace(regex, zh);
  }

  // Then tokenize remaining text and translate word by word
  // Split on spaces and punctuation while preserving delimiters
  const tokens = result.split(/(\s+|[.,!?;:'"()\-\[\]{}@#$%^&*+=|\\/<>~`_])/);

  const translatedTokens = tokens.map(token => {
    // Skip empty tokens, whitespace, punctuation, placeholders
    if (!token || /^\s+$/.test(token) || /^[.,!?;:'"()\-\[\]{}@#$%^&*+=|\\/<>~`_]$/.test(token)) return token;
    if (/^__PH\d+__$/.test(token)) return token;

    // Skip if token is in SKIP_COMPOSITIONAL
    if (SKIP_COMPOSITIONAL.has(token)) return token;

    // Skip brand names and technical terms
    if (BRAND_NAMES.has(token) || KEEP_ENGLISH.has(token)) return token;

    // Skip if already contains Chinese
    if (containsChinese(token)) return token;

    // Try exact match in word dict (case-sensitive first, then Title case)
    if (WORD_DICT[token]) return WORD_DICT[token];

    // Try Title case
    const titleCase = token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    if (WORD_DICT[titleCase]) return WORD_DICT[titleCase];

    // Try lowercase
    const lower = token.toLowerCase();
    const lowerTitle = lower.charAt(0).toUpperCase() + lower.slice(1);
    if (WORD_DICT[lowerTitle]) return WORD_DICT[lowerTitle];

    // Try PHRASE_DICT for single-word entries
    if (PHRASE_DICT[token]) return PHRASE_DICT[token];
    if (PHRASE_DICT[titleCase]) return PHRASE_DICT[titleCase];

    return token;
  });

  result = translatedTokens.join('');

  // Restore placeholders
  result = result.replace(/__PH(\d+)__/g, (_, i) => placeholders[parseInt(i)]);

  return result;
}

/**
 * Fix a broken mixed translation
 */
function fixBrokenTranslation(zhValue, enValue) {
  // Try to get a clean translation from EN
  const freshTranslation = translateString(enValue);

  // If we got a good translation (fully Chinese), use it
  if (freshTranslation && containsChinese(freshTranslation) && !isMixedBroken(freshTranslation)) {
    return freshTranslation;
  }

  // Otherwise try compositional on the EN value
  const compositional = translateCompositional(enValue);
  if (compositional !== enValue && containsChinese(compositional)) {
    return compositional;
  }

  // Last resort: try compositional on the broken ZH
  const fixedZh = translateCompositional(zhValue);
  if (fixedZh !== zhValue) {
    return fixedZh;
  }

  // Return the compositional result even if partial
  return compositional;
}

/**
 * Process a single translation value
 */
function processValue(enValue, zhValue) {
  if (typeof enValue !== 'string') return zhValue;
  if (!enValue.trim()) return enValue;

  // If ZH is already good Chinese (and not identical to EN), keep it
  if (zhValue && typeof zhValue === 'string' && zhValue !== enValue) {
    // Check if it's mixed/broken
    if (isMixedBroken(zhValue)) {
      return fixBrokenTranslation(zhValue, enValue);
    }
    // It's different from EN and not broken, keep it
    return zhValue;
  }

  // ZH is identical to EN or missing - translate it
  return translateString(enValue);
}

/**
 * Deep process: walk both EN and ZH objects recursively
 */
function deepProcess(enObj, zhObj) {
  const result = {};

  for (const key of Object.keys(enObj)) {
    const enVal = enObj[key];
    const zhVal = zhObj && zhObj[key];

    if (typeof enVal === 'object' && enVal !== null && !Array.isArray(enVal)) {
      result[key] = deepProcess(enVal, typeof zhVal === 'object' && zhVal !== null ? zhVal : {});
    } else if (Array.isArray(enVal)) {
      result[key] = enVal; // Keep arrays as-is
    } else {
      result[key] = processValue(enVal, zhVal);
    }
  }

  // Also keep any ZH keys that don't exist in EN (shouldn't happen but safe)
  if (zhObj && typeof zhObj === 'object') {
    for (const key of Object.keys(zhObj)) {
      if (!(key in result)) {
        result[key] = zhObj[key];
      }
    }
  }

  return result;
}

/**
 * Count translation stats
 */
function countStats(enObj, zhObj, resultObj, prefix = '') {
  let total = 0, translated = 0, fixed = 0, unchanged = 0, untranslatable = 0;

  for (const key of Object.keys(enObj)) {
    const enVal = enObj[key];
    const zhVal = zhObj && zhObj[key];
    const resVal = resultObj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof enVal === 'object' && enVal !== null && !Array.isArray(enVal)) {
      const sub = countStats(enVal,
        typeof zhVal === 'object' ? zhVal : {},
        typeof resVal === 'object' ? resVal : {},
        fullKey);
      total += sub.total;
      translated += sub.translated;
      fixed += sub.fixed;
      unchanged += sub.unchanged;
      untranslatable += sub.untranslatable;
    } else if (typeof enVal === 'string') {
      total++;
      if (zhVal && zhVal !== enVal && !isMixedBroken(zhVal)) {
        unchanged++; // Was already good
      } else if (resVal && resVal !== enVal && containsChinese(resVal)) {
        if (zhVal === enVal) translated++; // Was EN, now CN
        else fixed++; // Was broken, now fixed
      } else {
        untranslatable++; // Couldn't translate
      }
    }
  }

  return { total, translated, fixed, unchanged, untranslatable };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log('=== ZH Translation Fixer ===\n');

const targetNs = process.argv[2]; // Optional: run single namespace

for (const ns of NAMESPACES) {
  if (targetNs && ns !== targetNs) continue;

  const enPath = path.join(base, 'en', `${ns}.json`);
  const zhPath = path.join(base, 'zh', `${ns}.json`);

  if (!fs.existsSync(enPath)) {
    console.log(`SKIP: ${ns} (EN file not found)`);
    continue;
  }

  console.log(`Processing ${ns}...`);

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const zhData = fs.existsSync(zhPath) ? JSON.parse(fs.readFileSync(zhPath, 'utf8')) : {};

  const result = deepProcess(enData, zhData);

  // Validate JSON before writing
  const output = JSON.stringify(result, null, 2);

  // Double-check: no Chinese typographic quotes
  const cleanOutput = output
    .replace(/\u201c/g, '\\"')  // left double curly quote
    .replace(/\u201d/g, '\\"')  // right double curly quote
    .replace(/\u2018/g, "'")   // left single curly quote
    .replace(/\u2019/g, "'")   // right single curly quote
    .replace(/\u300c/g, '\\"')  // left corner bracket
    .replace(/\u300d/g, '\\"'); // right corner bracket

  // Verify it's valid JSON before writing
  try {
    JSON.parse(cleanOutput);
  } catch (e) {
    console.error(`  ERROR: Generated invalid JSON for ${ns}: ${e.message}`);
    continue;
  }

  fs.writeFileSync(zhPath, cleanOutput + '\n', 'utf8');

  // Stats
  const stats = countStats(enData, zhData, result);
  console.log(`  Total: ${stats.total} | Already good: ${stats.unchanged} | Newly translated: ${stats.translated} | Fixed: ${stats.fixed} | Untranslatable: ${stats.untranslatable}`);
}

console.log('\nDone!');
