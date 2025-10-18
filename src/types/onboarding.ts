export interface OnboardingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  currentTitle: string;
  linkedin: string;
  currentSalary: string;
  desiredSalary: string;
  noticePeriod: string;
  preferences: string;
}

export interface ReferralMetadata {
  job_title: string;
  company_name: string;
  friend_name?: string;
  friend_current_role?: string;
  friend_linkedin?: string;
  referred_by?: string;
  [key: string]: any; // Allow additional fields
}

export interface InviteCodeData {
  code: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  is_active: boolean;
  expires_at: string;
  referral_metadata?: ReferralMetadata[];
}

export interface OnboardingState {
  formData: OnboardingFormData;
  avatarUrl: string | null;
  resume: File | null;
  referralMetadata: ReferralMetadata | null;
  referrerName: string;
  loading: boolean;
  errors: Partial<Record<keyof OnboardingFormData, string>>;
}

export interface OnboardingValidationError {
  field: keyof OnboardingFormData;
  message: string;
}

export const ONBOARDING_REQUIRED_FIELDS: (keyof OnboardingFormData)[] = [
  'firstName',
  'lastName',
  'email',
  'location',
  'currentTitle',
  'desiredSalary',
];

export const validateOnboardingForm = (
  formData: OnboardingFormData
): OnboardingValidationError[] => {
  const errors: OnboardingValidationError[] = [];

  ONBOARDING_REQUIRED_FIELDS.forEach((field) => {
    if (!formData[field] || formData[field].trim() === '') {
      errors.push({
        field,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
      });
    }
  });

  // Email validation
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  // LinkedIn URL validation (if provided)
  if (formData.linkedin && !/^https?:\/\/(www\.)?linkedin\.com\/in\/.+/.test(formData.linkedin)) {
    errors.push({ field: 'linkedin', message: 'Invalid LinkedIn URL format' });
  }

  return errors;
};
