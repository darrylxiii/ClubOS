import { 
  Shield, 
  Camera, 
  FileText, 
  Edit, 
  Globe, 
  Calendar, 
  Target, 
  Zap, 
  Users, 
  Bell,
  Phone,
  Mail,
  Briefcase,
  type LucideIcon
} from "lucide-react";
import { differenceInDays } from "date-fns";

export enum CandidateStage {
  NEW_USER = 'new_user',           // 0-24 hours
  PROFILE_BUILDING = 'building',   // 1-7 days
  ACTIVE_CANDIDATE = 'active',     // 7-30 days
  ENGAGED = 'engaged',             // 30+ days, has applications
  INTERVIEWING = 'interviewing',   // Has scheduled interviews
  POWER_USER = 'power_user'        // High engagement, referrals
}

export interface UserJourneyData {
  userId: string;
  signupDate: Date;
  resumeUploaded: boolean;
  calendarConnected: boolean;
  applicationsCount: number;
  interviewsScheduled: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasAvatar: boolean;
  hasLinkedIn: boolean;
  hasBio: boolean;
  hasCareerPreferences: boolean;
  referralsCount: number;
  notificationsConfigured: boolean;
  clubSyncEnabled: boolean;
  lastActive: Date;
}

export interface JourneyTask {
  id: string;
  title: string;
  description: string;
  stage: CandidateStage;
  priority: number;
  icon: LucideIcon;
  taskKey: string;
  actionPath: string;
  estimatedTime?: string;
  impact: 'high' | 'medium' | 'low';
  checkComplete: (data: UserJourneyData) => boolean;
}

// Define all journey tasks for candidates
export const CANDIDATE_JOURNEY_TASKS: JourneyTask[] = [
  // NEW_USER stage (critical onboarding - first 24 hours)
  {
    id: 'verify_email',
    title: 'Verify Your Email',
    description: 'Secure your account and receive notifications',
    stage: CandidateStage.NEW_USER,
    priority: 1,
    icon: Mail,
    taskKey: 'candidate_verify_email',
    actionPath: '/settings?tab=profile&action=verify-email',
    estimatedTime: '1 min',
    impact: 'high',
    checkComplete: (data) => data.emailVerified
  },
  {
    id: 'add_photo',
    title: 'Add Profile Photo',
    description: 'Help recruiters recognize you',
    stage: CandidateStage.NEW_USER,
    priority: 2,
    icon: Camera,
    taskKey: 'candidate_profile_photo',
    actionPath: '/settings?tab=profile&action=upload-avatar',
    estimatedTime: '2 min',
    impact: 'high',
    checkComplete: (data) => data.hasAvatar
  },
  {
    id: 'upload_resume',
    title: 'Upload Your Resume',
    description: 'Let QUIN analyze your experience',
    stage: CandidateStage.NEW_USER,
    priority: 3,
    icon: FileText,
    taskKey: 'candidate_add_resume',
    actionPath: '/settings?tab=connections&action=upload-resume',
    estimatedTime: '3 min',
    impact: 'high',
    checkComplete: (data) => data.resumeUploaded
  },
  
  // PROFILE_BUILDING stage (1-7 days)
  {
    id: 'verify_phone',
    title: 'Verify Phone Number',
    description: 'Enable SMS notifications for urgent updates',
    stage: CandidateStage.PROFILE_BUILDING,
    priority: 4,
    icon: Phone,
    taskKey: 'candidate_verify_phone',
    actionPath: '/settings?tab=profile&action=verify-phone',
    estimatedTime: '2 min',
    impact: 'medium',
    checkComplete: (data) => data.phoneVerified
  },
  {
    id: 'write_bio',
    title: 'Write Your Bio',
    description: 'Tell your professional story in 2-3 sentences',
    stage: CandidateStage.PROFILE_BUILDING,
    priority: 5,
    icon: Edit,
    taskKey: 'candidate_bio',
    actionPath: '/settings?tab=profile&section=bio',
    estimatedTime: '5 min',
    impact: 'high',
    checkComplete: (data) => data.hasBio
  },
  {
    id: 'add_career_prefs',
    title: 'Set Career Preferences',
    description: 'Define your ideal role and work environment',
    stage: CandidateStage.PROFILE_BUILDING,
    priority: 6,
    icon: Briefcase,
    taskKey: 'candidate_career_preferences',
    actionPath: '/settings?tab=profile&section=preferences',
    estimatedTime: '5 min',
    impact: 'high',
    checkComplete: (data) => data.hasCareerPreferences
  },
  {
    id: 'add_linkedin',
    title: 'Connect LinkedIn',
    description: 'Import your professional network',
    stage: CandidateStage.PROFILE_BUILDING,
    priority: 7,
    icon: Globe,
    taskKey: 'candidate_linkedin_connect',
    actionPath: '/settings?tab=connections&section=social',
    estimatedTime: '2 min',
    impact: 'medium',
    checkComplete: (data) => data.hasLinkedIn
  },
  {
    id: 'connect_calendar',
    title: 'Connect Calendar',
    description: 'Enable easy interview scheduling',
    stage: CandidateStage.PROFILE_BUILDING,
    priority: 8,
    icon: Calendar,
    taskKey: 'candidate_enable_calendar',
    actionPath: '/settings?tab=connections&section=calendar',
    estimatedTime: '2 min',
    impact: 'high',
    checkComplete: (data) => data.calendarConnected
  },
  
  // ACTIVE_CANDIDATE stage (7-30 days)
  {
    id: 'apply_first_job',
    title: 'Apply to Your First Job',
    description: 'Start your job search journey',
    stage: CandidateStage.ACTIVE_CANDIDATE,
    priority: 9,
    icon: Target,
    taskKey: 'candidate_apply_job',
    actionPath: '/jobs?filter=recommended',
    estimatedTime: '5 min',
    impact: 'high',
    checkComplete: (data) => data.applicationsCount > 0
  },
  {
    id: 'apply_multiple_jobs',
    title: 'Apply to 3 More Jobs',
    description: 'Increase your chances of landing interviews',
    stage: CandidateStage.ACTIVE_CANDIDATE,
    priority: 10,
    icon: Target,
    taskKey: 'candidate_apply_multiple',
    actionPath: '/jobs?filter=high-match',
    estimatedTime: '15 min',
    impact: 'high',
    checkComplete: (data) => data.applicationsCount >= 3
  },
  {
    id: 'enable_club_sync',
    title: 'Enable Club Sync',
    description: 'Auto-apply to perfect matches',
    stage: CandidateStage.ACTIVE_CANDIDATE,
    priority: 11,
    icon: Zap,
    taskKey: 'candidate_club_sync',
    actionPath: '/jobs?action=enable-club-sync',
    estimatedTime: '2 min',
    impact: 'medium',
    checkComplete: (data) => data.clubSyncEnabled
  },
  
  // ENGAGED stage (30+ days, active)
  {
    id: 'setup_notifications',
    title: 'Customize Notifications',
    description: 'Stay updated on your applications',
    stage: CandidateStage.ENGAGED,
    priority: 12,
    icon: Bell,
    taskKey: 'candidate_notifications',
    actionPath: '/settings?tab=notifications',
    estimatedTime: '3 min',
    impact: 'medium',
    checkComplete: (data) => data.notificationsConfigured
  },
  {
    id: 'make_referral',
    title: 'Refer a Friend',
    description: 'Earn rewards by inviting talent',
    stage: CandidateStage.ENGAGED,
    priority: 13,
    icon: Users,
    taskKey: 'candidate_make_referral',
    actionPath: '/referrals',
    estimatedTime: '3 min',
    impact: 'low',
    checkComplete: (data) => data.referralsCount > 0
  },
  
  // INTERVIEWING stage
  // No specific tasks - focus on interview prep from existing interviews
  
  // POWER_USER stage
  // No additional tasks - user is already highly engaged
];

/**
 * Detect the current stage of a candidate based on their journey data
 */
export function detectCandidateStage(userData: UserJourneyData): CandidateStage {
  const daysSinceSignup = differenceInDays(new Date(), userData.signupDate);
  
  // Interviewing takes precedence
  if (userData.interviewsScheduled > 0) {
    return CandidateStage.INTERVIEWING;
  }
  
  // Power user: high engagement + referrals
  if (userData.referralsCount > 0 && userData.applicationsCount > 5) {
    return CandidateStage.POWER_USER;
  }
  
  // Engaged: has applications and been active 30+ days
  if (userData.applicationsCount > 0 && daysSinceSignup >= 30) {
    return CandidateStage.ENGAGED;
  }
  
  // Active candidate: has applications and 7+ days
  if (userData.applicationsCount > 0 && daysSinceSignup >= 7) {
    return CandidateStage.ACTIVE_CANDIDATE;
  }
  
  // Profile building: 1-7 days
  if (daysSinceSignup >= 1) {
    return CandidateStage.PROFILE_BUILDING;
  }
  
  // New user: first 24 hours
  return CandidateStage.NEW_USER;
}

/**
 * Get next steps for a candidate based on their current stage
 * Returns incomplete tasks prioritized by impact and stage
 */
export function getNextStepsForStage(
  stage: CandidateStage, 
  userData: UserJourneyData
): JourneyTask[] {
  // Get incomplete tasks for current stage
  const currentStageTasks = CANDIDATE_JOURNEY_TASKS.filter(
    task => task.stage === stage && !task.checkComplete(userData)
  );
  
  // Get incomplete tasks from next stage (preview)
  const stageOrder = Object.values(CandidateStage);
  const currentIndex = stageOrder.indexOf(stage);
  const nextStage = stageOrder[currentIndex + 1];
  
  const nextStageTasks = nextStage ? CANDIDATE_JOURNEY_TASKS.filter(
    task => task.stage === nextStage && !task.checkComplete(userData)
  ).slice(0, 2) : []; // Only show 2 preview tasks from next stage
  
  // Combine and sort by priority and impact
  const allTasks = [...currentStageTasks, ...nextStageTasks];
  
  return allTasks
    .sort((a, b) => {
      // First by priority (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by impact (high > medium > low)
      const impactOrder = { high: 0, medium: 1, low: 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    })
    .slice(0, 5); // Show max 5 tasks at a time
}

/**
 * Calculate completion percentage for current stage
 */
export function getStageCompletionPercent(
  stage: CandidateStage,
  userData: UserJourneyData
): number {
  const stageTasks = CANDIDATE_JOURNEY_TASKS.filter(task => task.stage === stage);
  if (stageTasks.length === 0) return 100;
  
  const completedTasks = stageTasks.filter(task => task.checkComplete(userData));
  return Math.round((completedTasks.length / stageTasks.length) * 100);
}

/**
 * Get stage display info
 */
export function getStageInfo(stage: CandidateStage): {
  name: string;
  description: string;
  color: string;
} {
  const stageMap = {
    [CandidateStage.NEW_USER]: {
      name: 'Getting Started',
      description: 'Complete your basic profile',
      color: 'text-blue-500'
    },
    [CandidateStage.PROFILE_BUILDING]: {
      name: 'Building Profile',
      description: 'Add professional details',
      color: 'text-purple-500'
    },
    [CandidateStage.ACTIVE_CANDIDATE]: {
      name: 'Active Job Seeker',
      description: 'Applying to opportunities',
      color: 'text-green-500'
    },
    [CandidateStage.ENGAGED]: {
      name: 'Engaged Member',
      description: 'Active in the community',
      color: 'text-orange-500'
    },
    [CandidateStage.INTERVIEWING]: {
      name: 'Interviewing',
      description: 'In the interview process',
      color: 'text-yellow-500'
    },
    [CandidateStage.POWER_USER]: {
      name: 'Club Champion',
      description: 'Highly engaged member',
      color: 'text-primary'
    }
  };
  
  return stageMap[stage];
}

/**
 * Get all completed tasks count
 */
export function getCompletedTasksCount(userData: UserJourneyData): number {
  return CANDIDATE_JOURNEY_TASKS.filter(task => task.checkComplete(userData)).length;
}

/**
 * Get total tasks count
 */
export function getTotalTasksCount(): number {
  return CANDIDATE_JOURNEY_TASKS.length;
}
