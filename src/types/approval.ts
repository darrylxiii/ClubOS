export interface MemberRequest {
  id: string;
  request_type: 'candidate' | 'partner';
  name: string;
  email: string;
  phone: string | null;
  title_or_company: string | null;
  location: string | null;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  resume_url: string | null;
  linkedin_url: string | null;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  profiles?: {
    current_title?: string;
    linkedin_url?: string;
    location?: string;
  };
}

export interface MergeSuggestionForApproval {
  candidate_id: string;
  candidate_name: string | null;
  candidate_email: string;
  candidate_created_at: string;
  profile_id: string;
  profile_name: string | null;
  confidence_score: number | null;
  match_type: 'email_match' | 'partial_link' | 'manual';
}

export interface CandidateProfileData {
  full_name: string;
  email: string;
  phone?: string | null;
  current_title?: string;
  linkedin_url?: string | null;
  location?: string | null;
  skills?: string[];
  years_of_experience?: number;
  desired_salary_min?: number;
  desired_salary_max?: number;
  remote_work_preference?: boolean;
  notice_period?: string;
  source_channel: string;
  source_metadata?: any;
  created_by: string;
}

export interface JobAssignment {
  jobId: string;
  companyId: string;
}

export interface ApprovalWorkflowData {
  requestId: string;
  adminId: string;
  mergeActions: Array<{ candidateId: string; userId: string }>;
  createProfile?: CandidateProfileData;
  assignToJob?: JobAssignment;
  sendNotifications: { email: boolean; sms: boolean };
}

export interface ApprovalWorkflowResult {
  success: boolean;
  message: string;
  candidateId?: string;
  applicationId?: string;
  errors?: string[];
}

export type ApprovalStep = 
  | 'detect'
  | 'create'
  | 'confirm';
