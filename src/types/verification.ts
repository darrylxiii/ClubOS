export interface VerificationState {
  otpSent: boolean;
  isVerifying: boolean;
  isSendingOtp: boolean;
  resendCooldown: number;
  networkError: boolean;
}

export interface VerificationHookReturn extends VerificationState {
  sendOTP: (identifier: string) => Promise<boolean>;
  verifyOTP: (identifier: string, token: string, onSuccess?: () => void) => Promise<boolean>;
  resetVerification: () => void;
}

export interface EmailVerificationProps {
  email: string;
  emailVerified: boolean;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVerificationComplete?: () => void;
  onCancel?: () => void;
  autoSend?: boolean;
}

export interface PhoneVerificationProps {
  phoneNumber: string;
  phoneVerified: boolean;
  onPhoneChange: (value: string | undefined) => void;
  onVerificationComplete?: () => void;
  onCancel?: () => void;
  autoSend?: boolean;
}

export type VerificationType = 'email' | 'phone';
export type VerificationAction = 'send' | 'resend' | 'verify';

export interface VerificationAttempt {
  user_id: string;
  verification_type: VerificationType;
  action: VerificationAction;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface VerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}
