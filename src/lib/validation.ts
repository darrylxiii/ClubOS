/**
 * Validation utilities for form inputs and data
 * Centralized validation logic to ensure consistency across the application
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  if (email.length > 255) {
    return { isValid: false, error: 'Email must be less than 255 characters' };
  }

  return { isValid: true };
};

/**
 * Phone number validation (international format)
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Basic international format check (allows + and digits)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone.replace(/[\s()-]/g, ''))) {
    return { isValid: false, error: 'Invalid phone number format' };
  }

  return { isValid: true };
};

/**
 * OTP/Verification code validation
 */
export const validateOTP = (otp: string, length: number = 6): ValidationResult => {
  if (!otp || otp.trim() === '') {
    return { isValid: false, error: 'Verification code is required' };
  }

  if (otp.length !== length) {
    return { isValid: false, error: `Verification code must be ${length} digits` };
  }

  if (!/^\d+$/.test(otp)) {
    return { isValid: false, error: 'Verification code must contain only digits' };
  }

  return { isValid: true };
};

/**
 * URL validation
 */
export const validateURL = (url: string, required: boolean = false): ValidationResult => {
  if (!url || url.trim() === '') {
    return required 
      ? { isValid: false, error: 'URL is required' }
      : { isValid: true };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

/**
 * LinkedIn URL validation
 */
export const validateLinkedInURL = (url: string, required: boolean = false): ValidationResult => {
  if (!url || url.trim() === '') {
    return required 
      ? { isValid: false, error: 'LinkedIn URL is required' }
      : { isValid: true };
  }

  const linkedInRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/.+/;
  if (!linkedInRegex.test(url)) {
    return { isValid: false, error: 'Invalid LinkedIn URL format' };
  }

  return { isValid: true };
};

/**
 * File validation
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export const validateFile = (
  file: File,
  options: FileValidationOptions = {}
): ValidationResult => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions = ['.pdf', '.doc', '.docx'],
  } = options;

  if (!file) {
    return { isValid: false, error: 'File is required' };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type' };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
    return { 
      isValid: false, 
      error: `Only ${allowedExtensions.join(', ')} files are allowed` 
    };
  }

  return { isValid: true };
};

/**
 * Required field validation
 */
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
};

/**
 * String length validation
 */
export const validateLength = (
  value: string,
  min?: number,
  max?: number,
  fieldName?: string
): ValidationResult => {
  const length = value?.trim().length || 0;

  if (min !== undefined && length < min) {
    return { 
      isValid: false, 
      error: `${fieldName || 'Field'} must be at least ${min} characters` 
    };
  }

  if (max !== undefined && length > max) {
    return { 
      isValid: false, 
      error: `${fieldName || 'Field'} must be less than ${max} characters` 
    };
  }

  return { isValid: true };
};

/**
 * Numeric range validation
 */
export const validateRange = (
  value: number,
  min?: number,
  max?: number,
  fieldName?: string
): ValidationResult => {
  if (min !== undefined && value < min) {
    return { 
      isValid: false, 
      error: `${fieldName || 'Value'} must be at least ${min}` 
    };
  }

  if (max !== undefined && value > max) {
    return { 
      isValid: false, 
      error: `${fieldName || 'Value'} must be at most ${max}` 
    };
  }

  return { isValid: true };
};

/**
 * Batch validation helper
 */
export const validateAll = (
  ...validations: ValidationResult[]
): { isValid: boolean; errors: string[] } => {
  const errors = validations
    .filter(v => !v.isValid)
    .map(v => v.error!)
    .filter(Boolean);

  return {
    isValid: errors.length === 0,
    errors,
  };
};
