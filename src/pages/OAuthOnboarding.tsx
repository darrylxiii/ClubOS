import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Briefcase, Target, DollarSign, MapPin, Upload, X, Loader2, CheckCircle, Phone } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { useCountryDetection } from "@/hooks/useCountryDetection";
import { useResumeUpload } from "@/hooks/useResumeUpload";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const STEPS = ["contact", "professional", "career", "preferences"];

export default function OAuthOnboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cities, setCities] = useState<Array<{ id: string; name: string; country: string }>>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [cityRadius, setCityRadius] = useState(25);
  
  const { uploadResume, isUploading: isUploadingResume, validateFile } = useResumeUpload();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Phone verification
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const { 
    sendOTP, 
    verifyOTP, 
    otpSent, 
    isVerifying, 
    isSendingOtp,
    resendCooldown 
  } = usePhoneVerification();
  const { countryCode } = useCountryDetection();

  // Auth check: redirect if not authenticated or if onboarding already completed
  useEffect(() => {
    if (loading) return; // Wait for auth to finish loading
    
    if (!user) {
      console.log('[OAuthOnboarding] No user found, redirecting to /auth');
      navigate('/auth', { replace: true });
      return;
    }

    // Check if onboarding is already completed
    const checkOnboardingStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed_at, account_status')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data?.onboarding_completed_at) {
          console.log('[OAuthOnboarding] Onboarding already completed, redirecting');
          // Redirect based on account status
          if (data.account_status === 'approved') {
            navigate('/club-home', { replace: true });
          } else {
            navigate('/pending-approval', { replace: true });
          }
        }
      } catch (error) {
        console.error('[OAuthOnboarding] Error checking onboarding status:', error);
      }
    };

    checkOnboardingStatus();
  }, [user, loading, navigate]);

  const [formData, setFormData] = useState({
    // Contact
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
    loadExistingProfile();
  }, []);

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, country')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (data) setCities(data);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadExistingProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
          // Load saved progress if onboarding not completed
          if (!data.onboarding_completed_at && data.onboarding_partial_data) {
            const saved = data.onboarding_partial_data as Record<string, any>;
            
            // Resume from saved step
            setCurrentStep(data.onboarding_current_step || 0);
            
            // Restore form data
            setFormData(prev => ({
              ...prev,
              phone: saved.phone || '',
              location: saved.location || data.location || '',
              current_title: saved.current_title || data.current_title || '',
              linkedin_url: saved.linkedin_url || data.linkedin_url || '',
              bio: saved.bio || data.career_preferences || '',
              resume_url: saved.resume_url || '',
              resume_filename: saved.resume_filename || '',
              employment_type: saved.employment_type || 'fulltime',
              notice_period: saved.notice_period || '2_weeks',
              remote_work_aspiration: saved.remote_work_aspiration || false,
              preferred_work_locations: saved.preferred_work_locations || [],
              current_salary_min: saved.current_salary_min || 50000,
              current_salary_max: saved.current_salary_max || 70000,
              desired_salary_min: saved.desired_salary_min || 70000,
              desired_salary_max: saved.desired_salary_max || 90000,
              freelance_hourly_rate_min: saved.freelance_hourly_rate_min || 50,
              freelance_hourly_rate_max: saved.freelance_hourly_rate_max || 100,
              salary_preference_hidden: saved.salary_preference_hidden || false,
              remote_work_preference: saved.remote_work_preference || false,
            }));
            
            setPhoneNumber(saved.phone || '');
            setPhoneVerified(saved.phone_verified || false);
            
            toast.success("Welcome back! We've restored your progress");
        } else {
          // Pre-fill any existing data for first-time onboarding
          const employmentType = data.employment_type_preference as "fulltime" | "freelance" | "both" | null;
          const workLocations = Array.isArray(data.preferred_work_locations) 
            ? data.preferred_work_locations as Array<{ city: string; country: string; radius_km: number }>
            : [];
          
          setFormData(prev => ({
            ...prev,
            phone: data.phone || "",
            location: data.location || "",
            current_title: data.current_title || "",
            linkedin_url: data.linkedin_url || "",
            bio: data.career_preferences || "",
            employment_type: employmentType || "fulltime",
            notice_period: data.notice_period || "2_weeks",
            remote_work_aspiration: data.remote_work_aspiration || false,
            current_salary_min: data.current_salary_min || 50000,
            current_salary_max: data.current_salary_max || 70000,
            salary_preference_hidden: data.salary_preference_hidden || false,
            desired_salary_min: data.desired_salary_min || 70000,
            desired_salary_max: data.desired_salary_max || 90000,
            remote_work_preference: data.remote_work_preference || false,
            preferred_work_locations: workLocations,
            resume_url: data.resume_url || "",
            resume_filename: data.resume_filename || "",
          }));
          
          // Check if phone is already verified
          if (data.phone_verified && data.phone) {
            setPhoneNumber(data.phone);
            setPhoneVerified(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, [user, toast]); // Added missing dependencies

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!validateFile(file)) return;

    try {
      // Upload using the hook
      const result = await uploadResume(file, user.id, 'candidate');
      
      if (result) {
        setFormData(prev => ({
          ...prev,
          resume_url: result.url,
          resume_filename: result.filename,
        }));

        toast.success("Resume uploaded successfully!");
      }
    } catch (error: any) {
      console.error('Error uploading resume:', error);
      // Hook handles toast error for upload, but logic error might happen
    }
  };

  const handleRemoveResume = async () => {
    if (formData.resume_url && user) {
      try {
        const path = formData.resume_url.split('/resumes/')[1];
        await supabase.storage.from('resumes').remove([path]);
      } catch (error) {
        console.error('Error removing resume:', error);
      }
    }
    setFormData(prev => ({ ...prev, resume_url: "", resume_filename: "" }));
  };

  const addWorkLocation = () => {
    const city = cities.find(c => c.id === selectedCity);
    if (!city) return;

    setFormData(prev => ({
      ...prev,
      preferred_work_locations: [
        ...prev.preferred_work_locations,
        { city: city.name, country: city.country, radius_km: cityRadius }
      ]
    }));
    setSelectedCity("");
    setCityRadius(25);
  };

  const removeWorkLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preferred_work_locations: prev.preferred_work_locations.filter((_, i) => i !== index)
    }));
  };

  const handleVerifyPhone = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    const success = await verifyOTP(phoneNumber, verificationCode);
    if (success) {
      setPhoneVerified(true);
      setFormData(prev => ({ ...prev, phone: phoneNumber }));
      toast.success("Phone number verified!");
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0: // Contact
        if (!phoneNumber) {
          toast.error("Please enter your phone number");
          return false;
        }
        if (!phoneVerified) {
          toast.error("Please verify your phone number first");
          return false;
        }
        break;
      case 1: // Professional
        if (!formData.current_title) {
          toast.error("Please enter your current job title");
          return false;
        }
        break;
      case 2: // Career
        if (!formData.dream_job_title) {
          toast.error("Please enter your dream job title");
          return false;
        }
        break;
    }
    return true;
  };

      // Save partial progress after each step
      const savePartialProgress = async (completedStep: number) => {
        if (!user) return;
        
        try {
          const partialData: Record<string, any> = {};
          
          if (completedStep >= 0) {
            partialData.phone = phoneNumber;
            partialData.phone_verified = phoneVerified;
            partialData.location = formData.location;
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
            partialData.current_salary_min = formData.current_salary_min;
            partialData.current_salary_max = formData.current_salary_max;
            partialData.desired_salary_min = formData.desired_salary_min;
            partialData.desired_salary_max = formData.desired_salary_max;
            partialData.freelance_hourly_rate_min = formData.freelance_hourly_rate_min;
            partialData.freelance_hourly_rate_max = formData.freelance_hourly_rate_max;
            partialData.salary_preference_hidden = formData.salary_preference_hidden;
          }
          
          if (completedStep >= 3) {
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

          console.log(`[OAuth Onboarding] Saved progress for step ${completedStep + 1}`);
        } catch (err) {
          console.error('[OAuth Onboarding] Failed to save partial progress:', err);
        }
      };

  const handleNext = async () => {
    // Step 0: Contact - handle phone verification
    if (currentStep === 0) {
      if (!phoneNumber) {
        toast.error("Please enter your phone number");
        return;
      }
      
      if (!phoneVerified) {
        // Send OTP
        const success = await sendOTP(phoneNumber);
        if (success) {
          toast.success("Verification code sent to your phone");
        }
        return;
      }
    }
    
    if (!validateStep()) return;
    
    // Save progress before moving to next step
    await savePartialProgress(currentStep);
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = async () => {
    // Update step tracker when going back
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_current_step: currentStep,
          onboarding_last_activity_at: new Date().toISOString()
        })
        .eq('id', user.id);
    }
    
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('[OAuth Onboarding] Updating profile for user:', user.id);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumber,
          phone_verified: true,
          location: formData.location || null,
          current_title: formData.current_title,
          linkedin_url: formData.linkedin_url || null,
          career_preferences: formData.bio || null,
          employment_type_preference: formData.employment_type,
          notice_period: formData.notice_period,
          remote_work_aspiration: formData.remote_work_aspiration,
          current_salary_min: formData.salary_preference_hidden ? null : formData.current_salary_min,
          current_salary_max: formData.salary_preference_hidden ? null : formData.current_salary_max,
          salary_preference_hidden: formData.salary_preference_hidden,
          desired_salary_min: formData.desired_salary_min,
          desired_salary_max: formData.desired_salary_max,
          freelance_hourly_rate_min: formData.freelance_hourly_rate_min,
          freelance_hourly_rate_max: formData.freelance_hourly_rate_max,
          remote_work_preference: formData.remote_work_preference,
          preferred_work_locations: formData.preferred_work_locations,
          resume_url: formData.resume_url || null,
          resume_filename: formData.resume_filename || null,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error("[OAuth Onboarding] Profile update error:", profileError);
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      console.log('[OAuth Onboarding] Profile updated successfully');
      toast.success("Profile completed! Welcome to The Quantum Club!");
      
      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 500);
    } catch (error: any) {
      console.error('[OAuth Onboarding] Error:', error);
      toast.error(error.message || "Failed to complete onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Show loading state while checking authentication
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-xl border-border/50">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {STEPS.length}</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 0: Contact Info */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Contact Information</h3>
              </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <PhoneInput
          international
          defaultCountry={(countryCode as any) || "NL"}
          value={phoneNumber}
          onChange={(value: string) => setPhoneNumber(value || "")}
          disabled={phoneVerified}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        {phoneVerified && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle className="w-4 h-4" />
            <span>Phone verified</span>
          </div>
        )}
      </div>

              {otpSent && !phoneVerified && (
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg space-y-2">
                    <p className="text-sm font-semibold text-primary">Verify Your Phone</p>
                    <p className="text-xs text-muted-foreground">
                      We sent a 6-digit code to {phoneNumber}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={setVerificationCode}
                      disabled={isVerifying}
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
                  </div>

                  <Button
                    onClick={handleVerifyPhone}
                    disabled={verificationCode.length !== 6 || isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                    ) : (
                      "Verify Phone"
                    )}
                  </Button>

                  {resendCooldown > 0 ? (
                    <p className="text-xs text-center text-muted-foreground">
                      Resend code in {resendCooldown}s
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => sendOTP(phoneNumber)}
                      disabled={isSendingOtp}
                      className="w-full"
                    >
                      Resend Code
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Amsterdam, Netherlands"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Step 1: Professional Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Professional Information</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current_title">Current Job Title *</Label>
                <Input
                  id="current_title"
                  placeholder="e.g., Senior Software Engineer"
                  value={formData.current_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn Profile (optional)</Label>
                <Input
                  id="linkedin_url"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your professional journey..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Resume (optional)</Label>
                {formData.resume_url ? (
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    <span className="text-sm flex-1">{formData.resume_filename}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveResume}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingResume}
                  >
                    {isUploadingResume ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> Upload Resume</>
                    )}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Step 2: Career Goals */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Career Goals</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dream_job_title">Dream Job Title *</Label>
                <Input
                  id="dream_job_title"
                  placeholder="e.g., CTO, Lead Engineer"
                  value={formData.dream_job_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, dream_job_title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employment_type">Employment Type</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, employment_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Full-time Only</SelectItem>
                    <SelectItem value="freelance">Freelance Only</SelectItem>
                    <SelectItem value="both">Open to Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notice_period">Notice Period</Label>
                <Select
                  value={formData.notice_period}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, notice_period: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="2_weeks">2 Weeks</SelectItem>
                    <SelectItem value="1_month">1 Month</SelectItem>
                    <SelectItem value="2_months">2 Months</SelectItem>
                    <SelectItem value="3_months">3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="remote_work">Open to Remote Work?</Label>
                  <p className="text-xs text-muted-foreground">Include remote opportunities</p>
                </div>
                <Switch
                  id="remote_work"
                  checked={formData.remote_work_aspiration}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, remote_work_aspiration: checked }))}
                />
              </div>

              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Salary Expectations</h4>
                </div>

                <div className="space-y-2">
                  <Label>Desired Salary Range: €{formData.desired_salary_min.toLocaleString()} - €{formData.desired_salary_max.toLocaleString()}</Label>
                  <Slider
                    min={30000}
                    max={300000}
                    step={5000}
                    value={[formData.desired_salary_min, formData.desired_salary_max]}
                    onValueChange={([min, max]) => setFormData(prev => ({ ...prev, desired_salary_min: min, desired_salary_max: max }))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.salary_preference_hidden}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, salary_preference_hidden: checked }))}
                  />
                  <Label className="text-sm">Hide current salary from employers</Label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Work Preferences</h3>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label>Prefer Remote Work?</Label>
                  <p className="text-xs text-muted-foreground">Prioritize remote opportunities</p>
                </div>
                <Switch
                  checked={formData.remote_work_preference}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, remote_work_preference: checked }))}
                />
              </div>

              <div className="space-y-4">
                <Label>Preferred Work Locations (optional)</Label>
                <div className="flex gap-2">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}, {city.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={addWorkLocation}
                    disabled={!selectedCity}
                  >
                    Add
                  </Button>
                </div>

                {formData.preferred_work_locations.length > 0 && (
                  <div className="space-y-2">
                    {formData.preferred_work_locations.map((loc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <span className="text-sm">{loc.city}, {loc.country} (within {loc.radius_km}km)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWorkLocation(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            
            <div className="ml-auto">
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext} disabled={isLoading}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Completing...</>
                  ) : (
                    "Complete Profile"
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
