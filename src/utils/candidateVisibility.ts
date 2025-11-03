/**
 * Determines which candidate fields are visible to partners based on:
 * - Whether candidate applied to partner's job
 * - Candidate's public_fields settings
 * - Candidate's stealth mode
 */

export interface VisibilityRules {
  fullName: boolean;
  email: boolean;
  phone: boolean;
  currentTitle: boolean;
  currentCompany: boolean;
  yearsOfExperience: boolean;
  skills: boolean;
  linkedIn: boolean;
  github: boolean;
  location: boolean;
  desiredSalary: boolean;
  currentSalary: boolean;
  resumeUrl: boolean;
  noticePeriod: boolean;
  remotePreference: boolean;
  employmentType: boolean;
  avatar: boolean;
}

export function getVisibleFields(
  application: any,
  currentCompanyId: string,
  userRole: string
): VisibilityRules {
  // Admins and strategists see everything
  if (userRole === 'admin' || userRole === 'strategist') {
    return {
      fullName: true,
      email: true,
      phone: true,
      currentTitle: true,
      currentCompany: true,
      yearsOfExperience: true,
      skills: true,
      linkedIn: true,
      github: true,
      location: true,
      desiredSalary: true,
      currentSalary: true,
      resumeUrl: true,
      noticePeriod: true,
      remotePreference: true,
      employmentType: true,
      avatar: true,
    };
  }

  const candidate = application.candidate_profiles;
  const profile = application.profiles;
  const publicFields = profile?.public_fields || [];
  const appliedToOurJob = application.job?.company_id === currentCompanyId || 
                           application.jobs?.company_id === currentCompanyId;
  const stealthMode = profile?.stealth_mode_enabled || false;

  // If in stealth mode and didn't apply to our job, very limited visibility
  if (stealthMode && !appliedToOurJob) {
    return {
      fullName: false,
      email: false,
      phone: false,
      currentTitle: false,
      currentCompany: false,
      yearsOfExperience: true,
      skills: true,
      linkedIn: false,
      github: false,
      location: false,
      desiredSalary: false,
      currentSalary: false,
      resumeUrl: false,
      noticePeriod: false,
      remotePreference: true,
      employmentType: true,
      avatar: false,
    };
  }

  // Default visibility rules
  return {
    // Always visible if applied to our job
    fullName: true,
    email: appliedToOurJob,
    phone: appliedToOurJob || publicFields.includes('phone'),
    currentTitle: true,
    currentCompany: appliedToOurJob || publicFields.includes('current_company'),
    yearsOfExperience: true,
    skills: true,
    linkedIn: true,
    github: true,
    location: true,
    
    // Salary information
    desiredSalary: appliedToOurJob || publicFields.includes('salary'),
    currentSalary: publicFields.includes('current_salary'),
    
    // Documents and preferences
    resumeUrl: appliedToOurJob,
    noticePeriod: appliedToOurJob || publicFields.includes('notice_period'),
    remotePreference: true,
    employmentType: true,
    avatar: true,
  };
}

/**
 * Filters candidate data based on visibility rules
 */
export function filterCandidateData(candidate: any, visibility: VisibilityRules) {
  return {
    ...candidate,
    full_name: visibility.fullName ? candidate.full_name : 'Candidate',
    email: visibility.email ? candidate.email : undefined,
    phone: visibility.phone ? candidate.phone : undefined,
    current_company: visibility.currentCompany ? candidate.current_company : 'Confidential',
    current_salary_min: visibility.currentSalary ? candidate.current_salary_min : undefined,
    current_salary_max: visibility.currentSalary ? candidate.current_salary_max : undefined,
    desired_salary_min: visibility.desiredSalary ? candidate.desired_salary_min : undefined,
    desired_salary_max: visibility.desiredSalary ? candidate.desired_salary_max : undefined,
    resume_url: visibility.resumeUrl ? candidate.resume_url : undefined,
    avatar_url: visibility.avatar ? candidate.avatar_url : undefined,
    linkedin_url: visibility.linkedIn ? candidate.linkedin_url : undefined,
    github_url: visibility.github ? candidate.github_url : undefined,
  };
}
