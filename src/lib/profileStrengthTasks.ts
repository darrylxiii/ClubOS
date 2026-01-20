import { LucideIcon, User, Briefcase, GraduationCap, Award, FileText, 
  MessageCircle, Camera, Users, Building2, Target, TrendingUp, Settings, 
  Share2, Calendar, Star, CheckCircle, Globe, Shield, Bell, Heart } from "lucide-react";

export interface ProfileTask {
  key: string;
  title: string;
  description: string;
  level: 1 | 2 | 3 | 4 | 5;
  icon: LucideIcon;
  action?: string;
  actionPath?: string;
  checkComplete?: (userId: string) => Promise<boolean>;
}

// CANDIDATE TASKS - Covering all candidate features
export const CANDIDATE_TASKS: ProfileTask[] = [
  // LEVEL 1 - Essential Setup (Easiest)
  {
    key: "candidate_profile_photo",
    title: "Add Profile Photo",
    description: "Upload a professional photo to help recruiters recognize you",
    level: 1,
    icon: Camera,
    actionPath: "/settings/profile"
  },
  {
    key: "candidate_basic_info",
    title: "Complete Basic Info",
    description: "Add your name, title, and location",
    level: 1,
    icon: User,
    actionPath: "/settings/profile"
  },
  {
    key: "candidate_bio",
    title: "Write Your Bio",
    description: "Tell your professional story in a few sentences",
    level: 1,
    icon: FileText,
    actionPath: "/settings/profile"
  },
  {
    key: "candidate_verify_email",
    title: "Verify Email",
    description: "Confirm your email address for account security",
    level: 1,
    icon: Shield,
    actionPath: "/settings"
  },

  // LEVEL 2 - Professional Profile
  {
    key: "candidate_add_experience",
    title: "Add Work Experience",
    description: "Add at least one previous role",
    level: 2,
    icon: Briefcase,
    actionPath: "/settings/profile"
  },
  {
    key: "candidate_add_education",
    title: "Add Education",
    description: "Include your educational background",
    level: 2,
    icon: GraduationCap,
    actionPath: "/settings/profile"
  },
  {
    key: "candidate_add_skills",
    title: "List Your Skills",
    description: "Add at least 5 professional skills",
    level: 2,
    icon: Award,
    actionPath: "/settings/profile"
  },
  {
    key: "candidate_linkedin_connect",
    title: "Connect LinkedIn",
    description: "Import your LinkedIn profile for faster setup",
    level: 2,
    icon: Globe,
    actionPath: "/settings/profile"
  },

  // LEVEL 3 - Active Engagement
  {
    key: "candidate_first_post",
    title: "Create First Post",
    description: "Share something with the community",
    level: 3,
    icon: Share2,
    actionPath: "/feed"
  },
  {
    key: "candidate_apply_job",
    title: "Apply to Your First Job",
    description: "Browse jobs and submit an application",
    level: 3,
    icon: Target,
    actionPath: "/jobs"
  },
  {
    key: "candidate_send_message",
    title: "Start a Conversation",
    description: "Connect with someone in the network",
    level: 3,
    icon: MessageCircle,
    actionPath: "/messages"
  },
  {
    key: "candidate_add_portfolio",
    title: "Add Portfolio Items",
    description: "Showcase your work with portfolio pieces",
    level: 3,
    icon: FileText,
    actionPath: "/settings/profile"
  },

  // LEVEL 4 - Advanced Features
  {
    key: "candidate_create_story",
    title: "Share Your First Story",
    description: "Post a story to engage your network",
    level: 4,
    icon: Camera,
    actionPath: "/feed"
  },
  {
    key: "candidate_enable_calendar",
    title: "Connect Calendar",
    description: "Sync your calendar for easy interview scheduling",
    level: 4,
    icon: Calendar,
    actionPath: "/scheduling"
  },
  {
    key: "candidate_make_referral",
    title: "Refer Someone",
    description: "Invite talented people to join",
    level: 4,
    icon: Users,
    actionPath: "/referrals"
  },
  {
    key: "candidate_notifications_setup",
    title: "Customize Notifications",
    description: "Set up your notification preferences",
    level: 4,
    icon: Bell,
    actionPath: "/settings"
  },

  // LEVEL 5 - Power User
  {
    key: "candidate_earn_achievement",
    title: "Earn Your First Achievement",
    description: "Complete milestones to earn badges",
    level: 5,
    icon: Star,
    actionPath: "/achievements"
  },
  {
    key: "candidate_complete_profile_100",
    title: "100% Profile Completion",
    description: "Fill out all profile sections completely",
    level: 5,
    icon: CheckCircle,
    actionPath: "/settings/profile"
  },
  {
    key: "candidate_engage_weekly",
    title: "Weekly Activity Streak",
    description: "Stay active for 7 consecutive days",
    level: 5,
    icon: TrendingUp,
    actionPath: "/feed"
  },
  {
    key: "candidate_privacy_optimized",
    title: "Optimize Privacy Settings",
    description: "Review and configure all privacy options",
    level: 5,
    icon: Shield,
    actionPath: "/settings"
  }
];

// PARTNER TASKS - Covering all partner/company features
export const PARTNER_TASKS: ProfileTask[] = [
  // LEVEL 1 - Company Setup (Easiest)
  {
    key: "partner_company_logo",
    title: "Upload Company Logo",
    description: "Add your company branding",
    level: 1,
    icon: Building2,
    actionPath: "/company"
  },
  {
    key: "partner_company_info",
    title: "Complete Company Info",
    description: "Add company name, size, and industry",
    level: 1,
    icon: Building2,
    actionPath: "/company"
  },
  {
    key: "partner_company_description",
    title: "Write Company Description",
    description: "Tell candidates about your company",
    level: 1,
    icon: FileText,
    actionPath: "/company"
  },
  {
    key: "partner_verify_email",
    title: "Verify Email",
    description: "Confirm your email address",
    level: 1,
    icon: Shield,
    actionPath: "/settings"
  },

  // LEVEL 2 - Job Posting
  {
    key: "partner_first_job",
    title: "Post Your First Job",
    description: "Create and publish a job opening",
    level: 2,
    icon: Target,
    actionPath: "/jobs/manage"
  },
  {
    key: "partner_setup_pipeline",
    title: "Configure Pipeline",
    description: "Customize your hiring pipeline stages",
    level: 2,
    icon: TrendingUp,
    actionPath: "/jobs/manage"
  },
  {
    key: "partner_add_team_member",
    title: "Invite Team Members",
    description: "Add colleagues to help with hiring",
    level: 2,
    icon: Users,
    actionPath: "/company/team"
  },
  {
    key: "partner_company_branding",
    title: "Customize Company Branding",
    description: "Add cover image and brand colors",
    level: 2,
    icon: Camera,
    actionPath: "/company"
  },

  // LEVEL 3 - Candidate Management
  {
    key: "partner_review_candidate",
    title: "Review First Candidate",
    description: "Evaluate and provide feedback on a candidate",
    level: 3,
    icon: User,
    actionPath: "/applications"
  },
  {
    key: "partner_send_message",
    title: "Message a Candidate",
    description: "Start a conversation with an applicant",
    level: 3,
    icon: MessageCircle,
    actionPath: "/messages"
  },
  {
    key: "partner_move_pipeline",
    title: "Move Candidate Through Pipeline",
    description: "Advance a candidate to the next stage",
    level: 3,
    icon: TrendingUp,
    actionPath: "/applications"
  },
  {
    key: "partner_add_scorecard",
    title: "Complete First Scorecard",
    description: "Evaluate a candidate with detailed scoring",
    level: 3,
    icon: FileText,
    actionPath: "/applications"
  },

  // LEVEL 4 - Advanced Management
  {
    key: "partner_company_post",
    title: "Create Company Post",
    description: "Share company updates on the feed",
    level: 4,
    icon: Share2,
    actionPath: "/company/wall"
  },
  {
    key: "partner_setup_analytics",
    title: "Review Analytics Dashboard",
    description: "Track your hiring metrics",
    level: 4,
    icon: TrendingUp,
    actionPath: "/analytics"
  },
  {
    key: "partner_linkedin_import",
    title: "Import Jobs from LinkedIn",
    description: "Sync job postings from LinkedIn",
    level: 4,
    icon: Globe,
    actionPath: "/jobs/manage"
  },
  {
    key: "partner_target_companies",
    title: "Add Target Companies",
    description: "Track competitors and talent sources",
    level: 4,
    icon: Target,
    actionPath: "/companies"
  },

  // LEVEL 5 - Optimization
  {
    key: "partner_multiple_jobs",
    title: "Manage 5+ Active Jobs",
    description: "Scale your hiring efforts",
    level: 5,
    icon: Building2,
    actionPath: "/jobs/manage"
  },
  {
    key: "partner_advanced_pipeline",
    title: "Create Custom Pipeline",
    description: "Design role-specific hiring workflows",
    level: 5,
    icon: Settings,
    actionPath: "/jobs/manage"
  },
  {
    key: "partner_team_collaboration",
    title: "Full Team Collaboration",
    description: "Have 3+ team members actively using platform",
    level: 5,
    icon: Users,
    actionPath: "/company/team"
  },
  {
    key: "partner_company_achievements",
    title: "Earn Company Achievements",
    description: "Complete milestones as a company",
    level: 5,
    icon: Award,
    actionPath: "/company"
  }
];

// ADMIN TASKS - Covering all admin features
export const ADMIN_TASKS: ProfileTask[] = [
  // LEVEL 1 - Basic Admin Setup (Easiest)
  {
    key: "admin_profile_complete",
    title: "Complete Admin Profile",
    description: "Set up your admin account details",
    level: 1,
    icon: User,
    actionPath: "/settings/profile"
  },
  {
    key: "admin_understand_roles",
    title: "Review Role System",
    description: "Understand different user roles",
    level: 1,
    icon: Shield,
    actionPath: "/admin"
  },
  {
    key: "admin_verify_account",
    title: "Verify Admin Account",
    description: "Complete email verification",
    level: 1,
    icon: CheckCircle,
    actionPath: "/settings"
  },

  // LEVEL 2 - User Management
  {
    key: "admin_assign_role",
    title: "Assign First Role",
    description: "Grant a role to a user",
    level: 2,
    icon: Users,
    actionPath: "/admin"
  },
  {
    key: "admin_verify_user",
    title: "Verify User Account",
    description: "Approve email or phone verification",
    level: 2,
    icon: Shield,
    actionPath: "/admin"
  },
  {
    key: "admin_manage_company",
    title: "Manage Company Profile",
    description: "Edit or approve a company",
    level: 2,
    icon: Building2,
    actionPath: "/admin"
  },

  // LEVEL 3 - Platform Management
  {
    key: "admin_create_achievement",
    title: "Create Achievement",
    description: "Design and publish a new achievement",
    level: 3,
    icon: Award,
    actionPath: "/admin"
  },
  {
    key: "admin_review_content",
    title: "Moderate Content",
    description: "Review and moderate user posts",
    level: 3,
    icon: FileText,
    actionPath: "/admin"
  },
  {
    key: "admin_analytics_review",
    title: "Review Platform Analytics",
    description: "Check overall platform metrics",
    level: 3,
    icon: TrendingUp,
    actionPath: "/analytics"
  },

  // LEVEL 4 - Advanced Administration
  {
    key: "admin_bulk_operations",
    title: "Perform Bulk Operations",
    description: "Manage multiple users or companies at once",
    level: 4,
    icon: Settings,
    actionPath: "/admin"
  },
  {
    key: "admin_system_config",
    title: "Configure System Settings",
    description: "Adjust platform-wide configurations",
    level: 4,
    icon: Settings,
    actionPath: "/admin"
  },
  {
    key: "admin_user_support",
    title: "Handle User Support Request",
    description: "Resolve a user issue or question",
    level: 4,
    icon: MessageCircle,
    actionPath: "/messages"
  },

  // LEVEL 5 - Platform Mastery
  {
    key: "admin_security_audit",
    title: "Complete Security Audit",
    description: "Review and optimize security settings",
    level: 5,
    icon: Shield,
    actionPath: "/admin"
  },
  {
    key: "admin_growth_strategy",
    title: "Implement Growth Initiative",
    description: "Launch feature or campaign to drive engagement",
    level: 5,
    icon: TrendingUp,
    actionPath: "/admin"
  },
  {
    key: "admin_platform_optimization",
    title: "Optimize Platform Performance",
    description: "Review and improve system metrics",
    level: 5,
    icon: Star,
    actionPath: "/analytics"
  }
];

export function getTasksForRole(role: 'user' | 'partner' | 'admin'): ProfileTask[] {
  switch (role) {
    case 'user':
      return CANDIDATE_TASKS;
    case 'partner':
      return PARTNER_TASKS;
    case 'admin':
      return ADMIN_TASKS;
    default:
      return CANDIDATE_TASKS;
  }
}

export function getTasksByLevel(tasks: ProfileTask[], level: number): ProfileTask[] {
  return tasks.filter(task => task.level === level);
}
