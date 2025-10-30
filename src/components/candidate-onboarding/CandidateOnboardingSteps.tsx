import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, CheckCircle, User, Briefcase, Target, DollarSign, MapPin, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Slider } from "@/components/ui/slider";

const STEPS = ["contact", "professional", "career", "compensation", "preferences"];

export function CandidateOnboardingSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [cities, setCities] = useState<Array<{ id: string; name: string; country: string }>>([]);
  const [selectedCity, setSelectedCity] = useState("");
  
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

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

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
    // Career
    dream_job_title: "",
    employment_type: "fulltime" as "fulltime" | "freelance" | "both",
    notice_period: "2_weeks",
    // Compensation
    current_salary_min: 50000,
    current_salary_max: 70000,
    desired_salary_min: 70000,
    desired_salary_max: 90000,
    freelance_hourly_rate_min: 50,
    freelance_hourly_rate_max: 100,
    // Preferences
    remote_work_preference: false,
    preferred_work_locations: [] as string[],
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

  const handleNext = async () => {
    // Email verification on first step
    if (currentStep === 0 && !emailVerified) {
      const success = await sendEmailOTP(formData.email);
      if (success) {
        toast({ 
          title: "Verification code sent", 
          description: "Please check your email and enter the code below" 
        });
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
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!phoneVerified) {
      toast({ title: "Please verify your phone number first", variant: "destructive" });
      return;
    }

    try {
      const timeToComplete = Math.floor((Date.now() - startTime) / 1000);

      // Create or update profile with onboarding data
      const profileData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: phoneNumber,
        phone_verified: true,
        email_verified: true,
        location: formData.location,
        current_title: formData.current_title,
        linkedin_url: formData.linkedin_url,
        career_preferences: formData.bio,
        employment_type_preference: formData.employment_type,
        notice_period: formData.notice_period,
        current_salary_min: formData.current_salary_min,
        current_salary_max: formData.current_salary_max,
        desired_salary_min: formData.desired_salary_min,
        desired_salary_max: formData.desired_salary_max,
        freelance_hourly_rate_min: formData.freelance_hourly_rate_min,
        freelance_hourly_rate_max: formData.freelance_hourly_rate_max,
        remote_work_preference: formData.remote_work_preference,
        preferred_work_locations: formData.preferred_work_locations,
        onboarding_completed_at: new Date().toISOString(),
      };

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', session.user.id);

        if (error) throw error;
      } else {
        // Store in candidate_profiles for later merge
        const { error } = await supabase
          .from('candidate_profiles')
          .insert({
            ...profileData,
            session_id: sessionId,
            onboarding_source: 'funnel',
          });

        if (error) throw error;
      }

      await trackStep("complete");

      toast({
        title: "Profile completed successfully!",
        description: "You'll be redirected to create your account.",
      });

      // Redirect based on login status
      if (session) {
        navigate('/home');
      } else {
        // Redirect to auth with email pre-filled
        navigate(`/auth?email=${encodeURIComponent(formData.email)}&from=onboarding`);
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    }
  };

  const handleAddPreferredLocation = () => {
    if (selectedCity && !formData.preferred_work_locations.includes(selectedCity)) {
      setFormData({
        ...formData,
        preferred_work_locations: [...formData.preferred_work_locations, selectedCity]
      });
      setSelectedCity('');
    }
  };

  const handleRemovePreferredLocation = (location: string) => {
    setFormData({
      ...formData,
      preferred_work_locations: formData.preferred_work_locations.filter(loc => loc !== location)
    });
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

            {emailOtpSent && !emailVerified && (
              <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <Label className="text-base font-semibold">Verify Your Email</Label>
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
              <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your current location" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={`${city.name}, ${city.country}`}>
                      {city.name}, {city.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <Label>Current Salary Range (€/year)</Label>
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
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    €{formData.current_salary_min.toLocaleString()} - €{formData.current_salary_max.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Desired Salary Range (€/year) *</Label>
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
                      .filter(city => !formData.preferred_work_locations.includes(`${city.name}, ${city.country}`))
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

              {formData.preferred_work_locations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.preferred_work_locations.map((location) => (
                    <div
                      key={location}
                      className="flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg text-sm"
                    >
                      <span>{location}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreferredLocation(location)}
                        className="text-primary hover:text-primary/80"
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
                  defaultCountry="NL"
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

      case 5: // Success
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Profile Complete!</h2>
            <p className="text-lg text-muted-foreground mb-8">
              You're all set. Your profile has been created successfully.
            </p>
            <Button onClick={handleSubmit} size="lg">
              Continue to Dashboard
            </Button>
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
  ];

  if (currentStep === 5) {
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
            style={{ width: `${(currentStep / 4) * 100}%` }}
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
        
        {currentStep < 4 ? (
          <Button onClick={handleNext}>
            {currentStep === 0 && !emailVerified ? "Send Verification Code" :
             currentStep === 4 && !phoneVerified ? "Send Verification Code" :
             "Continue"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!phoneVerified}>
            Complete Profile
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </Card>
  );
}
