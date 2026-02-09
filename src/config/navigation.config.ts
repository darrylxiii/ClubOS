import {
  Briefcase,
  Building2,
  Gift,
  FileText,
  Settings,
  Clock,
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
  Activity,
  Share2,
  BarChart3,
  TrendingUp,
  Trophy,
  MessagesSquare,
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
  History,
  FolderOpen,
  Timer,
  FileSignature,
  Database,
  AlertTriangle,
  Contact,
  NotebookPen,
  Star,
  Layout,
  Phone,
  Play,
  Flame,
  Eye,
  Archive,
  Upload,
  Edit,
  Percent,
  Gamepad2,
  Heart,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  name: string;
  icon: LucideIcon;
  path: string;
  roles?: ('candidate' | 'partner' | 'admin' | 'strategist')[];
  badge?: string;
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
    title: "Overview",
    icon: Layers,
    items: [
      { name: "Club Home", icon: Home, path: "/home" },
      { name: "Feed", icon: Rss, path: "/feed" },
      { name: "Achievements", icon: Trophy, path: "/achievements" },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    items: [
      { name: "Live Hub", icon: Radio, path: "/live-hub" },
      { name: "Inbox", icon: Mail, path: "/inbox" },
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      { name: "Meetings", icon: Video, path: "/meetings" },
      { name: "Scheduling", icon: Calendar, path: "/scheduling" },
    ],
  },
  {
    title: "Learning",
    icon: GraduationCap,
    items: [
      { name: "Academy", icon: GraduationCap, path: "/academy" },
    ],
  },
  {
    title: "AI & Tools",
    icon: Zap,
    items: [
      { name: "Club AI", icon: Sparkles, path: "/club-ai" },
      { name: "Club Pilot", icon: Sparkles, path: "/club-pilot" },
      { name: "Tasks", icon: ListTodo, path: "/unified-tasks" },
      { name: "Club Radio", icon: Video, path: "/club-dj" },
    ],
  },
  {
    title: "Quantum OS",
    icon: NotebookPen,
    badge: "New",
    items: [
      { name: "All Pages", icon: FileText, path: "/pages" },
      { name: "Favorites", icon: Star, path: "/pages?tab=favorites" },
      { name: "Templates", icon: Layout, path: "/pages?tab=templates" },
    ],
  },
  {
    title: "Settings",
    icon: Cog,
    items: [
      { name: "My Profile", icon: User, path: "/profile" },
      { name: "My Skills", icon: Target, path: "/my-skills" },
      { name: "My Performance", icon: TrendingUp, path: "/my-performance" },
      { name: "Documents", icon: FolderOpen, path: "/documents" },
      { name: "Email Settings", icon: Mail, path: "/email-settings" },
      { name: "Subscription", icon: CreditCard, path: "/subscription" },
      { name: "Settings", icon: Settings, path: "/settings" },
    ],
  },
  {
    title: "Support",
    icon: HelpCircle,
    items: [
      { name: "Help Center", icon: BookOpen, path: "/help" },
      { name: "Support Tickets", icon: Ticket, path: "/support/tickets" },
      { name: "Submit Ticket", icon: Plus, path: "/support/tickets/new" },
    ],
  },
];

// Role-specific overrides and additions
const roleSpecificGroups: Record<'candidate' | 'partner' | 'admin', NavigationGroup[]> = {
  candidate: [
    {
      title: "Career",
      icon: Briefcase,
      items: [
        { name: "Jobs", icon: Briefcase, path: "/jobs" },
        { name: "Offers", icon: DollarSign, path: "/offers", badge: "New" },
        { name: "Cover Letter Builder", icon: FileText, path: "/cover-letter-builder" },
        { name: "Companies", icon: Building2, path: "/companies" },
        { name: "Salary Insights", icon: TrendingUp, path: "/salary-insights" },
        { name: "Career Path", icon: Target, path: "/career-path" },
        { name: "Career Insights", icon: Brain, path: "/career-insights" },
        { name: "Referrals", icon: Gift, path: "/referrals" },
        { name: "Invites", icon: Mail, path: "/invites" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "My Analytics", icon: BarChart3, path: "/candidate-analytics" },
        { name: "My Communications", icon: MessageSquare, path: "/my-communications" },
      ],
    },
    {
      title: "Club Projects",
      icon: Layers,
      badge: "New",
      items: [
        { name: "Browse Projects", icon: Layers, path: "/projects" },
        { name: "Freelancer Setup", icon: User, path: "/projects/freelancer/setup" },
        { name: "Gig Marketplace", icon: Briefcase, path: "/projects/gigs" },
        { name: "My Proposals", icon: FileText, path: "/projects/proposals" },
        { name: "My Contracts", icon: FileSignature, path: "/contracts" },
        { name: "Time Tracking", icon: Timer, path: "/time-tracking" },
      ],
    },
    {
      title: "Social",
      icon: Share2,
      items: [
        { name: "Social Feed", icon: Share2, path: "/social-feed" },
      ],
    },
  ],
  partner: [
    {
      title: "Hiring",
      icon: Briefcase,
      items: [
        { name: "Jobs", icon: Briefcase, path: "/jobs" },
        { name: "Company Jobs", icon: Briefcase, path: "/company-jobs" },
        { name: "Target Companies", icon: Target, path: "/partner/target-companies" },
        { name: "Intelligence Hub", icon: Brain, path: "/hiring-intelligence" },
        { name: "Company Intelligence", icon: Building, path: "/company-intelligence" },
        { name: "Applicants", icon: FileText, path: "/applications" },
        { name: "Company Applications", icon: FileText, path: "/company-applications" },
        { name: "Interactions", icon: MessageSquare, path: "/interactions" },
        { name: "Log Interaction", icon: Plus, path: "/interactions/new" },
        { name: "Rejections", icon: Users, path: "/partner/rejections" },
        { name: "Companies", icon: Building, path: "/companies" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "Hiring Analytics", icon: BarChart3, path: "/partner/analytics" },
      ],
    },
    {
      title: "Operations",
      icon: Activity,
      items: [
        { name: "Audit Log", icon: FileCheck, path: "/partner/audit-log" },
        { name: "SLA Dashboard", icon: Timer, path: "/partner/sla" },
        { name: "Integrations", icon: Link2, path: "/partner/integrations" },
      ],
    },
    {
      title: "Club Projects",
      icon: Layers,
      badge: "New",
      items: [
        { name: "Browse Projects", icon: Layers, path: "/projects" },
        { name: "Post Project", icon: Plus, path: "/projects/new" },
        { name: "Find Talent", icon: Users, path: "/projects/talent" },
        { name: "Contracts", icon: FileSignature, path: "/contracts" },
        { name: "Time Tracking", icon: Timer, path: "/time-tracking" },
      ],
    },
    {
      title: "Company Settings",
      icon: Building,
      items: [
        { name: "Company Profile", icon: Building, path: "/company-settings" },
        { name: "Email Domains", icon: Globe, path: "/company-domains" },
      ],
    },
    {
      title: "Billing",
      icon: CreditCard,
      items: [
        { name: "Billing & Invoices", icon: CreditCard, path: "/partner/billing" },
      ],
    },
    {
      title: "Social",
      icon: Share2,
      items: [
        { name: "Social Feed", icon: Share2, path: "/social-feed" },
      ],
    },
  ],
  admin: [
    // === BUSINESS DEVELOPMENT (merged: WhatsApp + CRM & Outreach + Company Relationships) ===
    {
      title: "Business Development",
      icon: Contact,
      badge: "New",
      items: [
        { name: "CRM Dashboard", icon: LayoutDashboard, path: "/crm" },
        { name: "Prospect Pipeline", icon: Target, path: "/crm/prospects" },
        { name: "Focus View", icon: Target, path: "/crm/focus" },
        { name: "Reply Inbox", icon: Mail, path: "/crm/inbox" },
        { name: "WhatsApp Hub", icon: Phone, path: "/admin/whatsapp", badge: "New" },
        { name: "WhatsApp Booking", icon: Calendar, path: "/admin/whatsapp-booking" },
        { name: "Campaigns", icon: Zap, path: "/crm/campaigns" },
        { name: "Email Sequencing", icon: Mail, path: "/email-sequences" },
        { name: "Lead Scoring", icon: TrendingUp, path: "/crm/lead-scoring" },
        { name: "Partner Funnel", icon: Target, path: "/partner-funnel" },
        { name: "Partner Relationships", icon: Link2, path: "/partner/relationships" },
        { name: "Relationships Dashboard", icon: Building2, path: "/admin/company-relationships" },
        { name: "CRM Analytics", icon: BarChart3, path: "/crm/analytics" },
        { name: "Automations", icon: Zap, path: "/crm/automations" },
        { name: "Integrations", icon: Link2, path: "/crm/integrations" },
        { name: "CRM Settings", icon: Settings, path: "/crm/settings" },
      ],
      roles: ['admin', 'strategist'],
    },
    // === TALENT MANAGEMENT (merged: Candidate Management + Jobs & Companies) ===
    {
      title: "Talent Management",
      icon: Users,
      items: [
        { name: "Talent Pool", icon: Sparkles, path: "/talent-pool", badge: "New" },
        { name: "Talent Lists", icon: FolderOpen, path: "/admin/talent-pool/lists" },
        { name: "All Candidates", icon: Users, path: "/admin/candidates" },
        { name: "All Jobs", icon: Briefcase, path: "/jobs" },
        { name: "Jobs Map", icon: Globe, path: "/jobs/map" },
        { name: "All Applications", icon: FileText, path: "/applications" },
        { name: "All Companies", icon: Building, path: "/companies" },
        { name: "Target Companies", icon: Target, path: "/admin/target-companies" },
        { name: "Member Requests", icon: Users, path: "/admin/member-requests" },
        { name: "Merge Dashboard", icon: Link2, path: "/admin/merge" },
        { name: "Global Rejections", icon: TrendingUp, path: "/admin/rejections" },
        { name: "Closed Jobs", icon: Archive, path: "/admin/closed-jobs" },
        { name: "Archived Candidates", icon: Archive, path: "/archived-candidates" },
        { name: "Club Sync Requests", icon: Zap, path: "/admin/club-sync-requests" },
        { name: "Email Templates", icon: Mail, path: "/admin/email-templates" },
      ],
    },
    // === ASSESSMENTS & GAMES (kept separate - distinct domain) ===
    {
      title: "Assessments & Games",
      icon: Gamepad2,
      items: [
        { name: "Assessments Hub", icon: ClipboardCheck, path: "/admin/assessments" },
        { name: "Values Poker", icon: Trophy, path: "/admin/games/values-poker" },
        { name: "Swipe Game", icon: Play, path: "/admin/games/swipe-game" },
        { name: "Pressure Cooker", icon: Flame, path: "/admin/games/pressure-cooker" },
        { name: "Blind Spot Detector", icon: Eye, path: "/admin/games/blind-spot" },
        { name: "Miljoenenjacht", icon: DollarSign, path: "/admin/games/miljoenenjacht" },
      ],
    },
    // === INTELLIGENCE CENTER (merged: Intelligence & ML + Analytics) ===
    {
      title: "Intelligence Center",
      icon: Brain,
      items: [
        { name: "Global Analytics", icon: BarChart3, path: "/admin/global-analytics" },
        { name: "RAG Analytics", icon: Brain, path: "/admin/rag-analytics", badge: "New" },
        { name: "ML Dashboard", icon: Brain, path: "/ml-dashboard" },
        { name: "Communication Intelligence", icon: Brain, path: "/communication-intelligence" },
        { name: "Hiring Intelligence", icon: Brain, path: "/hiring-intelligence" },
        { name: "Company Intelligence", icon: Building, path: "/company-intelligence" },
        { name: "Funnel Analytics", icon: TrendingUp, path: "/funnel-analytics" },
        { name: "Candidate Analytics", icon: BarChart3, path: "/candidate-analytics" },
        { name: "Messaging Analytics", icon: MessageSquare, path: "/messaging-analytics" },
        { name: "Communication Analytics", icon: Brain, path: "/communication-analytics" },
        { name: "Meeting Analytics", icon: Video, path: "/meeting-intelligence" },
        { name: "Per-Job Analytics", icon: Briefcase, path: "/admin/job-analytics" },
        { name: "User Engagement", icon: Activity, path: "/admin/user-engagement" },
        { name: "Feedback Database", icon: MessagesSquare, path: "/admin/feedback" },
        { name: "Conversation Analytics", icon: MessageSquare, path: "/admin/conversation-analytics" },
        { name: "Expert Marketplace", icon: GraduationCap, path: "/expert-marketplace" },
        { name: "Knowledge Base", icon: BookOpen, path: "/help" },
        { name: "Leaderboard", icon: Trophy, path: "/admin/website-kpis" },
      ],
    },
    // === OPERATIONS - Core (streamlined for efficiency) ===
    {
      title: "Operations",
      icon: Shield,
      items: [
        { name: "KPI Command Center", icon: BarChart3, path: "/admin/kpi-command-center" },
        { name: "Employee Dashboard", icon: Users, path: "/admin/employee-management" },
        { name: "System Health", icon: Heart, path: "/admin/system-health" },
        { name: "Bulk Operations", icon: Users, path: "/admin/bulk-operations" },
        { name: "Page Templates", icon: FileText, path: "/admin/templates" },
        { name: "AI Configuration", icon: Cog, path: "/admin/ai-configuration" },
      ],
    },
    // === SECURITY & COMPLIANCE ===
    {
      title: "Security & Monitoring",
      icon: Shield,
      items: [
        { name: "Security Events", icon: Shield, path: "/admin/security-events" },
        { name: "Anti-Hacking Center", icon: Shield, path: "/admin/anti-hacking" },
        { name: "Admin Audit Log", icon: FileCheck, path: "/admin/audit-log" },
        { name: "Error Logs", icon: AlertTriangle, path: "/admin/error-logs" },
        { name: "God Mode", icon: Shield, path: "/admin/god-mode" },
        { name: "Disaster Recovery", icon: Shield, path: "/admin/disaster-recovery" },
      ],
    },
    // === ANALYTICS (moved from Operations) ===
    {
      title: "Performance Analytics",
      icon: BarChart3,
      items: [
        { name: "Performance Matrix", icon: LayoutDashboard, path: "/admin/performance-matrix" },
        { name: "Team Performance", icon: BarChart3, path: "/team-performance" },
        { name: "User Activity", icon: Activity, path: "/admin/user-activity" },
        { name: "Website KPIs", icon: Globe, path: "/admin/website-kpis" },
        { name: "Sales KPIs", icon: TrendingUp, path: "/admin/sales-kpis" },
      ],
    },
    // === FINANCE (merged: Revenue & Finance + Inventory & Assets) ===
    {
      title: "Finance",
      icon: DollarSign,
      items: [
        { name: "Revenue Ladder", icon: Trophy, path: "/admin/revenue-ladder", badge: "New" },
        { name: "Financial Dashboard", icon: CreditCard, path: "/admin/financial" },
        { name: "Deal Pipeline", icon: Target, path: "/admin/deals-pipeline" },
        { name: "Company Fees", icon: DollarSign, path: "/admin/company-fees" },
        { name: "Revenue Shares", icon: Percent, path: "/admin/revenue-shares" },
        { name: "Expense Tracking", icon: Receipt, path: "/admin/expenses" },
        { name: "Invoice Reconciliation", icon: FileCheck, path: "/admin/reconciliation" },
        { name: "Moneybird", icon: CreditCard, path: "/admin/moneybird" },
        { name: "Inventory Dashboard", icon: LayoutDashboard, path: "/admin/inventory/dashboard" },
        { name: "Asset Register", icon: Database, path: "/admin/inventory" },
        { name: "Depreciation Schedule", icon: TrendingUp, path: "/admin/inventory/depreciation" },
        { name: "Intangible Assets", icon: Briefcase, path: "/admin/inventory/intangible" },
        { name: "KIA Optimization", icon: DollarSign, path: "/admin/inventory/kia" },
        { name: "Deal Pipeline Settings", icon: Cog, path: "/admin/deal-pipeline-settings" },
        { name: "Referral Program", icon: Gift, path: "/referrals" },
      ],
    },
    // === GOVERNANCE & COMPLIANCE (merged: Translations + Compliance + Enterprise & Valuation) ===
    {
      title: "Governance & Compliance",
      icon: FileCheck,
      items: [
        { name: "Compliance Dashboard", icon: Shield, path: "/compliance/dashboard" },
        { name: "Enterprise Management", icon: Building2, path: "/admin/enterprise" },
        { name: "Due Diligence Center", icon: FileCheck, path: "/admin/due-diligence" },
        { name: "Risk Management", icon: Shield, path: "/admin/risk-management" },
        { name: "Legal Agreements", icon: FileSignature, path: "/compliance/legal-agreements" },
        { name: "Subprocessors", icon: Building2, path: "/compliance/subprocessors" },
        { name: "Data Classification", icon: Database, path: "/compliance/data-classification" },
        { name: "Audit Requests", icon: AlertTriangle, path: "/compliance/audit-requests" },
        { name: "Translation Manager", icon: Languages, path: "/admin/translations" },
        { name: "Translation Editor", icon: Edit, path: "/admin/translation-editor" },
        { name: "Translation Coverage", icon: BarChart3, path: "/admin/translation-coverage" },
        { name: "Brand Terms", icon: Shield, path: "/admin/brand-terms" },
        { name: "Translation Audit", icon: FileCheck, path: "/admin/translation-audit" },
        { name: "Language Manager", icon: Globe, path: "/admin/languages" },
      ],
    },
    // === CLUB PROJECTS (kept separate - distinct domain) ===
    {
      title: "Club Projects",
      icon: Layers,
      badge: "New",
      items: [
        { name: "All Projects", icon: Layers, path: "/projects" },
        { name: "Post Project", icon: Plus, path: "/projects/new" },
        { name: "Gig Marketplace", icon: Briefcase, path: "/projects/gigs" },
        { name: "All Proposals", icon: FileText, path: "/projects/proposals" },
        { name: "Disputes", icon: AlertTriangle, path: "/projects/disputes" },
        { name: "Contracts", icon: FileSignature, path: "/contracts" },
        { name: "Time Tracking", icon: Timer, path: "/time-tracking" },
      ],
    },
    // === SOCIAL (kept separate - distinct domain) ===
    {
      title: "Social",
      icon: Share2,
      items: [
        { name: "Social Feed", icon: Share2, path: "/social-feed" },
        { name: "Social Management", icon: BarChart3, path: "/social-management" },
      ],
    },
  ],
};

// Admin panel visibility
const adminSpecificItems: NavigationItem[] = [
  { name: "Admin Panel", icon: Users, path: "/admin" },
];

// Partner-specific items
const partnerSpecificItems: NavigationItem[] = [
  { name: "Meeting Intelligence", icon: Video, path: "/meeting-intelligence" },
  { name: "Booking Management", icon: Calendar, path: "/booking-management" },
  { name: "Expert Marketplace", icon: GraduationCap, path: "/expert-marketplace" },
];

// Candidate-specific items
const candidateSpecificItems: NavigationItem[] = [
  { name: "Interview Prep", icon: Clock, path: "/interview-prep" },
  { name: "Meeting Intelligence", icon: Video, path: "/meeting-intelligence" },
];

/**
 * Get navigation groups for a specific role
 * Merges base navigation with role-specific additions
 */
export function getNavigationForRole(role?: string | null): NavigationGroup[] {
  // Normalize role - default to candidate if invalid
  const normalizedRole: 'candidate' | 'partner' | 'admin' = 
    role === 'company_admin' || role === 'recruiter' ? 'admin' : 
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
