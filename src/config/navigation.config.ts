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

// Role-specific overrides and additions - CONSOLIDATED FOR 50% REDUCTION
const roleSpecificGroups: Record<'candidate' | 'partner' | 'admin', NavigationGroup[]> = {
  candidate: [
    {
      title: "Career",
      icon: Briefcase,
      items: [
        { name: "Jobs", icon: Briefcase, path: "/jobs" },
        { name: "Career Hub", icon: Target, path: "/career" },
        { name: "Referrals", icon: Gift, path: "/referrals" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
      ],
    },
    {
      title: "Club Projects",
      icon: Layers,
      badge: "New",
      items: [
        { name: "Projects Hub", icon: Layers, path: "/projects-hub" },
        { name: "My Contracts", icon: FileSignature, path: "/contracts" },
      ],
    },
  ],
  partner: [
    {
      title: "Hiring",
      icon: Briefcase,
      items: [
        { name: "Jobs", icon: Briefcase, path: "/jobs" },
        { name: "Intelligence Hub", icon: Brain, path: "/hiring-intelligence" },
        { name: "Applicants", icon: FileText, path: "/applications" },
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
        { name: "Projects Hub", icon: Layers, path: "/projects-hub" },
        { name: "Contracts", icon: FileSignature, path: "/contracts" },
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
  ],
  admin: [
    // === BUSINESS DEVELOPMENT (consolidated) ===
    {
      title: "Business Development",
      icon: Contact,
      items: [
        { name: "CRM Dashboard", icon: LayoutDashboard, path: "/crm" },
        { name: "Prospect Pipeline", icon: Target, path: "/crm/prospects" },
        { name: "Campaigns", icon: Zap, path: "/crm/campaigns" },
        { name: "Partner Funnel", icon: Target, path: "/partner-funnel" },
      ],
      roles: ['admin', 'strategist'],
    },
    // === TALENT MANAGEMENT (consolidated into Talent Hub) ===
    {
      title: "Talent Management",
      icon: Users,
      items: [
        { name: "Talent Hub", icon: Sparkles, path: "/admin/talent-hub", badge: "New" },
        { name: "All Jobs", icon: Briefcase, path: "/jobs" },
        { name: "All Companies", icon: Building, path: "/companies" },
        { name: "Member Requests", icon: Users, path: "/admin/member-requests" },
        { name: "Club Sync Requests", icon: Zap, path: "/admin/club-sync-requests" },
        { name: "Email Templates", icon: Mail, path: "/admin/email-templates" },
      ],
    },
    // === ASSESSMENTS & GAMES ===
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
    // === INTELLIGENCE CENTER ===
    {
      title: "Intelligence Center",
      icon: Brain,
      items: [
        { name: "Intelligence Hub", icon: Brain, path: "/admin/intelligence" },
        { name: "Company Intelligence", icon: Building, path: "/company-intelligence" },
        { name: "User Engagement", icon: Activity, path: "/admin/user-engagement" },
        { name: "Feedback Database", icon: MessagesSquare, path: "/admin/feedback" },
      ],
    },
    // === OPERATIONS CENTER (consolidated) ===
    {
      title: "Operations",
      icon: Shield,
      items: [
        { name: "Ops Center", icon: Shield, path: "/admin/ops-center", badge: "New" },
        { name: "Page Templates", icon: FileText, path: "/admin/templates" },
        { name: "AI Configuration", icon: Cog, path: "/admin/ai-configuration" },
      ],
    },
    // === ANALYTICS ===
    {
      title: "Performance Analytics",
      icon: BarChart3,
      items: [
        { name: "Performance Matrix", icon: LayoutDashboard, path: "/admin/performance-matrix" },
        { name: "Team Performance", icon: BarChart3, path: "/team-performance" },
        { name: "User Activity", icon: Activity, path: "/admin/user-activity" },
        { name: "Website KPIs", icon: Globe, path: "/admin/website-kpis" },
      ],
    },
    // === FINANCE (consolidated) ===
    {
      title: "Finance",
      icon: DollarSign,
      items: [
        { name: "Financial Dashboard", icon: CreditCard, path: "/admin/financial" },
        { name: "Deal Pipeline", icon: Target, path: "/admin/deals-pipeline" },
        { name: "Inventory Hub", icon: Database, path: "/admin/inventory-hub", badge: "New" },
        { name: "Moneybird", icon: CreditCard, path: "/admin/moneybird" },
      ],
    },
    // === GOVERNANCE & COMPLIANCE (consolidated) ===
    {
      title: "Governance & Compliance",
      icon: FileCheck,
      items: [
        { name: "Compliance Hub", icon: Shield, path: "/admin/compliance-hub", badge: "New" },
        { name: "Enterprise Management", icon: Building2, path: "/admin/enterprise" },
        { name: "Due Diligence Center", icon: FileCheck, path: "/admin/due-diligence" },
        { name: "Translation Hub", icon: Languages, path: "/admin/translation-hub", badge: "New" },
      ],
    },
    // === CLUB PROJECTS ===
    {
      title: "Club Projects",
      icon: Layers,
      badge: "New",
      items: [
        { name: "All Projects", icon: Layers, path: "/projects" },
        { name: "Post Project", icon: Plus, path: "/projects/new" },
        { name: "Contracts", icon: FileSignature, path: "/contracts" },
      ],
    },
    // === SOCIAL ===
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
