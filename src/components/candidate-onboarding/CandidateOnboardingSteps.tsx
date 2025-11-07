import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, CheckCircle, User, Briefcase, Target, DollarSign, MapPin, Phone, Upload, X, Mail, Lock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useCountryDetection } from "@/hooks/useCountryDetection";
import { Slider } from "@/components/ui/slider";
import { CandidateApplicationTracker } from "./CandidateApplicationTracker";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
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
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [cities, setCities] = useState<Array<{ id: string; name: string; country: string }>>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [cityRadius, setCityRadius] = useState(25);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
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
    // Contact
    full_name: "",
    email: "",
    phone: "",
    location: "",
    // Professional
    current_title: "",
    linkedin_url: "",
    bio: "",
    resume_url: "",
    resume_filename: "",
    // Career
    dream_job_title: "",
    employment_type: "fulltime" as "fulltime" | "freelance" | "both",
    notice_period: "2_weeks",
    remote_work_aspiration: false,
    // Compensation
    current_salary_min: 50000,
    current_salary_max: 70000,
    salary_preference_hidden: false,
    desired_salary_min: 70000,
    desired_salary_max: 90000,
    freelance_hourly_rate_min: 50,
    freelance_hourly_rate_max: 100,
    // Preferences
    remote_work_preference: false,
    preferred_work_locations: [] as Array<{ city: string; country: string; radius_km: number }>,
  });

  useEffect(() => {
    loadCities();
    trackStep("view");
  }, [currentStep]);

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, country')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (data) {
        setCities(data);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

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

  const handleNext = async () => {
    // Step 0: Contact info - check email and verify
    if (currentStep === 0) {
      if (!formData.email || !formData.full_name || !formData.phone || !formData.location) {
        toast({ 
          title: "Missing information", 
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Check if email already exists
      if (!emailVerified) {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          setShowEmailExistsDialog(true);
          return;
        }

        // Email is available, send verification code
        const success = await sendEmailOTP(formData.email);
        if (success) {
          toast({ 
            title: "Verification code sent", 
            description: "Please check your email and enter the code below" 
          });
        }
      }
      return;
    }

    // Phone verification before final step
    if (currentStep === 4 && !phoneVerified) {
      if (!phoneNumber) {
        toast({ title: "Please enter your phone number", variant: "destructive" });
        return;
      }
      
      const success = await sendOTP(phoneNumber);
      if (!success) {
        return;
      }
      toast({ 
        title: "Verification code sent", 
        description: "Please check your phone and enter the code below" 
      });
      return;
    }
    
    if (!validateStep()) return;
    
    await trackStep("complete");
    setCurrentStep(currentStep + 1);
  };

  const handleBack = async () => {
    await trackStep("abandon");
    setCurrentStep(currentStep - 1);
  };

  const validateStep = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    switch (currentStep) {
      case 0: // Contact
        if (!formData.full_name || !formData.email) {
          toast({ title: "Please fill in all required fields", variant: "destructive" });
          return false;
        }
        if (!emailRegex.test(formData.email)) {
          toast({ title: "Please enter a valid email address", variant: "destructive" });
          return false;
        }
        if (!emailVerified) {
          toast({ title: "Please verify your email address first", variant: "destructive" });
          return false;
        }
        break;
      case 1: // Professional
        if (!formData.current_title) {
          toast({ title: "Please enter your current job title", variant: "destructive" });
          return false;
        }
        break;
      case 2: // Career
        if (!formData.dream_job_title) {
          toast({ title: "Please enter your dream job title", variant: "destructive" });
          return false;
        }
        break;
      case 4: // Preferences
        if (!phoneVerified) {
          toast({ title: "Please verify your phone number", variant: "destructive" });
          return false;
        }
        break;
      case 5: // Password
        if (!password || password.length < 12) {
          toast({ title: "Please create a strong password", variant: "destructive" });
          return false;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
          toast({ title: "Password must meet all requirements", variant: "destructive" });
          return false;
        }
        if (password !== confirmPassword) {
          toast({ title: "Passwords do not match", variant: "destructive" });
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    // Validate password
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

      // STEP 1: Create Supabase auth account with all onboarding data
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

      // STEP 1.5: Wait for trigger to create profile (fix race condition)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify profile exists before updating
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

      // STEP 2: Update profiles table with complete onboarding data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumber,
          phone_verified: true,
          email_verified: true,
          location: formData.location,
          current_title: formData.current_title,
          linkedin_url: formData.linkedin_url,
          career_preferences: formData.bio,
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
          resume_url: formData.resume_url,
          resume_filename: formData.resume_filename,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error("[Onboarding] Profile update error:", profileError);
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      console.log('[Onboarding] Profile updated successfully');

      // STEP 2.5: Move resume from onboarding folder to user's folder
      if (formData.resume_url) {
        try {
          const oldPath = formData.resume_url.split('/resumes/')[1];
          const fileName = oldPath.split('/')[1]; // Get filename from onboarding/filename
          const newPath = `${authData.user.id}/${fileName}`;
          
          // Copy file to user's folder
          const { error: copyError } = await supabase.storage
            .from('resumes')
            .copy(oldPath, newPath);
          
          if (!copyError) {
            // Delete from onboarding folder
            await supabase.storage.from('resumes').remove([oldPath]);
            
            // Update URL to new location
            const { data: { publicUrl } } = supabase.storage
              .from('resumes')
              .getPublicUrl(newPath);
            
            formData.resume_url = publicUrl;
          }
        } catch (error) {
          console.error('Error moving resume:', error);
        }
      }

      // STEP 3: Create candidate_profile entry for strategist assignment
      console.log('[Onboarding] Creating candidate profile');
      
      const { error: candidateProfileError } = await supabase
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
          assigned_strategist_id: '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5',
          source_channel: 'integrated_funnel',
        });

      if (candidateProfileError) {
        console.error('[Onboarding] Candidate profile creation error:', candidateProfileError);
        throw new Error(`Failed to create candidate profile: ${candidateProfileError.message}`);
      }

      console.log('[Onboarding] Candidate profile created successfully');

      await trackStep("complete");

      toast({ 
        title: "Account created successfully!", 
        description: "Redirecting to your dashboard..." 
      });

      // Move to success screen
      setCurrentStep(6);

      // Auto-login and redirect after 2 seconds
      setTimeout(() => {
        navigate("/home");
      }, 2000);

    } catch (error: any) {
      console.error('[Onboarding] Account creation error:', error);
      
      // Log detailed error to database for debugging
      try {
        await supabase.from('funnel_analytics').insert({
          session_id: sessionId,
          step_number: 999, // Error step
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
        description: error.message || "An unexpected error occurred. Please try again or contact support.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPreferredLocation = () => {
    if (selectedCity) {
      const [cityName, country] = selectedCity.split(", ");
      const locationExists = formData.preferred_work_locations.some(
        loc => loc.city === cityName && loc.country === country
      );
      
      if (!locationExists) {
        setFormData({
          ...formData,
          preferred_work_locations: [
            ...formData.preferred_work_locations, 
            { city: cityName, country, radius_km: cityRadius }
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

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or DOC file", variant: "destructive" });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }

    setIsUploadingResume(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionId}_${Date.now()}.${fileExt}`;
      const filePath = `onboarding/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      setFormData({
        ...formData,
        resume_url: publicUrl,
        resume_filename: file.name,
      });

      toast({ title: "Resume uploaded successfully" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleRemoveResume = async () => {
    if (formData.resume_url) {
      try {
        // Extract file path from URL
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
      case 0: // Contact Information
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <User className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]">Contact Information</h2>
              <p className="text-muted-foreground">Let's start with your basic details</p>
            </div>
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                disabled={emailVerified}
              />
              {emailVerified && (
                <p className="text-sm text-green-600 mt-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Email verified
                </p>
              )}
            </div>

            {!emailVerified && !emailOtpSent && (
              <div className="p-4 border-3 border-primary/30 bg-primary/10 rounded-xl animate-pulse">
                <div className="flex items-center gap-3">
                  <Mail className="w-10 h-10 text-primary" />
                  <div className="flex-1">
                    <p className="text-base font-bold text-foreground">Email verification required to continue</p>
                    <p className="text-sm text-muted-foreground mt-1">Click "Send Verification Code" below to verify your email</p>
                  </div>
                </div>
              </div>
            )}

            {emailOtpSent && !emailVerified && (
              <div className="p-4 border-3 border-primary/20 bg-primary/5 rounded-lg space-y-3 shadow-lg shadow-primary/20">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Label className="text-lg font-bold">Verify Your Email</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      We've sent a 6-digit code to {formData.email}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Enter Verification Code *</Label>
                  <InputOTP
                    maxLength={6}
                    value={emailOtpCode}
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
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  {isVerifyingEmail && (
                    <p className="text-sm text-muted-foreground">Verifying...</p>
                  )}
                  {emailResendCooldown === 0 && emailOtpSent && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => sendEmailOTP(formData.email)}
                      disabled={isSendingEmailOtp}
                      className="p-0 h-auto"
                    >
                      Resend code
                    </Button>
                  )}
                  {emailResendCooldown > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Resend available in {emailResendCooldown}s
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label>Current Location (Optional)</Label>
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
        );

      case 1: // Professional Details
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Briefcase className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]">Professional Details</h2>
              <p className="text-muted-foreground">Tell us about your current role</p>
            </div>
            <div>
              <Label>Current Job Title *</Label>
              <Input
                value={formData.current_title}
                onChange={(e) => setFormData({ ...formData, current_title: e.target.value })}
                placeholder="e.g., Senior Software Engineer"
              />
            </div>
            <div>
              <Label>LinkedIn Profile (Optional)</Label>
              <Input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            <div>
              <Label>Professional Bio (Optional)</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about your experience and what drives you..."
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-1">You can skip this and complete it later in settings</p>
            </div>
            
            {/* Resume Upload */}
            <div className="space-y-2">
              <Label>Resume (Optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
              />
              
              {!formData.resume_filename ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingResume}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingResume ? "Uploading..." : "Upload your resume"}
                </Button>
              ) : (
                <div className="flex items-center gap-2 p-3 border-2 border-primary/20 bg-primary/5 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">{formData.resume_filename}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveResume}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                You can add this later in settings. Accepted formats: PDF, DOC, DOCX (max 10MB)
              </p>
            </div>
          </div>
        );

      case 2: // Career Aspirations
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Target className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]">Career Aspirations</h2>
              <p className="text-muted-foreground">What's your ideal next role?</p>
            </div>
            <div>
              <Label>Dream Job Title *</Label>
              <Input
                value={formData.dream_job_title}
                onChange={(e) => setFormData({ ...formData, dream_job_title: e.target.value })}
                placeholder="e.g., VP of Engineering, Lead Product Designer"
              />
            </div>
            <div>
              <Label>Employment Type Preference *</Label>
              <Select value={formData.employment_type} onValueChange={(value: any) => setFormData({ ...formData, employment_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fulltime">Full-time only</SelectItem>
                  <SelectItem value="freelance">Freelance/Contract only</SelectItem>
                  <SelectItem value="both">Open to both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Remote Work Aspiration Toggle */}
            <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg bg-accent/5">
              <div>
                <Label htmlFor="remoteAspiration" className="text-base font-semibold cursor-pointer">
                  Open to Remote Work
                </Label>
                <p className="text-sm text-muted-foreground">
                  Work from anywhere
                </p>
              </div>
              <Switch
                id="remoteAspiration"
                checked={formData.remote_work_aspiration}
                onCheckedChange={(checked) => setFormData({ ...formData, remote_work_aspiration: checked })}
              />
            </div>
            
            <div>
              <Label>Notice Period *</Label>
              <Select value={formData.notice_period} onValueChange={(value) => setFormData({ ...formData, notice_period: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="2_weeks">2 weeks</SelectItem>
                  <SelectItem value="1_month">1 month</SelectItem>
                  <SelectItem value="2_months">2 months</SelectItem>
                  <SelectItem value="3_months">3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3: // Compensation
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]">Compensation Expectations</h2>
              <p className="text-muted-foreground">Help us match you with the right opportunities</p>
            </div>

            {(formData.employment_type === 'fulltime' || formData.employment_type === 'both') && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Current Salary Range (€/year)</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setFormData({ ...formData, salary_preference_hidden: !formData.salary_preference_hidden })}
                      className="text-xs"
                    >
                      {formData.salary_preference_hidden ? "Share Salary" : "Prefer not to share"}
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
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formData.salary_preference_hidden ? (
                      <span className="italic">Hidden</span>
                    ) : (
                      <>€{formData.current_salary_min.toLocaleString()} - €{formData.current_salary_max.toLocaleString()}</>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Desired Next Role Salary Range (€/year) *</Label>
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
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    €{formData.desired_salary_min.toLocaleString()} - €{formData.desired_salary_max.toLocaleString()}
                  </p>
                </div>
              </>
            )}

            {(formData.employment_type === 'freelance' || formData.employment_type === 'both') && (
              <div className="space-y-2">
                <Label>Freelance Hourly Rate (€/hour) *</Label>
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
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  €{formData.freelance_hourly_rate_min}/hr - €{formData.freelance_hourly_rate_max}/hr
                </p>
              </div>
            )}
          </div>
        );

      case 4: // Work Preferences & Verification
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]">Work Preferences</h2>
              <p className="text-muted-foreground">Where would you like to work?</p>
            </div>

            <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg bg-accent/5">
              <div>
                <Label htmlFor="remoteWork" className="text-base font-semibold cursor-pointer">
                  Open to Remote Work
                </Label>
                <p className="text-sm text-muted-foreground">
                  Work from anywhere
                </p>
              </div>
              <Switch
                id="remoteWork"
                checked={formData.remote_work_preference}
                onCheckedChange={(checked) => setFormData({ ...formData, remote_work_preference: checked })}
              />
            </div>

            <div className="space-y-3">
              <Label>Preferred Cities (Optional)</Label>
              <div className="flex gap-2">
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a city" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {cities
                      .filter(city => {
                        const cityString = `${city.name}, ${city.country}`;
                        return !formData.preferred_work_locations.some(
                          loc => loc.city === city.name && loc.country === city.country
                        );
                      })
                      .map((city) => (
                        <SelectItem key={city.id} value={`${city.name}, ${city.country}`}>
                          {city.name}, {city.country}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddPreferredLocation}
                  disabled={!selectedCity}
                >
                  Add
                </Button>
              </div>

              {selectedCity && (
                <div className="space-y-2 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                  <Label>Maximum distance from {selectedCity.split(", ")[0]}</Label>
                  <div className="pt-2 pb-4">
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[cityRadius]}
                      onValueChange={(value) => setCityRadius(value[0])}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">Within {cityRadius} km radius</p>
                </div>
              )}

              {formData.preferred_work_locations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.preferred_work_locations.map((location, index) => (
                    <div
                      key={`${location.city}-${location.country}-${index}`}
                      className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg text-sm"
                    >
                      <span>
                        {location.city}, {location.country} (within {location.radius_km}km)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreferredLocation(location)}
                        className="text-primary hover:text-primary/80 text-lg leading-none"
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
              <div className="text-center mb-4">
                <Phone className="w-10 h-10 text-primary mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Verify Your Phone Number</h3>
                <p className="text-sm text-muted-foreground">Required to complete your profile</p>
              </div>

              <div className="space-y-3">
                <Label>Phone Number *</Label>
                <PhoneInput
                  international
                  defaultCountry={countryCode as any}
                  value={phoneNumber}
                  onChange={(value) => setPhoneNumber(value || "")}
                  disabled={phoneVerified}
                  className="phone-input"
                />
                {phoneVerified && (
                  <p className="text-sm text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Phone verified
                  </p>
                )}
              </div>

              {otpSent && !phoneVerified && (
                <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg space-y-3 mt-4">
                  <Label className="text-base font-semibold">Enter Verification Code</Label>
                  <p className="text-sm text-muted-foreground">
                    We've sent a 6-digit code to {phoneNumber}
                  </p>
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <Button
                    onClick={async () => {
                      const verified = await verifyOTP(phoneNumber, verificationCode, () => {
                        setPhoneVerified(true);
                        toast({ title: "Phone verified successfully!" });
                      });
                      if (!verified) {
                        toast({ title: "Invalid code", variant: "destructive" });
                      }
                    }}
                    disabled={verificationCode.length !== 6 || isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? "Verifying..." : "Verify Phone"}
                  </Button>
                  {resendCooldown === 0 && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => sendOTP(phoneNumber)}
                      disabled={isSendingOtp}
                      className="p-0 h-auto"
                    >
                      Resend code
                    </Button>
                  )}
                  {resendCooldown > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Resend available in {resendCooldown}s
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 5: // Password Creation
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-semibold mb-2 uppercase font-[Inter]">
                Secure Your Account
              </h2>
              <p className="text-muted-foreground">
                Create a strong password to complete your registration
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              <div className="text-xs space-y-2 p-4 rounded-lg bg-accent/10 border border-border">
                <p className={password.length >= 12 ? "text-success font-semibold" : "text-muted-foreground"}>
                  {password.length >= 12 ? "✓" : "○"} At least 12 characters
                </p>
                <p className={/[A-Z]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"}>
                  {/[A-Z]/.test(password) ? "✓" : "○"} One uppercase letter
                </p>
                <p className={/[a-z]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"}>
                  {/[a-z]/.test(password) ? "✓" : "○"} One lowercase letter
                </p>
                <p className={/[0-9]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"}>
                  {/[0-9]/.test(password) ? "✓" : "○"} One number
                </p>
                <p className={/[^A-Za-z0-9]/.test(password) ? "text-success font-semibold" : "text-muted-foreground"}>
                  {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"} One special character
                </p>
              </div>

              <div>
                <Label>Confirm Password *</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive mt-2">Passwords do not match</p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-sm text-success mt-2 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Passwords match
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mt-4">
              <p className="text-sm text-muted-foreground">
                ✓ Email verified: {formData.email}<br/>
                ✓ Phone verified: {phoneNumber}<br/>
                ✓ Profile completed
              </p>
            </div>
          </div>
        );

      case 6: // Success
        return (
          <div className="space-y-8 py-4">
            <div className="text-center">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-3xl font-semibold mb-3 uppercase font-[Inter]">Welcome to The Quantum Club!</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Your account has been created successfully. Your Talent Strategist will review your profile soon.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <CandidateApplicationTracker />
            </div>

            <div className="flex flex-col gap-4 items-center mt-8">
              <p className="text-sm text-muted-foreground">
                Redirecting to your dashboard...
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate("/home")}
                variant="outline"
              >
                Go to Dashboard Now
              </Button>
            </div>
          </div>
        );
    }
  };

  const stepLabels = [
    { icon: User, label: "Contact" },
    { icon: Briefcase, label: "Professional" },
    { icon: Target, label: "Career" },
    { icon: DollarSign, label: "Compensation" },
    { icon: MapPin, label: "Preferences" },
    { icon: Lock, label: "Password" },
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
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {stepLabels.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2
                  ${index < currentStep ? 'bg-primary text-primary-foreground' : 
                    index === currentStep ? 'bg-primary/20 text-primary border-2 border-primary' : 
                    'bg-muted text-muted-foreground'}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-center">{step.label}</span>
              </div>
            );
          })}
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      {renderStep()}

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        {currentStep < 5 ? (
          <Button onClick={handleNext} disabled={isCheckingEmail}>
            {isCheckingEmail ? "Checking..." :
             currentStep === 0 && !emailVerified ? "Send Verification Code" :
             currentStep === 4 && !phoneVerified ? "Send Verification Code" :
             "Continue"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Email Already Exists Dialog */}
      <AlertDialog open={showEmailExistsDialog} onOpenChange={setShowEmailExistsDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-accent" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">
              Account Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p className="text-base">
                An account with <span className="font-semibold text-foreground">{formData.email}</span> already exists.
              </p>
              <p className="text-sm text-muted-foreground">
                Would you like to log in instead, or try a different email?
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
              Try Different Email
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleNavigateToLogin}
              className="w-full sm:w-auto bg-gradient-accent hover:opacity-90"
            >
              Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
