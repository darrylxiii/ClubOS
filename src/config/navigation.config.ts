import {
  Briefcase,
  Building2,
  Gift,
  FileText,
  Settings,
  User,
  ListTodo,
  Sparkles,
  Calendar,
  MessageSquare,
  Video,
  Home,
  Building,
  Users,
  Rss,
  Layers,
  Zap,
  Cog,
  Share2,
  BarChart3,
  TrendingUp,
  Trophy,
  GraduationCap,
  ClipboardCheck,
  Mail,
  Link2,
  CreditCard,
  Brain,
  BookOpen,
  Shield,
  LayoutDashboard,
  Target,
  Globe,
  Languages,
  Plus,
  Radio,
  DollarSign,
  FileCheck,
  HelpCircle,
  Ticket,
  FolderOpen,
  Timer,
  FileSignature,
  Database,
  AlertTriangle,
  Package,
  Contact,
  NotebookPen,
  Star,
  Layout,
  Phone,
  Edit,
  Gamepad2,
  Heart,
  Zap as ZapIcon,
  Puzzle,
  Webhook,
  GitBranch,
  UserPlus,
  Bell,
  Monitor,
  HeartPulse,
  Megaphone,
  Lock,
  Code,
  Gauge,
  Key,
  Crosshair,
  MailOpen,
  CalendarClock,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  name: string;
  icon: LucideIcon;
  path: string;
  roles?: ('candidate' | 'partner' | 'admin' | 'strategist')[];
  badge?: string;
  locked?: boolean;
  lockedMessage?: string;
}

export interface NavigationGroup {
  title: string;
  icon: LucideIcon;
  items: NavigationItem[];
  roles?: ('candidate' | 'partner' | 'admin' | 'strategist')[];
  badge?: string;
}

// Base navigation items shared across all roles
const baseNavigationGroups: NavigationGroup[] = [
  {
    title: "common:navigationGroups.overview",
    icon: Layers,
    items: [
      { name: "common:navigation.clubHome", icon: Home, path: "/home" },
      { name: "common:navigation.feed", icon: Rss, path: "/feed" },
      { name: "common:navigation.achievements", icon: Trophy, path: "/achievements" },
    ],
  },
  {
    title: "common:navigationGroups.communication",
    icon: MessageSquare,
    items: [
      { name: "common:navigation.liveHub", icon: Radio, path: "/live-hub" },
      { name: "common:navigation.inbox", icon: Mail, path: "/inbox" },
      { name: "common:navigation.messages", icon: MessageSquare, path: "/messages" },
      { name: "common:navigation.meetings", icon: Video, path: "/meetings" },
      { name: "common:navigation.scheduling", icon: Calendar, path: "/scheduling" },
    ],
  },
  {
    title: "common:navigationGroups.learning",
    icon: GraduationCap,
    items: [
      { name: "common:navigation.academy", icon: GraduationCap, path: "/academy" },
      { name: "common:navigation.blog", icon: BookOpen, path: "/blog" },
    ],
  },
  {
    title: "common:navigationGroups.aiTools",
    icon: Zap,
    items: [
      { name: "common:navigation.clubAI", icon: Sparkles, path: "/club-ai" },
      { name: "common:navigation.clubPilot", icon: Sparkles, path: "/club-pilot" },
      { name: "common:navigation.tasks", icon: ListTodo, path: "/tasks" },
      { name: "common:navigation.clubRadio", icon: Video, path: "/club-dj" },
    ],
  },
  {
    title: "common:navigationGroups.osNotes",
    icon: NotebookPen,
    items: [
      { name: "common:navigation.allPages", icon: FileText, path: "/pages" },
      { name: "common:navigation.favorites", icon: Star, path: "/pages?tab=favorites" },
      { name: "common:navigation.templates", icon: Layout, path: "/pages?tab=templates" },
    ],
  },
  {
    title: "common:navigationGroups.settings",
    icon: Cog,
    items: [
      { name: "common:navigation.myProfile", icon: User, path: "/profile" },
      { name: "common:navigation.mySkills", icon: Target, path: "/my-skills" },
      { name: "common:navigation.myPerformance", icon: TrendingUp, path: "/my-performance" },
      { name: "common:navigation.documents", icon: FolderOpen, path: "/documents" },
      { name: "common:navigation.emailSettings", icon: Mail, path: "/email-settings" },
      { name: "common:navigation.subscription", icon: CreditCard, path: "/subscription" },
      { name: "common:navigation.settings", icon: Settings, path: "/settings" },
    ],
  },
  {
    title: "common:navigationGroups.support",
    icon: HelpCircle,
    items: [
      { name: "common:navigation.helpCenter", icon: BookOpen, path: "/help" },
      { name: "common:navigation.supportTickets", icon: Ticket, path: "/support/tickets" },
      { name: "common:navigation.submitTicket", icon: Plus, path: "/support/tickets/new" },
    ],
  },
];

// Role-specific overrides and additions
const roleSpecificGroups: Record<'candidate' | 'partner' | 'admin', NavigationGroup[]> = {
  candidate: [
    {
      title: "common:navigationGroups.career",
      icon: Briefcase,
      items: [
        { name: "common:navigation.jobs", icon: Briefcase, path: "/jobs" },
        { name: "common:navigation.offers", icon: DollarSign, path: "/offers", badge: "common:navigation.badges.new" },
        { name: "common:navigation.coverLetterBuilder", icon: FileText, path: "/cover-letter-builder" },
        { name: "common:navigation.companies", icon: Building2, path: "/companies" },
        { name: "common:navigation.myAnalytics", icon: BarChart3, path: "/analytics" },
        { name: "common:navigation.referralsInvites", icon: Gift, path: "/referrals" },
        { name: "common:navigation.assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "common:navigation.myCommunications", icon: MessageSquare, path: "/profile?tab=communications" },
        { name: "common:navigation.socialFeed", icon: Share2, path: "/social-feed" },
      ],
    },
    // Club Projects removed from candidate nav — all items were locked/Coming Soon
    // Social Feed merged into Career group above
  ],
  partner: [
    {
      title: "common:navigationGroups.hiring",
      icon: Briefcase,
      items: [
        { name: "common:navigation.jobs", icon: Briefcase, path: "/jobs" },
        { name: "common:navigation.companies", icon: Building, path: "/companies" },
        { name: "common:navigation.assessments", icon: ClipboardCheck, path: "/assessments", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.partnerHub", icon: LayoutDashboard, path: "/partner/hub" },
      ],
    },
    {
      title: "common:navigationGroups.clubProjects",
      icon: Layers,
      badge: "common:navigation.badges.soon",
      items: [
        { name: "common:navigation.browseProjects", icon: Layers, path: "/projects", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.postProject", icon: Plus, path: "/projects/new", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.findTalent", icon: Users, path: "/projects/talent", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.contracts", icon: FileSignature, path: "/contracts", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.timeTracking", icon: Timer, path: "/time-tracking", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.expertMarketplace", icon: GraduationCap, path: "/expert-marketplace", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
      ],
    },
  ],
  admin: [
    // === CRM & OUTREACH (consolidated from 2 groups into 1) ===
    {
      title: "common:navigationGroups.crmOutreach",
      icon: Contact,
      items: [
        { name: "common:navigation.crmDashboard", icon: LayoutDashboard, path: "/crm" },
        { name: "common:navigation.pipeline", icon: Target, path: "/crm/prospects" },
        { name: "common:navigation.replyInbox", icon: Mail, path: "/crm/inbox" },
        { name: "common:navigation.campaigns", icon: Zap, path: "/crm/campaigns" },
        { name: "common:navigation.analytics", icon: BarChart3, path: "/crm/analytics" },
        { name: "common:navigation.crmSettings", icon: Settings, path: "/crm/settings" },
      ],
      roles: ['admin', 'strategist'],
    },
    // === PARTNERSHIPS ===
    {
      title: "common:navigationGroups.partnerships",
      icon: Zap,
      items: [
        { name: "common:navigation.whatsappHub", icon: Phone, path: "/admin/whatsapp", badge: "common:navigation.badges.new" },
        { name: "common:navigation.whatsappBooking", icon: Calendar, path: "/admin/whatsapp-booking" },
        { name: "common:navigation.partnerFunnel", icon: Target, path: "/partner-funnel" },
        { name: "common:navigation.partnerRelationships", icon: Link2, path: "/partner/relationships" },
        { name: "common:navigation.relationshipsDashboard", icon: Building2, path: "/admin/company-relationships" },
      ],
      roles: ['admin', 'strategist'],
    },
    // === TALENT MANAGEMENT (merged: Candidate Management + Jobs & Companies) ===
    {
      title: "common:navigationGroups.talentManagement",
      icon: Users,
      items: [
        { name: "common:navigation.userManagement", icon: Users, path: "/admin/users", badge: "common:navigation.badges.new" },
        { name: "common:navigation.talentPool", icon: Sparkles, path: "/talent-pool" },
        { name: "common:navigation.talentLists", icon: FolderOpen, path: "/admin/talent-pool/lists" },
        { name: "common:navigation.allCandidates", icon: Users, path: "/admin/candidates" },
        { name: "common:navigation.allJobs", icon: Briefcase, path: "/jobs" },
        { name: "common:navigation.jobApprovals", icon: FileCheck, path: "/admin/job-approvals" },
        { name: "common:navigation.jobBoardDistribution", icon: Globe, path: "/admin/job-board-distribution" },
        { name: "common:navigation.allCompanies", icon: Building, path: "/companies" },
        { name: "common:navigation.targetCompanies", icon: Target, path: "/admin/target-companies" },
        { name: "common:navigation.memberManagement", icon: Users, path: "/admin/talent-hub" },
        { name: "common:navigation.interviewKits", icon: ClipboardCheck, path: "/admin/interview-kits" },
        { name: "common:navigation.backgroundChecks", icon: Shield, path: "/admin/background-checks" },
        { name: "common:navigation.employeeOnboarding", icon: UserPlus, path: "/admin/employee-onboarding" },
        { name: "common:navigation.pipelineStages", icon: GitBranch, path: "/admin/pipeline-stages" },
        { name: "common:navigation.offerManagement", icon: DollarSign, path: "/admin/offers" },
        { name: "common:navigation.jobTemplates", icon: FileText, path: "/admin/job-templates" },
        { name: "common:navigation.candidateScheduling", icon: CalendarClock, path: "/admin/candidate-scheduling" },
        { name: "common:navigation.scorecardLibrary", icon: ClipboardList, path: "/admin/scorecard-library" },
      ],
    },
    // === ASSESSMENTS & GAMES (consolidated into single hub) ===
    {
      title: "common:navigationGroups.assessmentsGames",
      icon: Gamepad2,
      items: [
        { name: "common:navigation.assessmentsHub", icon: ClipboardCheck, path: "/admin/assessments-hub" },
      ],
    },
    // === ANALYTICS & INTELLIGENCE (streamlined: RAG + ML merged into AI Analytics Hub) ===
    {
      title: "common:navigationGroups.analyticsIntelligence",
      icon: Brain,
      items: [
        { name: "common:navigation.globalAnalytics", icon: BarChart3, path: "/admin/global-analytics" },
        { name: "common:navigation.performanceHub", icon: BarChart3, path: "/admin/performance-hub" },
        { name: "common:navigation.communicationHub", icon: MessageSquare, path: "/admin/communication-hub" },
        { name: "common:navigation.meetingAnalytics", icon: Video, path: "/meeting-intelligence" },
        { name: "common:navigation.aiAnalyticsHub", icon: Brain, path: "/admin/ai-analytics" },
        { name: "common:navigation.timeToFill", icon: Timer, path: "/admin/time-to-fill" },
        { name: "common:navigation.recruiterProductivity", icon: Users, path: "/admin/recruiter-productivity" },
        { name: "common:navigation.sourceROI", icon: Crosshair, path: "/admin/source-effectiveness" },
        { name: "common:navigation.emailAnalytics", icon: MailOpen, path: "/admin/email-analytics" },
      ],
    },
    // === AGENTIC OS (new autonomous system) ===
    {
      title: "common:navigationGroups.agenticOS",
      icon: ZapIcon,
      badge: "common:navigation.badges.new",
      items: [
        { name: "common:navigation.agenticOSHub", icon: ZapIcon, path: "/admin/agentic-os" },
      ],
    },
    // === OPERATIONS - Core (streamlined for efficiency) ===
    {
      title: "common:navigationGroups.operations",
      icon: Shield,
      items: [
        { name: "common:navigation.kpiCommandCenter", icon: BarChart3, path: "/admin/kpi-command-center" },
        { name: "common:navigation.edgeFunctionCommandCenter", icon: Zap, path: "/admin/edge-functions" },
        { name: "common:navigation.featureControlCenter", icon: Zap, path: "/admin/feature-control" },
        { name: "common:navigation.employeeDashboard", icon: Users, path: "/admin/employee-management" },
        { name: "common:navigation.systemHealth", icon: Heart, path: "/admin/system-health" },
        { name: "common:navigation.bulkOperations", icon: Users, path: "/admin/bulk-operations" },
        { name: "common:navigation.customFields", icon: Database, path: "/admin/custom-fields" },
        { name: "common:navigation.workflowBuilder", icon: GitBranch, path: "/admin/workflow-builder" },
        { name: "common:navigation.approvalChains", icon: GitBranch, path: "/admin/approval-chains" },
        { name: "common:navigation.announcements", icon: Megaphone, path: "/admin/announcements" },
        { name: "common:navigation.notificationsConfig", icon: Bell, path: "/admin/notifications" },
        { name: "common:navigation.reportBuilder", icon: BarChart3, path: "/admin/report-builder" },
        { name: "common:navigation.avatarTrafficControl", icon: Radio, path: "/admin/avatar-control" },
        { name: "common:navigation.pageTemplates", icon: FileText, path: "/admin/templates" },
        { name: "common:navigation.aiConfiguration", icon: Cog, path: "/admin/ai-configuration" },
        { name: "common:navigation.blogEngine", icon: Edit, path: "/admin/blog-engine" },
        { name: "common:navigation.emailBuilder", icon: Mail, path: "/admin/email-builder" },
        { name: "common:navigation.headcountPlanning", icon: Users, path: "/admin/headcount-planning" },
      ],
    },
    // === SECURITY & MONITORING (consolidated into Security Hub) ===
    {
      title: "common:navigationGroups.securityMonitoring",
      icon: Shield,
      items: [
        { name: "common:navigation.securityHub", icon: Shield, path: "/admin/security" },
        { name: "common:navigation.mfaEnforcement", icon: Lock, path: "/admin/mfa-enforcement" },
        { name: "common:navigation.sessionManagement", icon: Monitor, path: "/admin/sessions" },
        { name: "common:navigation.customRoles", icon: Users, path: "/admin/custom-roles" },
        { name: "common:navigation.statusPage", icon: Globe, path: "/admin/status-page" },
        { name: "common:navigation.ipAllowlist", icon: Shield, path: "/admin/ip-allowlist" },
      ],
    },
    // === FINANCE ===
    {
      title: "common:navigationGroups.finance",
      icon: DollarSign,
      items: [
        { name: "common:navigation.financeHub", icon: DollarSign, path: "/admin/finance" },
        { name: "common:navigation.inventoryHub", icon: Package, path: "/admin/inventory" },
        { name: "common:navigation.usageMetering", icon: Gauge, path: "/admin/usage-metering" },
        { name: "common:navigation.customerHealth", icon: HeartPulse, path: "/admin/customer-health" },
      ],
    },
    // === GOVERNANCE (consolidated: 5 compliance pages into Compliance Hub) ===
    {
      title: "common:navigationGroups.governance",
      icon: FileCheck,
      items: [
        { name: "common:navigation.complianceHub", icon: Shield, path: "/compliance" },
        { name: "common:navigation.consentManagement", icon: Shield, path: "/admin/consent-management" },
        { name: "common:navigation.eeoCompliance", icon: Users, path: "/admin/eeo-compliance" },
        { name: "common:navigation.enterpriseManagement", icon: Building2, path: "/admin/enterprise" },
        { name: "common:navigation.dueDiligenceCenter", icon: FileCheck, path: "/admin/due-diligence" },
        { name: "common:navigation.riskManagement", icon: Shield, path: "/admin/risk-management" },
        { name: "common:navigation.translationsHub", icon: Languages, path: "/admin/translations" },
        { name: "common:navigation.dataRetention", icon: Database, path: "/admin/data-retention" },
        { name: "common:navigation.investorMetrics", icon: TrendingUp, path: "/admin/investor-metrics" },
      ],
    },
    // === DEVELOPER & INTEGRATIONS ===
    {
      title: "common:navigationGroups.developer",
      icon: Code,
      items: [
        { name: "common:navigation.developerPortal", icon: Code, path: "/admin/developer-portal" },
        { name: "common:navigation.integrationMarketplace", icon: Puzzle, path: "/admin/integrations" },
        { name: "common:navigation.webhooks", icon: Webhook, path: "/admin/webhooks" },
        { name: "common:navigation.supportTickets", icon: Ticket, path: "/admin/support-tickets" },
        { name: "common:navigation.apiKeys", icon: Key, path: "/admin/api-keys" },
      ],
    },
    // === CLUB PROJECTS (kept separate - distinct domain) ===
    {
      title: "common:navigationGroups.clubProjects",
      icon: Layers,
      badge: "common:navigation.badges.soon",
      items: [
        { name: "common:navigation.allProjects", icon: Layers, path: "/projects", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.postProject", icon: Plus, path: "/projects/new", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.gigMarketplace", icon: Briefcase, path: "/projects/gigs", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.allProposals", icon: FileText, path: "/projects/proposals", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.disputes", icon: AlertTriangle, path: "/projects/disputes", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.contracts", icon: FileSignature, path: "/contracts", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
        { name: "common:navigation.timeTracking", icon: Timer, path: "/time-tracking", locked: true, lockedMessage: "common:navigation.lockedMessages.releasingSoon" },
      ],
    },
    // === SOCIAL (kept separate - distinct domain) ===
    {
      title: "common:navigationGroups.social",
      icon: Share2,
      items: [
        { name: "common:navigation.socialFeed", icon: Share2, path: "/social-feed" },
        { name: "common:navigation.socialManagement", icon: BarChart3, path: "/social-management" },
      ],
    },
  ],
};

// Admin panel visibility
const adminSpecificItems: NavigationItem[] = [
  { name: "common:navigation.adminPanel", icon: Users, path: "/admin" },
];

// Partner-specific items
const partnerSpecificItems: NavigationItem[] = [
  { name: "common:navigation.meetingIntelligence", icon: Video, path: "/meeting-intelligence" },
];

// Candidate-specific items
const candidateSpecificItems: NavigationItem[] = [
  { name: "common:navigation.meetingIntelligence", icon: Video, path: "/meeting-intelligence" },
];

/**
 * Get navigation groups for a specific role
 * Merges base navigation with role-specific additions
 */
export function getNavigationForRole(role?: string | null): NavigationGroup[] {
  // Normalize role - default to candidate if invalid
  const normalizedRole: 'candidate' | 'partner' | 'admin' = 
    role === 'company_admin' ? 'admin' : 
    (role === 'candidate' || role === 'partner' || role === 'admin') ? role : 
    'candidate';
  
  const groups: NavigationGroup[] = [];
  
  // 1. Add overview section
  const overviewGroup = { 
    ...baseNavigationGroups[0],
    items: [...baseNavigationGroups[0].items]
  };
  
  // Add admin panel for admin role
  if (normalizedRole === 'admin') {
    overviewGroup.items.splice(2, 0, ...adminSpecificItems);
  }
  
  groups.push(overviewGroup);
  
  // 2. Add role-specific sections (Career/Hiring/Management)
  const roleSpecific = roleSpecificGroups[normalizedRole];
  if (roleSpecific) {
    const deepCopiedRoleGroups = roleSpecific.map(group => ({
      ...group,
      items: [...group.items]
    }));
    groups.push(...deepCopiedRoleGroups);
  }
  
  // 3. Add communication section with role-specific items
  const communicationGroup = { 
    ...baseNavigationGroups[1],
    items: [...baseNavigationGroups[1].items]
  };
  if (normalizedRole === 'partner') {
    communicationGroup.items.push(...partnerSpecificItems);
  } else if (normalizedRole === 'candidate') {
    communicationGroup.items.push(...candidateSpecificItems);
  }
  groups.push(communicationGroup);
  
  // 4. Add remaining base sections (Learning, AI & Tools, Quantum OS, Settings, Support)
  groups.push(baseNavigationGroups[2]); // Learning
  groups.push(baseNavigationGroups[3]); // AI & Tools
  groups.push(baseNavigationGroups[4]); // Quantum OS
  groups.push(baseNavigationGroups[5]); // Settings
  groups.push(baseNavigationGroups[6]); // Support
  
  return groups;
}

/**
 * Get all navigation paths for command palette
 */
export function getAllNavigationPaths(): Array<{ name: string; path: string; icon: LucideIcon; category: string }> {
  const allPaths: Array<{ name: string; path: string; icon: LucideIcon; category: string }> = [];
  
  // Collect from all role-specific navigations
  (['candidate', 'partner', 'admin'] as const).forEach(role => {
    const groups = getNavigationForRole(role);
    groups.forEach(group => {
      group.items.forEach(item => {
        // Avoid duplicates
        if (!allPaths.find(p => p.path === item.path)) {
          allPaths.push({
            name: item.name,
            path: item.path,
            icon: item.icon,
            category: group.title,
          });
        }
      });
    });
  });
  
  return allPaths;
}
