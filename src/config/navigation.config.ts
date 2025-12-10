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
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  name: string;
  icon: LucideIcon;
  path: string;
  roles?: ('candidate' | 'partner' | 'admin')[];
}

export interface NavigationGroup {
  title: string;
  icon: LucideIcon;
  items: NavigationItem[];
  roles?: ('candidate' | 'partner' | 'admin')[];
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
      { name: "Meeting History", icon: History, path: "/meeting-history" },
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
    title: "Settings",
    icon: Cog,
    items: [
      { name: "My Profile", icon: User, path: "/profile" },
      { name: "My Skills", icon: Target, path: "/my-skills" },
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
        { name: "Applications", icon: FileText, path: "/applications" },
        { name: "Companies", icon: Building2, path: "/companies" },
        { name: "Salary Insights", icon: TrendingUp, path: "/salary-insights" },
        { name: "Career Path", icon: Target, path: "/career-path" },
        { name: "Referrals", icon: Gift, path: "/referrals" },
        { name: "Invites", icon: Mail, path: "/invites" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "Analytics", icon: BarChart3, path: "/candidate-analytics" },
      ],
    },
    {
      title: "Projects",
      icon: Layers,
      items: [
        { name: "Browse Projects", icon: Layers, path: "/projects" },
        { name: "My Contracts", icon: FileSignature, path: "/contracts" },
        { name: "Time Tracking", icon: Timer, path: "/time-tracking" },
      ],
    },
    {
      title: "Social Media",
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
      title: "Projects",
      icon: Layers,
      items: [
        { name: "Browse Projects", icon: Layers, path: "/projects" },
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
      title: "Social Media",
      icon: Share2,
      items: [
        { name: "Social Feed", icon: Share2, path: "/social-feed" },
        { name: "Social Analytics", icon: TrendingUp, path: "/analytics" },
      ],
    },
  ],
  admin: [
    {
      title: "CRM",
      icon: Contact,
      items: [
        { name: "CRM Dashboard", icon: LayoutDashboard, path: "/crm" },
        { name: "Prospect Pipeline", icon: Target, path: "/crm/pipeline" },
        { name: "Reply Inbox", icon: Mail, path: "/crm/replies" },
        { name: "Campaigns", icon: Zap, path: "/crm/campaigns" },
      ],
    },
    {
      title: "Management",
      icon: Building,
      items: [
        { name: "All Candidates", icon: Users, path: "/admin/candidates" },
        { name: "Member Requests", icon: Users, path: "/admin/member-requests" },
        { name: "Company Management", icon: Building, path: "/admin/companies" },
        { name: "Email Templates", icon: Mail, path: "/admin/email-templates" },
        { name: "Merge Dashboard", icon: Link2, path: "/admin/merge" },
        { name: "Companies", icon: Building, path: "/companies" },
        { name: "Jobs", icon: Briefcase, path: "/jobs" },
        { name: "Applications", icon: FileText, path: "/applications" },
        { name: "Global Rejections", icon: TrendingUp, path: "/admin/rejections" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "Assessments Hub", icon: ClipboardCheck, path: "/admin/assessments" },
        { name: "Feedback Database", icon: MessagesSquare, path: "/feedback-database" },
        { name: "Club Sync Requests", icon: Zap, path: "/admin/club-sync-requests" },
        { name: "Funnel Analytics", icon: TrendingUp, path: "/funnel-analytics" },
        { name: "Global Analytics", icon: BarChart3, path: "/admin/global-analytics" },
        { name: "AI Configuration", icon: Cog, path: "/admin/ai-configuration" },
      ],
    },
    {
      title: "Intelligence & ML",
      icon: Brain,
      items: [
        { name: "Hiring Intelligence", icon: Brain, path: "/hiring-intelligence" },
        { name: "ML Dashboard", icon: Brain, path: "/ml-dashboard" },
        { name: "Enhanced ML", icon: Sparkles, path: "/enhanced-ml" },
        { name: "Company Intelligence", icon: Building, path: "/company-intelligence" },
      ],
    },
    {
      title: "System Management",
      icon: Shield,
      items: [
        { name: "KPI Command Center", icon: BarChart3, path: "/admin/kpi-command-center" },
        { name: "Performance Matrix", icon: LayoutDashboard, path: "/admin/performance-matrix" },
        { name: "Website KPIs", icon: Globe, path: "/admin/website-kpis" },
        { name: "Sales KPIs", icon: TrendingUp, path: "/admin/sales-kpis" },
        { name: "Anti-Hacking Center", icon: Shield, path: "/admin/anti-hacking" },
        { name: "User Activity", icon: Activity, path: "/admin/user-activity" },
        { name: "System Health", icon: Shield, path: "/admin/system-health" },
        { name: "Disaster Recovery", icon: Shield, path: "/admin/comprehensive-dr" },
        { name: "DR Runbooks", icon: FileCheck, path: "/admin/dr-runbooks" },
        { name: "Translation Manager", icon: Languages, path: "/admin/translations" },
        { name: "Language Manager", icon: Globe, path: "/admin/languages" },
        { name: "Target Companies", icon: Target, path: "/admin/target-companies" },
      ],
    },
    {
      title: "Revenue & Growth",
      icon: TrendingUp,
      items: [
        { name: "Deal Pipeline", icon: Target, path: "/admin/deals-pipeline" },
        { name: "Company Fees", icon: DollarSign, path: "/admin/company-fees" },
        { name: "Deal Pipeline Settings", icon: Cog, path: "/admin/deal-pipeline-settings" },
        { name: "Financial Dashboard", icon: CreditCard, path: "/admin/financial" },
        { name: "Revenue Analytics", icon: BarChart3, path: "/revenue-analytics" },
        { name: "Referral Program", icon: Gift, path: "/referrals" },
      ],
    },
    {
      title: "Employee Management",
      icon: Users,
      items: [
        { name: "Employee Profiles", icon: Users, path: "/admin/employees" },
        { name: "My Performance", icon: TrendingUp, path: "/my-performance" },
        { name: "Team Performance", icon: BarChart3, path: "/team-performance" },
      ],
    },
    {
      title: "Compliance",
      icon: FileCheck,
      items: [
        { name: "Compliance Dashboard", icon: Shield, path: "/compliance/dashboard" },
        { name: "Legal Agreements", icon: FileSignature, path: "/compliance/legal-agreements" },
        { name: "Subprocessors", icon: Building2, path: "/compliance/subprocessors" },
        { name: "Data Classification", icon: Database, path: "/compliance/data-classification" },
        { name: "Audit Requests", icon: AlertTriangle, path: "/compliance/audit-requests" },
      ],
    },
    {
      title: "Projects",
      icon: Layers,
      items: [
        { name: "All Projects", icon: Layers, path: "/projects" },
        { name: "Contracts", icon: FileSignature, path: "/contracts" },
        { name: "Time Tracking", icon: Timer, path: "/time-tracking" },
      ],
    },
    {
      title: "Social Media",
      icon: Share2,
      items: [
        { name: "Social Feed", icon: Share2, path: "/social-feed" },
        { name: "Management", icon: BarChart3, path: "/social-management" },
        { name: "Analytics", icon: TrendingUp, path: "/analytics" },
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
    items: [...baseNavigationGroups[0].items] // Deep copy items array
  };
  
  // Add admin panel for admin role
  if (normalizedRole === 'admin') {
    overviewGroup.items.splice(2, 0, ...adminSpecificItems);
  }
  
  groups.push(overviewGroup);
  
  // 2. Add role-specific sections (Career/Hiring/Management)
  const roleSpecific = roleSpecificGroups[normalizedRole];
  if (roleSpecific) {
    // Deep copy each group and its items array to prevent mutations
    const deepCopiedRoleGroups = roleSpecific.map(group => ({
      ...group,
      items: [...group.items]
    }));
    groups.push(...deepCopiedRoleGroups);
  }
  
  // 3. Add communication section with role-specific items
  const communicationGroup = { 
    ...baseNavigationGroups[1],
    items: [...baseNavigationGroups[1].items] // Deep copy the items array
  };
  if (normalizedRole === 'partner') {
    communicationGroup.items.push(...partnerSpecificItems);
  } else if (normalizedRole === 'candidate') {
    communicationGroup.items.push(...candidateSpecificItems);
  }
  groups.push(communicationGroup);
  
  // 4. Add remaining base sections (Learning, AI & Tools, Settings, Support)
  groups.push(baseNavigationGroups[2]); // Learning
  groups.push(baseNavigationGroups[3]); // AI & Tools
  groups.push(baseNavigationGroups[4]); // Settings
  groups.push(baseNavigationGroups[5]); // Support
  
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
