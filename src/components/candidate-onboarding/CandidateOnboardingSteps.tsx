/**
 * CandidateOnboardingSteps - Multi-step onboarding wizard for candidates
 * 
 * @description Enterprise-grade onboarding flow with:
 * - Email/Phone verification via OTP
 * - Progressive data collection across 6 steps
 * - Session recovery for cross-device continuation
 * - GDPR consent on final step
 * - Full i18n support (EN/NL)
 * 
 * @example
 * <CandidateOnboardingSteps />
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { migrateToast as toast } from "@/lib/notify";
import { ArrowRight, ArrowLeft, CheckCircle, User, Briefcase, Target, DollarSign, MapPin, Phone, Upload, X, Mail, Lock, AlertCircle, Shield, Wifi, WifiOff } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useCountryDetection } from "@/hooks/useCountryDetection";
import { useResumeUpload } from "@/hooks/useResumeUpload";
import { Slider } from "@/components/ui/slider";
import { CandidateApplicationTracker } from "./CandidateApplicationTracker";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { ExitIntentPopup, useExitIntent } from "@/components/partner-funnel/ExitIntentPopup";
import { FunnelErrorBoundary } from "@/components/partner-funnel/FunnelErrorBoundary";
import { ProgressSaver } from "@/components/partner-funnel/ProgressSaver";
import { SessionRecoveryBanner } from "@/components/partner-funnel/SessionRecoveryBanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STEPS = ["contact", "professional", "career", "compensation", "preferences", "password"];

export function CandidateOnboardingSteps() {
  const { t } = useTranslation('onboarding');
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(true);
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cityRadius, setCityRadius] = useState(25);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gdprConsent, setGdprConsent] = useState(false);
  
  const { uploadResume, isUploading: isUploadingResume, validateFile } = useResumeUpload();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  
  const { 
    sendOTP, 
    verifyOTP, 
    otpSent, 
    isVerifying, 
    isSendingOtp,
    resendCooldown 
  } = usePhoneVerification();
  
  const { 
    sendOTP: sendEmailOTP, 
    verifyOTP: verifyEmailOTP, 
    otpSent: emailOtpSent, 
    isVerifying: isVerifyingEmail, 
    isSendingOtp: isSendingEmailOtp,
    resendCooldown: emailResendCooldown 
  } = useEmailVerification();
  
  const { countryCode } = useCountryDetection();

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailExistsDialog, setShowEmailExistsDialog] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    current_title: "",
    linkedin_url: "",
    bio: "",
    resume_url: "",
    resume_filename: "",
    dream_job_title: "",
    employment_type: "fulltime" as "fulltime" | "freelance" | "both",
    notice_period: "2_weeks",
    remote_work_aspiration: false,
    current_salary_min: 50000,
    current_salary_max: 70000,
    salary_preference_hidden: false,
    desired_salary_min: 70000,
    desired_salary_max: 90000,
    freelance_hourly_rate_min: 50,
    freelance_hourly_rate_max: 100,
    remote_work_preference: false,
    preferred_work_locations: [] as Array<{ city: string; country: string; radius_km: number }>,
  });

  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const { reset: resetExitIntent } = useExitIntent(
    currentStep > 0 && currentStep < 5,
    () => setExitIntentOpen(true)
  );

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Mark as critical flow to prevent PWA auto-reload
  useEffect(() => {
    sessionStorage.setItem('pwa-critical-flow-active', 'true');
    
    return () => {
      sessionStorage.removeItem('pwa-critical-flow-active');
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'Enter' && currentStep < 5) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape' && currentStep > 0) {
        e.preventDefault();
        handleBack();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, emailVerified, phoneVerified]);

  useEffect(() => {
    trackStep("view");
  }, [currentStep]);

  const trackStep = async (action: string) => {
    const timeOnStep = Math.floor((Date.now() - stepStartTime) / 1000);
    
    await supabase.from("funnel_analytics").insert({
      session_id: sessionId,
      step_number: currentStep,
      step_name: STEPS[currentStep],
      action,
      time_on_step_seconds: timeOnStep,
      source_channel: new URLSearchParams(window.location.search).get("source") || "direct",
      utm_source: new URLSearchParams(window.location.search).get("utm_source"),
      utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
      utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
      user_agent: navigator.userAgent,
    });

    if (action === "complete") {
      setStepStartTime(Date.now());
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      setIsCheckingEmail(true);
      const { data, error } = await supabase.functions.invoke('check-email-exists', {
        body: { email }
      });

      if (error) {
        console.error('Error checking email:', error);
        return false;
      }

      return data?.exists || false;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleNavigateToLogin = () => {
    const encodedEmail = encodeURIComponent(formData.email);
    navigate(`/auth?email=${encodedEmail}`);
  };

  const savePartialProgress = async (completedStep: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const partialData: any = {};
      
      if (completedStep >= 0) {
        partialData.full_name = formData.full_name;
        partialData.email = formData.email;
        partialData.phone = phoneNumber;
        partialData.location = formData.location;
        partialData.email_verified = emailVerified;
        partialData.phone_verified = phoneVerified;
      }
      
      if (completedStep >= 1) {
        partialData.current_title = formData.current_title;
        partialData.linkedin_url = formData.linkedin_url;
        partialData.bio = formData.bio;
        partialData.resume_url = formData.resume_url;
        partialData.resume_filename = formData.resume_filename;
      }
      
      if (completedStep >= 2) {
        partialData.dream_job_title = formData.dream_job_title;
        partialData.employment_type = formData.employment_type;
        partialData.notice_period = formData.notice_period;
        partialData.remote_work_aspiration = formData.remote_work_aspiration;
        partialData.preferred_work_locations = formData.preferred_work_locations;
      }
      
      if (completedStep >= 3) {
        partialData.current_salary_min = formData.current_salary_min;
        partialData.current_salary_max = formData.current_salary_max;
        partialData.desired_salary_min = formData.desired_salary_min;
        partialData.desired_salary_max = formData.desired_salary_max;
        partialData.freelance_hourly_rate_min = formData.freelance_hourly_rate_min;
        partialData.freelance_hourly_rate_max = formData.freelance_hourly_rate_max;
        partialData.salary_preference_hidden = formData.salary_preference_hidden;
      }
      
      if (completedStep >= 4) {
        partialData.remote_work_preference = formData.remote_work_preference;
      }

      await supabase
        .from('profiles')
        .update({
          onboarding_current_step: completedStep + 1,
          onboarding_partial_data: partialData,
          onboarding_last_activity_at: new Date().toISOString()
        })
        .eq('id', user.id);

      console.log(`[Onboarding] Saved progress for step ${completedStep + 1}`);
    } catch (err) {
      console.error('[Onboarding] Failed to save partial progress:', err);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!formData.email || !formData.full_name) {
        toast({ 
          title: t('candidate.messages.missingInfo', 'Missing information'), 
          description: t('candidate.messages.fillRequiredFields', 'Please fill in all required fields'),
          variant: "destructive"
        });
        return;
      }

      if (!emailVerified) {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          setShowEmailExistsDialog(true);
          return;
        }

        const success = await sendEmailOTP(formData.email);
        if (success) {
          toast({ 
            title: t('candidate.messages.verificationCodeSent', 'Verification code sent'), 
            description: t('candidate.messages.checkEmailForCode', 'Please check your email and enter the code below') 
          });
        }
      }
      return;
    }

    if (currentStep === 4 && !phoneVerified) {
      if (!phoneNumber) {
        toast({ title: t('candidate.messages.pleaseEnterPhone', 'Please enter your phone number'), variant: "destructive" });
        return;
      }
      
      const success = await sendOTP(phoneNumber);
      if (!success) {
        return;
      }
      toast({ 
        title: t('candidate.messages.verificationCodeSent', 'Verification code sent'), 
        description: t('candidate.messages.checkPhoneForCode', 'Please check your phone and enter the code below') 
      });
      return;
    }
    
    if (!validateStep()) return;
    
    await savePartialProgress(currentStep);
    await trackStep("complete");
    setCurrentStep(currentStep + 1);
  };

  const handleBack = async () => {
    await trackStep("abandon");
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_current_step: currentStep,
          onboarding_last_activity_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }
    
    setCurrentStep(currentStep - 1);
  };

  const validateStep = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    switch (currentStep) {
      case 0:
        if (!formData.full_name || !formData.email) {
          toast({ title: t('candidate.messages.fillRequiredFields', 'Please fill in all required fields'), variant: "destructive" });
          return false;
        }
        if (!emailRegex.test(formData.email)) {
          toast({ title: t('candidate.validation.invalidEmail', 'Please enter a valid email address'), variant: "destructive" });
          return false;
        }
        if (!emailVerified) {
          toast({ title: t('candidate.validation.pleaseVerifyEmail', 'Please verify your email address first'), variant: "destructive" });
          return false;
        }
        break;
      case 1:
        if (!formData.current_title) {
          toast({ title: t('candidate.messages.enterCurrentTitle', 'Please enter your current job title'), variant: "destructive" });
          return false;
        }
        break;
      case 2:
        if (!formData.dream_job_title) {
          toast({ title: t('candidate.messages.enterDreamJob', 'Please enter your dream job title'), variant: "destructive" });
          return false;
        }
        break;
      case 4:
        if (!phoneVerified) {
          toast({ title: t('candidate.validation.pleaseVerifyPhone', 'Please verify your phone number'), variant: "destructive" });
          return false;
        }
        break;
      case 5:
        if (!gdprConsent) {
          toast({ title: t('candidate.validation.consentRequired', 'Please accept the Privacy Policy and Terms of Service'), variant: "destructive" });
          return false;
        }
        if (!password || password.length < 12) {
          toast({ title: t('candidate.validation.passwordTooShort', 'Please create a strong password'), variant: "destructive" });
          return false;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
          toast({ title: t('candidate.validation.weakPassword', 'Password must meet all requirements'), variant: "destructive" });
          return false;
        }
        if (password !== confirmPassword) {
          toast({ title: t('candidate.validation.passwordMismatch', 'Passwords do not match'), variant: "destructive" });
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!gdprConsent) {
      toast({ 
        title: "Consent required", 
        description: "Please accept the Privacy Policy and Terms of Service",
        variant: "destructive" 
      });
      return;
    }

    if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || 
        !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      toast({ 
        title: "Invalid password", 
        description: "Please meet all password requirements",
        variant: "destructive" 
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    try {
      const timeToComplete = Math.floor((Date.now() - startTime) / 1000);

      console.log('[Onboarding] Starting account creation for:', formData.email);

      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
          data: {
            full_name: formData.full_name,
            phone: phoneNumber,
            email_verified: true,
            phone_verified: true,
            gdpr_consent_at: new Date().toISOString(),
          }
        }
      });

      if (signupError) {
        console.error('[Onboarding] Signup error:', signupError);
        throw signupError;
      }
      
      if (!authData.user) {
        console.error('[Onboarding] No user returned from signup');
        throw new Error("Failed to create account");
      }

      console.log('[Onboarding] Auth account created, user ID:', authData.user.id);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single();

      if (profileCheckError || !existingProfile) {
        console.error('[Onboarding] Profile not found after signup:', profileCheckError);
        throw new Error("Profile creation failed. Please contact support.");
      }

      console.log('[Onboarding] Profile verified, updating with onboarding data');

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumber || null,
          phone_verified: !!phoneNumber,
          email_verified: true,
          location: formData.location || null,
          current_title: formData.current_title,
          linkedin_url: formData.linkedin_url || null,
          career_preferences: formData.bio || null,
          employment_type_preference: formData.employment_type,
          notice_period: formData.notice_period,
          current_salary_min: formData.salary_preference_hidden ? null : formData.current_salary_min,
          current_salary_max: formData.salary_preference_hidden ? null : formData.current_salary_max,
          salary_preference_hidden: formData.salary_preference_hidden,
          desired_salary_min: formData.desired_salary_min,
          desired_salary_max: formData.desired_salary_max,
          freelance_hourly_rate_min: formData.freelance_hourly_rate_min,
          freelance_hourly_rate_max: formData.freelance_hourly_rate_max,
          remote_work_preference: formData.remote_work_preference,
          remote_work_aspiration: formData.remote_work_aspiration,
          preferred_work_locations: formData.preferred_work_locations,
          resume_url: formData.resume_url || null,
          resume_filename: formData.resume_filename || null,
          onboarding_completed_at: new Date().toISOString(),
          account_status: 'pending',
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error("[Onboarding] Profile update error:", profileError);
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      console.log('[Onboarding] Profile updated successfully');

      if (formData.resume_url) {
        try {
          const oldPath = formData.resume_url.split('/resumes/')[1];
          const fileName = oldPath.split('/')[1];
          const newPath = `${authData.user.id}/${fileName}`;
          
          const { error: copyError } = await supabase.storage
            .from('resumes')
            .copy(oldPath, newPath);
          
          if (!copyError) {
            await supabase.storage.from('resumes').remove([oldPath]);
            
            const { data: { publicUrl } } = supabase.storage
              .from('resumes')
              .getPublicUrl(newPath);
            
            formData.resume_url = publicUrl;
          }
        } catch (error) {
          console.error('Error moving resume:', error);
        }
      }

      console.log('[Onboarding] Checking auto-merge setting');

      const { data: autoMergeSetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'auto_merge_enabled')
        .single();

      const autoMergeEnabled = autoMergeSetting?.setting_value === true;
      console.log('[Onboarding] Auto-merge enabled:', autoMergeEnabled);

      const { data: existingCandidate, error: checkError } = await supabase
        .from('candidate_profiles')
        .select('id, user_id, email, full_name')
        .eq('email', formData.email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check candidate profile: ${checkError.message}`);
      }

      if (existingCandidate) {
        console.log('[Onboarding] Found existing candidate profile');
        
        if (existingCandidate.user_id && existingCandidate.user_id !== authData.user.id) {
          throw new Error('This email is already linked to another account. Please contact support at hello@thequantumclub.com');
        }
        
        if (autoMergeEnabled) {
          console.log('[Onboarding] Auto-merge enabled, initiating merge');
          
          const { error: mergeError } = await supabase.functions.invoke('merge-candidate-profile', {
            body: {
              candidateId: existingCandidate.id,
              userId: authData.user.id,
              mergeType: 'auto',
            }
          });
          
          if (mergeError) {
            console.error('[Onboarding] Merge failed:', mergeError);
            throw new Error(`Failed to link your profile: ${mergeError.message}`);
          }
          
          console.log('[Onboarding] Profile merged successfully');
          
          const { error: updateError } = await supabase
            .from('candidate_profiles')
            .update({
              phone: phoneNumber,
              current_title: formData.current_title,
              linkedin_url: formData.linkedin_url,
              notice_period: formData.notice_period,
              current_salary_min: formData.salary_preference_hidden ? null : formData.current_salary_min,
              current_salary_max: formData.salary_preference_hidden ? null : formData.current_salary_max,
              salary_preference_hidden: formData.salary_preference_hidden,
              desired_salary_min: formData.desired_salary_min,
              desired_salary_max: formData.desired_salary_max,
              remote_work_aspiration: formData.remote_work_aspiration,
              resume_filename: formData.resume_filename,
              resume_url: formData.resume_url,
              invitation_status: 'registered',
            })
            .eq('id', existingCandidate.id);
            
          if (updateError) {
            console.error('[Onboarding] Update after merge failed:', updateError);
          }
          
        } else {
          console.log('[Onboarding] Auto-merge disabled, skipping candidate profile creation');
          console.log('[Onboarding] User account created, but candidate profile will need manual linking');
          
          await supabase.from('candidate_interactions').insert({
            candidate_id: existingCandidate.id,
            interaction_type: 'note',
            interaction_direction: 'internal',
            title: 'User account created - needs manual merge',
            notes: `User ${authData.user.email} created an account. Auto-merge was disabled. Admin needs to manually link this candidate profile via Merge Dashboard.`,
            created_by: authData.user.id,
            visible_to_candidate: false
          });
        }
        
      } else {
        console.log('[Onboarding] Creating new candidate profile');
        
        const { error: insertError } = await supabase
          .from('candidate_profiles')
          .insert({
            email: formData.email,
            full_name: formData.full_name,
            user_id: authData.user.id,
            phone: phoneNumber,
            current_title: formData.current_title,
            linkedin_url: formData.linkedin_url,
            notice_period: formData.notice_period,
            current_salary_min: formData.salary_preference_hidden ? null : formData.current_salary_min,
            current_salary_max: formData.salary_preference_hidden ? null : formData.current_salary_max,
            salary_preference_hidden: formData.salary_preference_hidden,
            desired_salary_min: formData.desired_salary_min,
            desired_salary_max: formData.desired_salary_max,
            remote_work_aspiration: formData.remote_work_aspiration,
            resume_filename: formData.resume_filename,
            resume_url: formData.resume_url,
            application_status: 'applied',
            source_channel: 'integrated_funnel',
            invitation_status: 'registered',
          });
          
        if (insertError) {
          console.error('[Onboarding] Candidate profile creation error:', insertError);
          throw new Error(`Failed to create candidate profile: ${insertError.message}`);
        }
        
        console.log('[Onboarding] New candidate profile created successfully');
      }

      await trackStep("complete");

      await supabase.auth.signOut();

      toast({ 
        title: "Application submitted!", 
        description: "Darryl will review your application within 24-48 hours" 
      });

      setCurrentStep(6);

      setTimeout(() => {
        navigate("/pending-approval");
      }, 2000);

    } catch (error: any) {
      console.error('[Onboarding] Account creation error:', error);
      
      try {
        await supabase.from('funnel_analytics').insert({
          session_id: sessionId,
          step_number: 999,
          step_name: 'account_creation_error',
          action: 'error',
          error_details: {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            step: 'handleSubmit',
            formData: {
              email: formData.email,
              full_name: formData.full_name,
              phone: phoneNumber,
            }
          }
        });
      } catch (logError) {
        console.error('[Onboarding] Failed to log error:', logError);
      }

      toast({ 
        title: "Account creation failed", 
        description: error.message?.includes('already linked') 
          ? "This email is already associated with another account. Please contact support@thequantumclub.com"
          : error.message?.includes('link your profile')
          ? "We found your profile but couldn't complete the merge. Please try again or contact support."
          : error.message || "An unexpected error occurred. Please try again or contact support.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPreferredLocation = () => {
    if (selectedCity) {
      const parts = selectedCity.split(", ");
      const cityName = parts[0];
      const country = parts.length > 2 ? parts[parts.length - 1] : (parts[1] || '');
      
      const locationExists = formData.preferred_work_locations.some(
        loc => loc.city === cityName && loc.country === country
      );
      
      if (!locationExists && cityName) {
        setFormData({
          ...formData,
          preferred_work_locations: [
            ...formData.preferred_work_locations, 
            { city: cityName, country: country || 'Unknown', radius_km: cityRadius }
          ]
        });
        setSelectedCity('');
        setCityRadius(25);
      }
    }
  };

  const handleRemovePreferredLocation = (location: { city: string; country: string; radius_km: number }) => {
    setFormData({
      ...formData,
      preferred_work_locations: formData.preferred_work_locations.filter(
        loc => !(loc.city === location.city && loc.country === location.country)
      )
    });
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) return;

    try {
      const renamedFile = new File([file], `${sessionId}_${file.name}`, { type: file.type });
      
      const result = await uploadResume(renamedFile, 'onboarding', 'candidate');
      
      if (result) {
        setFormData({
          ...formData,
          resume_url: result.url,
          resume_filename: file.name,
        });

        toast({ title: "Resume uploaded successfully" });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
    }
  };

  const handleRemoveResume = async () => {
    if (formData.resume_url) {
      try {
        const urlParts = formData.resume_url.split('/resumes/');
        if (urlParts[1]) {
          await supabase.storage.from('resumes').remove([urlParts[1]]);
        }
      } catch (error) {
        console.error('Error removing resume:', error);
      }
    }

    setFormData({
      ...formData,
      resume_url: "",
      resume_filename: "",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <FunnelErrorBoundary stepName={t('candidate.contact.title', 'Contact Information')}>
            <div className="space-y-4">
              <div className="text-center mb-6">
                <User className="w-12 h-12 text-primary mx-auto mb-3" aria-hidden="true" />
                <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]" id="step-heading">
                  {t('candidate.contact.title', 'Contact Information')}
                </h2>
                <p className="text-muted-foreground">{t('candidate.contact.subtitle', "Let's start with your basic details")}</p>
              </div>
              <div>
                <Label htmlFor="full-name">{t('candidate.contact.fullName', 'Full Name')} *</Label>
                <Input
                  id="full-name"
                  aria-label={t('candidate.contact.fullName', 'Full name')}
                  aria-required="true"
                  aria-invalid={!formData.full_name}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder={t('candidate.contact.fullNamePlaceholder', 'John Doe')}
                />
              </div>
              <div>
                <Label htmlFor="email">{t('candidate.contact.email', 'Email Address')} *</Label>
                <Input
                  id="email"
                  type="email"
                  aria-label={t('candidate.contact.email', 'Email address')}
                  aria-required="true"
                  aria-describedby={emailVerified ? "email-verified-status" : undefined}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t('candidate.contact.emailPlaceholder', 'john@example.com')}
                  disabled={emailVerified}
                />
                {emailVerified && (
                  <p id="email-verified-status" className="text-sm text-success mt-2 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    {t('candidate.contact.emailVerified', 'Email verified')}
                  </p>
                )}
              </div>

              {!emailVerified && !emailOtpSent && (
                <div className="p-4 border-3 border-primary/30 bg-primary/10 rounded-xl animate-pulse" role="alert">
                  <div className="flex items-center gap-3">
                    <Mail className="w-10 h-10 text-primary" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-base font-bold text-foreground">{t('candidate.contact.emailVerificationRequired', 'Email verification required to continue')}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t('candidate.contact.clickSendVerification', 'Click "Send Verification Code" below to verify your email')}</p>
                    </div>
                  </div>
                </div>
              )}

              {emailOtpSent && !emailVerified && (
                <div className="p-3 sm:p-4 border-2 border-primary/20 bg-primary/5 rounded-lg space-y-3 shadow-lg shadow-primary/20 max-w-full overflow-hidden">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <Label className="text-base sm:text-lg font-bold">{t('candidate.contact.verifyYourEmail', 'Verify Your Email')}</Label>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                        {t('candidate.contact.weSentCode', "We've sent a 6-digit code to")} {formData.email}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-otp">{t('candidate.contact.enterVerificationCode', 'Enter Verification Code')} *</Label>
                    <div className="flex justify-center w-full">
                      <InputOTP
                        id="email-otp"
                        maxLength={6}
                        value={emailOtpCode}
                        aria-label={t('candidate.contact.enterVerificationCode', 'Email verification code')}
                        autoComplete="one-time-code"
                        onChange={(value) => {
                          setEmailOtpCode(value);
                          if (value.length === 6) {
                            verifyEmailOTP(formData.email, value, async () => {
                              setEmailVerified(true);
                              setEmailOtpCode("");
                              await trackStep("complete");
                              setCurrentStep(1);
                            });
                          }
                        }}
                      >
                        <InputOTPGroup className="gap-1 sm:gap-2">
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {isVerifyingEmail && (
                      <p className="text-sm text-muted-foreground text-center" role="status">{t('candidate.contact.verifying', 'Verifying...')}</p>
                    )}
                    {emailResendCooldown === 0 && emailOtpSent && (
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => sendEmailOTP(formData.email)}
                          disabled={isSendingEmailOtp}
                          className="p-0 h-auto"
                        >
                          {t('candidate.contact.resendCode', 'Resend code')}
                        </Button>
                      </div>
                    )}
                    {emailResendCooldown > 0 && (
                      <p className="text-sm text-muted-foreground text-center" aria-live="polite">
                        {t('candidate.contact.resendAvailableIn', 'Resend available in {{seconds}}s').replace('{{seconds}}', String(emailResendCooldown))}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="location">Current Location (Optional)</Label>
                <LocationAutocomplete
                  value={formData.location}
                  onChange={(value) => setFormData({ ...formData, location: value })}
                  placeholder="Type to search cities worldwide..."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Start typing to see suggestions from cities worldwide
                </p>
              </div>
            </div>
          </FunnelErrorBoundary>
        );

      case 1:
        return (
          <FunnelErrorBoundary stepName={t('candidate.professional.title', 'Professional Details')}>
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Briefcase className="w-12 h-12 text-primary mx-auto mb-3" aria-hidden="true" />
                <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]" id="step-heading">
                  {t('candidate.professional.title', 'Professional Details')}
                </h2>
                <p className="text-muted-foreground">{t('candidate.professional.subtitle', 'Tell us about your experience')}</p>
              </div>
              <div>
                <Label htmlFor="current-title">{t('candidate.professional.currentTitle', 'Current Title')} *</Label>
                <Input
                  id="current-title"
                  aria-label={t('candidate.professional.currentTitle', 'Current title')}
                  aria-required="true"
                  value={formData.current_title}
                  onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                  placeholder={t('candidate.professional.currentTitlePlaceholder', 'e.g., Senior Product Manager')}
                />
              </div>
              <div>
                <Label htmlFor="linkedin">{t('candidate.professional.linkedin', 'LinkedIn Profile')} <span className="text-muted-foreground text-sm">{t('candidate.professional.linkedinOptional', '(Optional)')}</span></Label>
                <Input
                  id="linkedin"
                  aria-label={t('candidate.professional.linkedin', 'LinkedIn profile URL')}
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder={t('candidate.professional.linkedinPlaceholder', 'https://linkedin.com/in/johndoe')}
                />
              </div>
              <div>
                <Label htmlFor="bio">{t('candidate.professional.bio', 'Short Bio')} <span className="text-muted-foreground text-sm">{t('candidate.professional.bioOptional', '(Optional)')}</span></Label>
                <Textarea
                  id="bio"
                  aria-label={t('candidate.professional.bio', 'Short bio')}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder={t('candidate.professional.bioPlaceholder', 'Brief description of your background and expertise...')}
                  rows={3}
                />
              </div>
              <div>
                <Label>{t('candidate.professional.resume', 'Resume / CV')} <span className="text-muted-foreground text-sm">{t('candidate.professional.linkedinOptional', '(Optional)')}</span></Label>
                <input
                  ref={fileInputRef}
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  className="hidden"
                  aria-label={t('candidate.professional.resume', 'Upload resume')}
                />
                {!formData.resume_url ? (
                  <label
                    htmlFor="resume-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">
                      {isUploadingResume ? t('candidate.professional.uploading', 'Uploading...') : t('candidate.professional.clickToUpload', 'Click to upload PDF or Word document')}
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-accent/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                      <span className="text-sm">{formData.resume_filename}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveResume}
                      aria-label={t('candidate.professional.removeResume', 'Remove resume')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </FunnelErrorBoundary>
        );

      case 2:
        return (
          <FunnelErrorBoundary stepName={t('candidate.career.title', 'Career Goals')}>
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Target className="w-12 h-12 text-primary mx-auto mb-3" aria-hidden="true" />
                <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]" id="step-heading">{t('candidate.career.title', 'Career Goals')}</h2>
                <p className="text-muted-foreground">{t('candidate.career.subtitle', 'What are you looking for in your next role?')}</p>
              </div>
              <div>
                <Label htmlFor="dream-job">{t('candidate.career.desiredTitle', 'Dream Job Title')} *</Label>
                <Input
                  id="dream-job"
                  aria-label={t('candidate.career.desiredTitle', 'Dream job title')}
                  aria-required="true"
                  value={formData.dream_job_title}
                  onChange={(e) => setFormData({ ...formData, dream_job_title: e.target.value })}
                  placeholder={t('candidate.career.desiredTitlePlaceholder', 'e.g., VP of Engineering, Lead Product Designer')}
                />
              </div>
              <div>
                <Label htmlFor="employment-type">{t('candidate.career.employmentType', 'Employment Type Preference')} *</Label>
                <Select 
                  value={formData.employment_type} 
                  onValueChange={(value: any) => setFormData({ ...formData, employment_type: value })}
                >
                  <SelectTrigger id="employment-type" aria-label={t('candidate.career.employmentType', 'Employment type preference')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">{t('candidate.career.fulltime', 'Full-time only')}</SelectItem>
                    <SelectItem value="freelance">{t('candidate.career.freelance', 'Freelance/Contract only')}</SelectItem>
                    <SelectItem value="both">{t('candidate.career.both', 'Open to both')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg bg-accent/5">
                <div>
                  <Label htmlFor="remoteAspiration" className="text-base font-semibold cursor-pointer">
                    {t('candidate.career.remoteWork', 'Open to Remote Work')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('candidate.career.remoteWorkLabel', 'Work from anywhere')}
                  </p>
                </div>
                <Switch
                  id="remoteAspiration"
                  aria-label={t('candidate.career.remoteWork', 'Open to remote work')}
                  checked={formData.remote_work_aspiration}
                  onCheckedChange={(checked) => setFormData({ ...formData, remote_work_aspiration: checked })}
                />
              </div>
              
              <div>
                <Label htmlFor="notice-period">{t('candidate.career.noticePeriod', 'Notice Period')} *</Label>
                <Select 
                  value={formData.notice_period} 
                  onValueChange={(value) => setFormData({ ...formData, notice_period: value })}
                >
                  <SelectTrigger id="notice-period" aria-label={t('candidate.career.noticePeriod', 'Notice period')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">{t('candidate.career.immediate', 'Immediate')}</SelectItem>
                    <SelectItem value="2_weeks">{t('candidate.career.twoWeeks', '2 weeks')}</SelectItem>
                    <SelectItem value="1_month">{t('candidate.career.oneMonth', '1 month')}</SelectItem>
                    <SelectItem value="2_months">{t('candidate.career.twoMonths', '2 months')}</SelectItem>
                    <SelectItem value="3_months">{t('candidate.career.threeMonths', '3 months')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FunnelErrorBoundary>
        );

      case 3:
        return (
          <FunnelErrorBoundary stepName={t('candidate.compensation.title', 'Compensation Expectations')}>
            <div className="space-y-6">
              <div className="text-center mb-6">
                <DollarSign className="w-12 h-12 text-primary mx-auto mb-3" aria-hidden="true" />
                <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]" id="step-heading">{t('candidate.compensation.title', 'Compensation Expectations')}</h2>
                <p className="text-muted-foreground">{t('candidate.compensation.subtitle', 'Help us match you with the right opportunities')}</p>
              </div>

              {(formData.employment_type === 'fulltime' || formData.employment_type === 'both') && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label id="current-salary-label">{t('candidate.compensation.currentSalary', 'Current Salary Range (€/year)')}</Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setFormData({ ...formData, salary_preference_hidden: !formData.salary_preference_hidden })}
                        className="text-xs"
                      >
                        {formData.salary_preference_hidden ? t('candidate.compensation.shareSalary', 'Share Salary') : t('candidate.compensation.preferNotToShare', 'Prefer not to share')}
                      </Button>
                    </div>
                    <div className="pt-2 pb-4">
                      <Slider
                        min={0}
                        max={500000}
                        step={5000}
                        value={[formData.current_salary_min, formData.current_salary_max]}
                        onValueChange={(value) => setFormData({ 
                          ...formData, 
                          current_salary_min: value[0], 
                          current_salary_max: value[1] 
                        })}
                        disabled={formData.salary_preference_hidden}
                        className={formData.salary_preference_hidden ? "opacity-50" : ""}
                        aria-labelledby="current-salary-label"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      {formData.salary_preference_hidden ? (
                        <span className="italic">{t('candidate.compensation.salaryHidden', 'Hidden')}</span>
                      ) : (
                        <>€{formData.current_salary_min.toLocaleString()} - €{formData.current_salary_max.toLocaleString()}</>
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label id="desired-salary-label">{t('candidate.compensation.desiredSalary', 'Desired Next Role Salary Range (€/year)')} *</Label>
                    <div className="pt-2 pb-4">
                      <Slider
                        min={0}
                        max={500000}
                        step={5000}
                        value={[formData.desired_salary_min, formData.desired_salary_max]}
                        onValueChange={(value) => setFormData({ 
                          ...formData, 
                          desired_salary_min: value[0], 
                          desired_salary_max: value[1] 
                        })}
                        aria-labelledby="desired-salary-label"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground" aria-live="polite">
                      €{formData.desired_salary_min.toLocaleString()} - €{formData.desired_salary_max.toLocaleString()}
                    </p>
                  </div>
                </>
              )}

              {(formData.employment_type === 'freelance' || formData.employment_type === 'both') && (
                <div className="space-y-2">
                  <Label id="hourly-rate-label">{t('candidate.compensation.freelanceRate', 'Freelance Hourly Rate (€/hour)')} *</Label>
                  <div className="pt-2 pb-4">
                    <Slider
                      min={0}
                      max={500}
                      step={5}
                      value={[formData.freelance_hourly_rate_min, formData.freelance_hourly_rate_max]}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        freelance_hourly_rate_min: value[0], 
                        freelance_hourly_rate_max: value[1] 
                      })}
                      aria-labelledby="hourly-rate-label"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground" aria-live="polite">
                    €{formData.freelance_hourly_rate_min}/hr - €{formData.freelance_hourly_rate_max}/hr
                  </p>
                </div>
              )}
            </div>
          </FunnelErrorBoundary>
        );

      case 4:
        return (
          <FunnelErrorBoundary stepName={t('candidate.preferences.title', 'Work Preferences')}>
            <div className="space-y-6">
              <div className="text-center mb-6">
                <MapPin className="w-12 h-12 text-primary mx-auto mb-3" aria-hidden="true" />
                <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]" id="step-heading">{t('candidate.preferences.title', 'Work Preferences')}</h2>
                <p className="text-muted-foreground">{t('candidate.preferences.subtitle', 'Where would you like to work?')}</p>
              </div>

              <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg bg-accent/5">
                <div>
                  <Label htmlFor="remoteWork" className="text-base font-semibold cursor-pointer">
                    {t('candidate.career.remoteWork', 'Open to Remote Work')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('candidate.career.remoteWorkLabel', 'Work from anywhere')}
                  </p>
                </div>
                <Switch
                  id="remoteWork"
                  aria-label={t('candidate.career.remoteWork', 'Open to remote work preference')}
                  checked={formData.remote_work_preference}
                  onCheckedChange={(checked) => setFormData({ ...formData, remote_work_preference: checked })}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="preferred-cities">{t('candidate.preferences.preferredCities', 'Preferred Cities (Optional)')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('candidate.preferences.searchCities', "Search for cities where you'd like to work")}
                </p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <LocationAutocomplete
                      value={selectedCity}
                      onChange={setSelectedCity}
                      placeholder={t('candidate.preferences.typeToSearch', 'Type to search cities...')}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddPreferredLocation}
                    disabled={!selectedCity}
                    aria-label={t('candidate.preferences.add', 'Add preferred location')}
                  >
                    {t('candidate.preferences.add', 'Add')}
                  </Button>
                </div>

                {selectedCity && (
                  <div className="space-y-2 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                    <Label id="radius-label">{t('candidate.preferences.maxDistance', 'Maximum distance from')} {selectedCity.split(", ")[0]}</Label>
                    <div className="pt-2 pb-4">
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[cityRadius]}
                        onValueChange={(value) => setCityRadius(value[0])}
                        aria-labelledby="radius-label"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{t('candidate.preferences.withinRadius', 'Within {{km}} km radius').replace('{{km}}', String(cityRadius))}</p>
                  </div>
                )}

                {formData.preferred_work_locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="Selected preferred locations">
                    {formData.preferred_work_locations.map((location, index) => (
                      <div
                        key={`${location.city}-${location.country}-${index}`}
                        className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg text-sm"
                        role="listitem"
                      >
                        <span>
                          {location.city}, {location.country} ({t('candidate.preferences.withinRadius', 'within {{km}}km').replace('{{km}}', String(location.radius_km))})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePreferredLocation(location)}
                          className="text-primary hover:text-primary/80 text-lg leading-none"
                          aria-label={`Remove ${location.city}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Verification */}
              <div className="pt-6 border-t">
                <div className="p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl shadow-lg shadow-primary/10 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-primary/30">
                        <Phone className="w-7 h-7 text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-foreground">{t('candidate.preferences.verifyPhone', 'Verify Your Phone')}</h3>
                        <p className="text-sm text-muted-foreground">{t('candidate.preferences.requiredToJoin', 'Required to join The Quantum Club')}</p>
                      </div>
                      <span className="px-3 py-1 text-xs font-semibold bg-primary/20 text-primary rounded-full border border-primary/30">
                        {t('candidate.preferences.required', 'Required')}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="phone-input" className="text-base font-semibold">{t('candidate.preferences.mobileNumber', 'Mobile Number')}</Label>
                      <p className="text-sm text-muted-foreground -mt-1">
                        {t('candidate.preferences.selectCountry', "Select your country and enter your number. We'll send a verification code.")}
                      </p>
                      <div className="p-1 bg-background/50 rounded-lg border-2 border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        <PhoneInput
                          id="phone-input"
                          international
                          defaultCountry={countryCode as any}
                          value={phoneNumber}
                          onChange={(value) => setPhoneNumber(value || "")}
                          disabled={phoneVerified}
                          className="phone-input-premium"
                          aria-label={t('candidate.preferences.mobileNumber', 'Phone number')}
                        />
                      </div>
                      {phoneVerified && (
                        <p className="text-sm text-green-600 flex items-center font-medium" role="status">
                          <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                          {t('candidate.preferences.phoneVerified', 'Phone verified successfully')}
                        </p>
                      )}
                    </div>

                    {otpSent && !phoneVerified && (
                      <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg space-y-3 mt-4">
                        <Label htmlFor="phone-otp" className="text-base font-semibold">{t('candidate.preferences.enterCode', 'Enter Verification Code')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('candidate.preferences.codeSentTo', "We've sent a 6-digit code to")} {phoneNumber}
                        </p>
                        <div className="flex justify-center w-full">
                          <InputOTP
                            id="phone-otp"
                            maxLength={6}
                            value={verificationCode}
                            onChange={setVerificationCode}
                            aria-label={t('candidate.preferences.enterCode', 'Phone verification code')}
                            autoComplete="one-time-code"
                          >
                            <InputOTPGroup className="gap-1 sm:gap-2">
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        <Button
                          type="button"
                          onClick={async () => {
                            const verified = await verifyOTP(phoneNumber, verificationCode, () => {
                              setPhoneVerified(true);
                              toast({ title: t('candidate.messages.phoneVerified', 'Phone verified successfully!') });
                            });
                            if (!verified) {
                              toast({ title: t('candidate.messages.invalidCode', 'Invalid code'), variant: "destructive" });
                            }
                          }}
                          disabled={verificationCode.length !== 6 || isVerifying}
                          className="w-full"
                        >
                          {isVerifying ? t('candidate.contact.verifying', 'Verifying...') : t('candidate.contact.verifyPhone', 'Verify Phone')}
                        </Button>
                        {resendCooldown === 0 && (
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => sendOTP(phoneNumber)}
                            disabled={isSendingOtp}
                            className="p-0 h-auto"
                          >
                            {t('candidate.contact.resendCode', 'Resend code')}
                          </Button>
                        )}
                        {resendCooldown > 0 && (
                          <p className="text-sm text-muted-foreground" aria-live="polite">
                            {t('candidate.contact.resendAvailableIn', 'Resend available in {{seconds}}s').replace('{{seconds}}', String(resendCooldown))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </FunnelErrorBoundary>
        );

      case 5:
        return (
          <FunnelErrorBoundary stepName={t('candidate.password.title', 'Secure Your Account')}>
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 text-primary mx-auto mb-3" aria-hidden="true" />
                <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]" id="step-heading">
                  {t('candidate.password.title', 'Secure Your Account')}
                </h2>
                <p className="text-muted-foreground">
                  {t('candidate.password.subtitle', 'Create a strong password to complete your registration')}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password">{t('candidate.password.password', 'Password')} *</Label>
                  <Input
                    id="password"
                    type="password"
                    aria-label={t('candidate.password.password', 'Password')}
                    aria-required="true"
                    aria-describedby="password-requirements"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('candidate.password.password', 'Enter your password')}
                  />
                </div>

                <div id="password-requirements" className="text-xs space-y-2 p-4 rounded-lg bg-accent/10 border border-border" role="list" aria-label={t('candidate.password.requirements', 'Password requirements')}>
                  <p className={password.length >= 12 ? "text-success font-semibold" : "text-muted-foreground"} role="listitem">
                    {password.length >= 12 ? "✓" : "○"} {t('candidate.password.minLength', 'At least 12 characters')}
                  </p>
                  <p className={/[A-Z]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"} role="listitem">
                    {/[A-Z]/.test(password) ? "✓" : "○"} {t('candidate.password.uppercase', 'One uppercase letter')}
                  </p>
                  <p className={/[a-z]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"} role="listitem">
                    {/[a-z]/.test(password) ? "✓" : "○"} {t('candidate.password.lowercase', 'One lowercase letter')}
                  </p>
                  <p className={/[0-9]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"} role="listitem">
                    {/[0-9]/.test(password) ? "✓" : "○"} {t('candidate.password.number', 'One number')}
                  </p>
                  <p className={/[^A-Za-z0-9]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"} role="listitem">
                    {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"} {t('candidate.password.special', 'One special character')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm-password">{t('candidate.password.confirmPassword', 'Confirm Password')} *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    aria-label={t('candidate.password.confirmPassword', 'Confirm password')}
                    aria-required="true"
                    aria-invalid={confirmPassword !== "" && password !== confirmPassword}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('candidate.password.confirmPassword', 'Confirm your password')}
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-destructive mt-1" role="alert">{t('candidate.password.passwordsDoNotMatch', 'Passwords do not match')}</p>
                  )}
                </div>

                {/* GDPR Consent Checkbox */}
                <div className="p-4 border-2 border-border rounded-lg bg-accent/5 space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="gdpr-consent"
                      checked={gdprConsent}
                      onCheckedChange={(checked) => setGdprConsent(checked === true)}
                      aria-label={t('candidate.password.gdprConsent', 'GDPR consent')}
                      aria-required="true"
                      className="mt-1"
                    />
                    <Label htmlFor="gdpr-consent" className="text-sm leading-relaxed cursor-pointer">
                      {t('candidate.password.gdprConsent', 'I agree to the')}{" "}
                      <Link to="/privacy" className="text-primary underline hover:text-primary/80" target="_blank">
                        {t('candidate.password.privacyPolicy', 'Privacy Policy')}
                      </Link>{" "}
                      {t('candidate.password.and', 'and')}{" "}
                      <Link to="/terms" className="text-primary underline hover:text-primary/80" target="_blank">
                        {t('candidate.password.termsOfService', 'Terms of Service')}
                      </Link>
                      . {t('candidate.password.consentDescription', 'I consent to the processing of my personal data as described.')} *
                    </Label>
                  </div>
                  {!gdprConsent && (
                    <p className="text-xs text-muted-foreground pl-6">
                      {t('candidate.password.mustAccept', 'You must accept to continue with registration')}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mt-4" role="status">
                <p className="text-sm text-muted-foreground">
                  ✓ {t('candidate.password.emailVerifiedLabel', 'Email verified')}: {formData.email}<br/>
                  ✓ {t('candidate.password.phoneVerifiedLabel', 'Phone verified')}: {phoneNumber}<br/>
                  {gdprConsent ? "✓" : "○"} {t('candidate.password.termsAccepted', 'Terms accepted')}<br/>
                  ○ {t('candidate.password.accountCreated', 'Account will be created after submission')}
                </p>
              </div>
            </div>
          </FunnelErrorBoundary>
        );

      case 6:
        return (
          <div className="space-y-8 py-4">
            <div className="text-center">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" aria-hidden="true" />
              <h2 className="text-3xl font-semibold mb-3 uppercase font-[Inter]">{t('candidate.complete.title', 'Welcome to The Quantum Club!')}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('candidate.complete.message', 'Your account has been created successfully. Your Talent Strategist will review your profile soon.')}
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <CandidateApplicationTracker />
            </div>

            <div className="flex flex-col gap-4 items-center mt-8">
              <p className="text-sm text-muted-foreground">
                {t('candidate.complete.redirecting', 'Redirecting to pending approval...')}
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/pending-approval")}
                variant="outline"
              >
                {t('candidate.complete.viewStatus', 'View Application Status')}
              </Button>
            </div>
          </div>
        );
    }
  };

  const stepLabels = [
    { icon: User, label: t('candidate.steps.contact', 'Contact') },
    { icon: Briefcase, label: t('candidate.steps.professional', 'Professional') },
    { icon: Target, label: t('candidate.steps.career', 'Career') },
    { icon: DollarSign, label: t('candidate.steps.compensation', 'Compensation') },
    { icon: MapPin, label: t('candidate.steps.preferences', 'Preferences') },
    { icon: Lock, label: t('candidate.steps.password', 'Security') },
  ];

  if (currentStep === 6) {
    return (
      <Card className="p-8 glass-effect">
        {renderStep()}
      </Card>
    );
  }

  return (
    <Card className="p-8 glass-effect">
      {/* Network Status Indicator */}
      {!isOnline && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive" role="alert">
          <WifiOff className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">{t('candidate.offline.message', "You're offline. Changes will be saved when you reconnect.")}</span>
        </div>
      )}

      {/* Session Recovery Banner - Show after first step */}
      {currentStep > 0 && formData.email && showRecoveryBanner && (
        <SessionRecoveryBanner
          sessionId={sessionId}
          currentStep={currentStep}
          onDismiss={() => setShowRecoveryBanner(false)}
        />
      )}

      {/* Progress Saver */}
      <div className="mb-4 flex justify-end">
        <ProgressSaver
          sessionId={sessionId}
          currentStep={currentStep}
          formData={formData}
          email={formData.email}
        />
      </div>

      {/* Progress Indicator */}
      <nav className="mb-8" aria-label="Onboarding progress">
        <div className="flex justify-between items-center mb-4">
          {stepLabels.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index} 
                className="flex flex-col items-center flex-1"
                aria-current={index === currentStep ? "step" : undefined}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2
                  ${index < currentStep ? 'bg-primary text-primary-foreground' : 
                    index === currentStep ? 'bg-primary/20 text-primary border-2 border-primary' : 
                    'bg-muted text-muted-foreground'}
                `}>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <span className="text-xs text-center sr-only sm:not-sr-only">{step.label}</span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={6}>
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 6) * 100}%` }}
          />
        </div>
      </nav>

      {/* Step Content */}
      <main aria-labelledby="step-heading">
        {renderStep()}
      </main>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          aria-label={t('candidate.navigation.back', 'Go to previous step')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
          {t('candidate.navigation.back', 'Back')}
        </Button>
        
        {currentStep < 5 ? (
          <Button 
            type="button" 
            onClick={handleNext} 
            disabled={isCheckingEmail || !isOnline}
            aria-label={currentStep === 0 && !emailVerified ? t('candidate.navigation.sendVerificationCode', 'Send verification code') : t('candidate.navigation.continue', 'Continue to next step')}
          >
            {isCheckingEmail ? t('candidate.navigation.checking', 'Checking...') :
             currentStep === 0 && !emailVerified ? t('candidate.navigation.sendVerificationCode', 'Send Verification Code') :
             currentStep === 4 && !phoneVerified ? t('candidate.navigation.sendVerificationCode', 'Send Verification Code') :
             t('candidate.navigation.continue', 'Continue')}
            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </Button>
        ) : (
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isLoading || !isOnline || !gdprConsent}
            aria-label={t('candidate.navigation.createAccount', 'Create account')}
          >
            {isLoading ? t('candidate.navigation.creatingAccount', 'Creating Account...') : t('candidate.navigation.createAccount', 'Create Account')}
            <CheckCircle className="w-4 h-4 ml-2" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Keyboard Shortcut Hint */}
      <p className="text-xs text-muted-foreground text-center mt-4 hidden sm:block">
        {t('candidate.keyboard.pressEnter', 'Press')} <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> {t('candidate.keyboard.toContinue', 'to continue or')} <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd> {t('candidate.keyboard.toGoBack', 'to go back')}
      </p>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('candidate.trustBadges.ssl', '256-bit SSL')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('candidate.trustBadges.gdpr', 'GDPR Compliant')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t('candidate.trustBadges.neverShared', 'Never Shared')}</span>
        </div>
      </div>

      {/* Exit Intent Popup */}
      {currentStep > 0 && currentStep < 5 && (
        <ExitIntentPopup
          isOpen={exitIntentOpen}
          onClose={() => setExitIntentOpen(false)}
          onStay={() => setExitIntentOpen(false)}
          currentStep={currentStep}
          totalSteps={6}
        />
      )}

      {/* Email Already Exists Dialog */}
      <AlertDialog open={showEmailExistsDialog} onOpenChange={setShowEmailExistsDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-accent" aria-hidden="true" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">
              {t('candidate.dialog.accountExists', 'Account Already Exists')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p className="text-base">
                {t('candidate.dialog.accountExistsMessage', 'An account with')} <span className="font-semibold text-foreground">{formData.email}</span> {t('candidate.dialog.accountExistsMessage', 'already exists.')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('candidate.dialog.loginOrTryDifferent', 'Would you like to log in instead, or try a different email?')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setFormData(prev => ({ ...prev, email: "" }));
                setShowEmailExistsDialog(false);
              }}
              className="w-full sm:w-auto"
            >
              {t('candidate.dialog.tryDifferentEmail', 'Try Different Email')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleNavigateToLogin}
              className="w-full sm:w-auto bg-gradient-accent hover:opacity-90"
            >
              {t('candidate.dialog.goToLogin', 'Go to Login')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
