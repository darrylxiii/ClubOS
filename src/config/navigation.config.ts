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
  Share2,
  BarChart3,
  TrendingUp,
  Trophy,
  MessagesSquare,
  GraduationCap,
  ClipboardCheck,
  Mail,
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
      { name: "Home", icon: Home, path: "/home" },
      { name: "Dashboard", icon: BarChart3, path: "/dashboard" },
      { name: "Feed", icon: Rss, path: "/feed" },
      { name: "Achievements", icon: Trophy, path: "/achievements" },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    items: [
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
      { name: "Tasks", icon: ListTodo, path: "/unified-tasks" },
      { name: "Club Radio", icon: Video, path: "/club-dj" },
    ],
  },
  {
    title: "Settings",
    icon: Cog,
    items: [
      { name: "Settings", icon: Settings, path: "/settings" },
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
        { name: "Referrals", icon: Gift, path: "/referrals" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
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
        { name: "Applicants", icon: FileText, path: "/applications" },
        { name: "Companies", icon: Building, path: "/companies" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "Analytics", icon: BarChart3, path: "/analytics" },
        { name: "Social Feed", icon: Share2, path: "/social-feed" },
      ],
    },
  ],
  admin: [
    {
      title: "Management",
      icon: Building,
      items: [
        { name: "All Candidates", icon: Users, path: "/admin/candidates" },
        { name: "Companies", icon: Building, path: "/companies" },
        { name: "Jobs", icon: Briefcase, path: "/jobs" },
        { name: "Applications", icon: FileText, path: "/applications" },
        { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
        { name: "Feedback Database", icon: MessagesSquare, path: "/feedback-database" },
        { name: "Club Sync Requests", icon: Zap, path: "/admin/club-sync-requests" },
        { name: "Funnel Analytics", icon: TrendingUp, path: "/funnel-analytics" },
        { name: "Global Analytics", icon: BarChart3, path: "/admin/analytics" },
        { name: "AI Configuration", icon: Cog, path: "/admin/ai-config" },
        { name: "Social Management", icon: Share2, path: "/social-management" },
        { name: "Social Feed", icon: TrendingUp, path: "/social-feed" },
      ],
    },
  ],
};

// Dashboard path overrides per role
const dashboardPaths: Record<'candidate' | 'partner' | 'admin', string> = {
  candidate: '/dashboard',
  partner: '/partner/dashboard',
  admin: '/admin/dashboard',
};

// Admin panel visibility
const adminSpecificItems: NavigationItem[] = [
  { name: "Admin Panel", icon: Users, path: "/admin" },
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
  
  // 1. Add overview section with correct dashboard
  const overviewGroup = { 
    ...baseNavigationGroups[0],
    items: baseNavigationGroups[0].items.map(item => {
      if (item.path === '/dashboard') {
        return { ...item, path: dashboardPaths[normalizedRole] };
      }
      return item;
    })
  };
  
  // Add admin panel for admin role
  if (normalizedRole === 'admin') {
    overviewGroup.items.splice(2, 0, ...adminSpecificItems);
  }
  
  groups.push(overviewGroup);
  
  // 2. Add role-specific sections (Career/Hiring/Management)
  const roleSpecific = roleSpecificGroups[normalizedRole];
  if (roleSpecific) {
    groups.push(...roleSpecific);
  }
  
  // 3. Add communication section
  groups.push(baseNavigationGroups[1]);
  
  // 4. Add remaining base sections (Learning, AI & Tools, Settings)
  groups.push(baseNavigationGroups[2]); // Learning
  groups.push(baseNavigationGroups[3]); // AI & Tools
  groups.push(baseNavigationGroups[4]); // Settings
  
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
