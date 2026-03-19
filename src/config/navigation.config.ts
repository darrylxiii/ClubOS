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
  Package,
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
  Zap as ZapIcon,
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
      { name: "Academy", icon: GraduationCap, path: "/academy", locked: true, lockedMessage: "Releasing soon" },
      { name: "Blog", icon: BookOpen, path: "/blog" },
    ],
  },
  {
    title: "AI & Tools",
    icon: Zap,
    items: [
      { name: "Club AI", icon: Sparkles, path: "/club-ai" },
      { name: "Club Pilot", icon: Sparkles, path: "/club-pilot" },
      { name: "Tasks", icon: ListTodo, path: "/tasks" },
      { name: "Club Radio", icon: Video, path: "/club-dj" },
    ],
  },
  {
    title: "OS Notes",
    icon: NotebookPen,
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
        { name: "My Analytics", icon: BarChart3, path: "/analytics" },
        { name: "Referrals & Invites", icon: Gift, path: "/referrals" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "My Communications", icon: MessageSquare, path: "/profile?tab=communications" },
      ],
    },
    {
      title: "Club Projects",
      icon: Layers,
      badge: "Soon",
      items: [
        { name: "Browse Projects", icon: Layers, path: "/projects", locked: true, lockedMessage: "Releasing soon" },
        { name: "Freelancer Setup", icon: User, path: "/projects/freelancer/setup", locked: true, lockedMessage: "Releasing soon" },
        { name: "Gig Marketplace", icon: Briefcase, path: "/projects/gigs", locked: true, lockedMessage: "Releasing soon" },
        { name: "My Proposals", icon: FileText, path: "/projects/proposals", locked: true, lockedMessage: "Releasing soon" },
        { name: "My Contracts", icon: FileSignature, path: "/contracts", locked: true, lockedMessage: "Releasing soon" },
        { name: "Time Tracking", icon: Timer, path: "/time-tracking", locked: true, lockedMessage: "Releasing soon" },
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
        { name: "Companies", icon: Building, path: "/companies" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "Partner Hub", icon: LayoutDashboard, path: "/partner/hub" },
      ],
    },
    {
      title: "Club Projects",
      icon: Layers,
      badge: "Soon",
      items: [
        { name: "Browse Projects", icon: Layers, path: "/projects", locked: true, lockedMessage: "Releasing soon" },
        { name: "Post Project", icon: Plus, path: "/projects/new", locked: true, lockedMessage: "Releasing soon" },
        { name: "Find Talent", icon: Users, path: "/projects/talent", locked: true, lockedMessage: "Releasing soon" },
        { name: "Contracts", icon: FileSignature, path: "/contracts", locked: true, lockedMessage: "Releasing soon" },
        { name: "Time Tracking", icon: Timer, path: "/time-tracking", locked: true, lockedMessage: "Releasing soon" },
      ],
    },
  ],
  admin: [
    // === CRM & OUTREACH (consolidated from 2 groups into 1) ===
    {
      title: "CRM & Outreach",
      icon: Contact,
      items: [
        { name: "CRM Dashboard", icon: LayoutDashboard, path: "/crm" },
        { name: "Pipeline", icon: Target, path: "/crm/prospects" },
        { name: "Reply Inbox", icon: Mail, path: "/crm/inbox" },
        { name: "Campaigns", icon: Zap, path: "/crm/campaigns" },
        { name: "Analytics", icon: BarChart3, path: "/crm/analytics" },
        { name: "CRM Settings", icon: Settings, path: "/crm/settings" },
      ],
      roles: ['admin', 'strategist'],
    },
    // === PARTNERSHIPS ===
    {
      title: "Partnerships",
      icon: Zap,
      items: [
        { name: "WhatsApp Hub", icon: Phone, path: "/admin/whatsapp", badge: "New" },
        { name: "WhatsApp Booking", icon: Calendar, path: "/admin/whatsapp-booking" },
        { name: "Partner Funnel", icon: Target, path: "/partner-funnel" },
        { name: "Partner Relationships", icon: Link2, path: "/partner/relationships" },
        { name: "Relationships Dashboard", icon: Building2, path: "/admin/company-relationships" },
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
        { name: "Job Approvals", icon: FileCheck, path: "/admin/job-approvals" },
        { name: "All Companies", icon: Building, path: "/companies" },
        { name: "Target Companies", icon: Target, path: "/admin/target-companies" },
        { name: "Member Management", icon: Users, path: "/admin/talent-hub" },
      ],
    },
    // === ASSESSMENTS & GAMES (consolidated into single hub) ===
    {
      title: "Assessments & Games",
      icon: Gamepad2,
      items: [
        { name: "Assessments Hub", icon: ClipboardCheck, path: "/admin/assessments-hub" },
      ],
    },
    // === ANALYTICS & INTELLIGENCE (streamlined: RAG + ML merged into AI Analytics Hub) ===
    {
      title: "Analytics & Intelligence",
      icon: Brain,
      items: [
        { name: "Global Analytics", icon: BarChart3, path: "/admin/global-analytics" },
        { name: "Performance Hub", icon: BarChart3, path: "/admin/performance-hub" },
        { name: "Communication Hub", icon: MessageSquare, path: "/admin/communication-hub" },
        { name: "Meeting Analytics", icon: Video, path: "/meeting-intelligence" },
        { name: "AI Analytics Hub", icon: Brain, path: "/admin/ai-analytics" },
      ],
    },
    // === AGENTIC OS (new autonomous system) ===
    {
      title: "Agentic OS",
      icon: ZapIcon,
      badge: "New",
      items: [
        { name: "Agentic OS Hub", icon: ZapIcon, path: "/admin/agentic-os" },
      ],
    },
    // === OPERATIONS - Core (streamlined for efficiency) ===
    {
      title: "Operations",
      icon: Shield,
      items: [
        { name: "KPI Command Center", icon: BarChart3, path: "/admin/kpi-command-center" },
        { name: "Edge Function Command Center", icon: Zap, path: "/admin/edge-functions" },
        { name: "Feature Control Center", icon: Zap, path: "/admin/feature-control" },
        { name: "Employee Dashboard", icon: Users, path: "/admin/employee-management" },
        { name: "System Health", icon: Heart, path: "/admin/system-health" },
        { name: "Bulk Operations", icon: Users, path: "/admin/bulk-operations" },
        { name: "Avatar Traffic Control", icon: Radio, path: "/admin/avatar-control" },
        { name: "Page Templates", icon: FileText, path: "/admin/templates" },
        { name: "AI Configuration", icon: Cog, path: "/admin/ai-configuration" },
        { name: "Blog Engine", icon: Edit, path: "/admin/blog-engine" },
      ],
    },
    // === SECURITY & MONITORING (consolidated into Security Hub) ===
    {
      title: "Security & Monitoring",
      icon: Shield,
      items: [
        { name: "Security Hub", icon: Shield, path: "/admin/security" },
      ],
    },
    // === FINANCE ===
    {
      title: "Finance",
      icon: DollarSign,
      items: [
        { name: "Finance Hub", icon: DollarSign, path: "/admin/finance" },
        { name: "Inventory Hub", icon: Package, path: "/admin/inventory" },
      ],
    },
    // === GOVERNANCE (consolidated: 5 compliance pages into Compliance Hub) ===
    {
      title: "Governance",
      icon: FileCheck,
      items: [
        { name: "Compliance Hub", icon: Shield, path: "/compliance" },
        { name: "Enterprise Management", icon: Building2, path: "/admin/enterprise" },
        { name: "Due Diligence Center", icon: FileCheck, path: "/admin/due-diligence" },
        { name: "Risk Management", icon: Shield, path: "/admin/risk-management" },
        { name: "Translations Hub", icon: Languages, path: "/admin/translations" },
      ],
    },
    // === CLUB PROJECTS (kept separate - distinct domain) ===
    {
      title: "Club Projects",
      icon: Layers,
      badge: "Soon",
      items: [
        { name: "All Projects", icon: Layers, path: "/projects", locked: true, lockedMessage: "Releasing soon" },
        { name: "Post Project", icon: Plus, path: "/projects/new", locked: true, lockedMessage: "Releasing soon" },
        { name: "Gig Marketplace", icon: Briefcase, path: "/projects/gigs", locked: true, lockedMessage: "Releasing soon" },
        { name: "All Proposals", icon: FileText, path: "/projects/proposals", locked: true, lockedMessage: "Releasing soon" },
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
  { name: "Expert Marketplace", icon: GraduationCap, path: "/expert-marketplace" },
];

// Candidate-specific items
const candidateSpecificItems: NavigationItem[] = [
  { name: "Meeting Intelligence", icon: Video, path: "/meeting-intelligence" },
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
