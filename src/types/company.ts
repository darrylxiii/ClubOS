export interface CompanyBasic {
  id: string;
  name: string;
}

export type FeeType = 'percentage' | 'fixed' | 'hybrid';

export interface Company extends CompanyBasic {
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  tagline: string | null;
  description: string | null;
  company_size: string | null;
  industry: string | null;
  headquarters_location: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  fee_type: FeeType;
  placement_fee_percentage: number | null;
  placement_fee_fixed: number | null;
  default_fee_notes: string | null;
  // Retainer fields
  has_retainer: boolean;
  monthly_retainer_amount: number | null;
  retainer_start_date: string | null;
  retainer_end_date: string | null;
  retainer_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  user_id: string;
  company_id: string;
  role: CompanyRole;
  is_active: boolean;
  joined_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
  companies?: {
    name: string;
  };
}

export type CompanyRole = 'owner' | 'admin' | 'recruiter' | 'member';

export const COMPANY_ROLES: readonly CompanyRole[] = ['owner', 'admin', 'recruiter', 'member'] as const;

export interface CompanyAssignmentFormData {
  userId: string;
  companyId: string;
  role: CompanyRole;
}

export interface CompanyAssignmentValidationError {
  field: keyof CompanyAssignmentFormData;
  message: string;
}

export const validateCompanyAssignment = (
  data: CompanyAssignmentFormData
): CompanyAssignmentValidationError[] => {
  const errors: CompanyAssignmentValidationError[] = [];

  if (!data.userId || data.userId.trim() === '') {
    errors.push({ field: 'userId', message: 'User is required' });
  }

  if (!data.companyId || data.companyId.trim() === '') {
    errors.push({ field: 'companyId', message: 'Company is required' });
  }

  if (!COMPANY_ROLES.includes(data.role)) {
    errors.push({ field: 'role', message: 'Invalid role selected' });
  }

  return errors;
};
