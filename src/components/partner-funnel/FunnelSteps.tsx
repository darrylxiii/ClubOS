import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, CheckCircle, Calendar, Users, Target, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TrackRequestDialog } from "./TrackRequestDialog";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { useEmailVerification } from "@/hooks/useEmailVerification";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { PartnerRequestTracker } from "./PartnerRequestTracker";
import ReCAPTCHA from "react-google-recaptcha";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const RECAPTCHA_SITE_KEY = "6LdusOorAAAAAJLafi_rysBZBoO4lNnWc0Z7o7-7";

const STEPS = ["contact", "company", "partnership", "compliance", "verification"];

export function FunnelSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
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

  const [formData, setFormData] = useState({
    // Contact
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    // Company
    company_name: "",
    website: "",
    industry: "",
    company_size: "",
    headquarters_location: "",
    // Partnership
    estimated_roles_per_year: "",
    budget_range: "",
    timeline: "",
    description: "",
    // Compliance
    agreed_no_cure_no_pay: false,
    agreed_privacy: false,
    agreed_nda: false,
  });

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

  const handleNext = async () => {
    // If on contact step and email not verified, send OTP
    if (currentStep === 0 && !emailVerified) {
      const success = await sendEmailOTP(formData.contact_email);
      if (success) {
        toast({ 
          title: "Verification code sent", 
          description: "Please check your email and enter the code below" 
        });
      }
      return;
    }
    
    if (!validateStep()) return;
    
    // If moving from compliance to verification, verify reCAPTCHA and send OTP
    if (currentStep === 3) {
      if (!phoneNumber) {
        toast({ title: "Please enter your phone number", variant: "destructive" });
        return;
      }
      
      if (!recaptchaToken) {
        toast({ 
          title: "Please complete the reCAPTCHA verification", 
          description: "Make sure you check the reCAPTCHA box",
          variant: "destructive" 
        });
        return;
      }
      
      // Verify reCAPTCHA token
      try {
        const { data, error } = await supabase.functions.invoke('verify-recaptcha', {
          body: { token: recaptchaToken }
        });
        
        if (error || !data?.success) {
          toast({ 
            title: "reCAPTCHA verification failed", 
            description: data?.error || "The reCAPTCHA key may be invalid. Please contact support.",
            variant: "destructive" 
          });
          recaptchaRef.current?.reset();
          setRecaptchaToken(null);
          return;
        }
      } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        toast({ 
          title: "Verification error", 
          description: "Please try again or contact support if the problem persists",
          variant: "destructive" 
        });
        return;
      }
      
      const success = await sendOTP(phoneNumber);
      if (!success) {
        return;
      }
    }
    
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
        if (!formData.contact_name || !formData.contact_email) {
          toast({ title: "Please fill in all required fields", variant: "destructive" });
          return false;
        }
        if (!emailRegex.test(formData.contact_email)) {
          toast({ title: "Please enter a valid email address", variant: "destructive" });
          return false;
        }
        if (!emailVerified) {
          toast({ title: "Please verify your email address first", variant: "destructive" });
          return false;
        }
        break;
      case 1: // Company
        if (!formData.company_name || !formData.industry || !formData.company_size) {
          toast({ title: "Please fill in all required fields", variant: "destructive" });
          return false;
        }
        break;
      case 2: // Partnership
        if (!formData.description) {
          toast({ title: "Please fill in all required fields", variant: "destructive" });
          return false;
        }
        break;
      case 3: // Compliance
        if (!formData.agreed_no_cure_no_pay || !formData.agreed_privacy) {
          toast({ title: "Please accept the required terms", variant: "destructive" });
          return false;
        }
        if (!phoneNumber) {
          toast({ title: "Please enter your phone number", variant: "destructive" });
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    // Verify phone before submission
    const verified = await verifyOTP(phoneNumber, verificationCode, async () => {
      const timeToComplete = Math.floor((Date.now() - startTime) / 1000);

      const { error } = await supabase.from("partner_requests").insert({
        ...formData,
        contact_phone: phoneNumber,
        estimated_roles_per_year: formData.estimated_roles_per_year ? parseInt(formData.estimated_roles_per_year) : null,
        session_id: sessionId,
        steps_completed: 5,
        time_to_complete_seconds: timeToComplete,
        last_step_viewed: "verification",
        source_channel: new URLSearchParams(window.location.search).get("source") || "direct",
        utm_source: new URLSearchParams(window.location.search).get("utm_source"),
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
      });

      await trackStep("complete");

      if (error) {
        toast({ title: "Submission failed", description: error.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Successfully submitted Partner Request",
        description: "Your strategist will respond within 19 minutes on average.",
      });

      // Show success view
      setCurrentStep(5);
    });

    if (!verified) {
      toast({ title: "Invalid verification code", description: "Please try again.", variant: "destructive" });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Users className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">Contact Information</h2>
              <p className="text-muted-foreground">Let's start with your details</p>
            </div>
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="john@company.com"
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
                      We've sent a 6-digit code to {formData.contact_email}
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
                        verifyEmailOTP(formData.contact_email, value, () => {
                          setEmailVerified(true);
                          setEmailOtpCode("");
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
                      onClick={() => sendEmailOTP(formData.contact_email)}
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
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Target className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">Company Details</h2>
              <p className="text-muted-foreground">Tell us about your organization</p>
            </div>
            <div>
              <Label>Company Name *</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="www.acme.com"
              />
            </div>
            <div>
              <Label>Industry *</Label>
              <Select value={formData.industry} onValueChange={(value) => setFormData({ ...formData, industry: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="consulting">Consulting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Company Size *</Label>
              <Select value={formData.company_size} onValueChange={(value) => setFormData({ ...formData, company_size: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501-1000">501-1000 employees</SelectItem>
                  <SelectItem value="1001+">1001+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Headquarters Location</Label>
              <Input
                value={formData.headquarters_location}
                onChange={(e) => setFormData({ ...formData, headquarters_location: e.target.value })}
                placeholder="Amsterdam, Netherlands"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Calendar className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">Partnership Details</h2>
              <p className="text-muted-foreground">Define your recruitment needs</p>
            </div>
            <div>
              <Label>Estimated Roles per Year</Label>
              <Input
                type="number"
                value={formData.estimated_roles_per_year}
                onChange={(e) => setFormData({ ...formData, estimated_roles_per_year: e.target.value })}
                placeholder="10"
              />
            </div>
            <div>
              <Label>Budget Range</Label>
              <Select value={formData.budget_range} onValueChange={(value) => setFormData({ ...formData, budget_range: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="<50k">&lt; €50,000</SelectItem>
                  <SelectItem value="50k-100k">€50,000 - €100,000</SelectItem>
                  <SelectItem value="100k-250k">€100,000 - €250,000</SelectItem>
                  <SelectItem value="250k-500k">€250,000 - €500,000</SelectItem>
                  <SelectItem value="500k+">€500,000+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Timeline</Label>
              <Select value={formData.timeline} onValueChange={(value) => setFormData({ ...formData, timeline: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="When do you need to start?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="1_month">Within 1 month</SelectItem>
                  <SelectItem value="3_months">Within 3 months</SelectItem>
                  <SelectItem value="6_months">Within 6 months</SelectItem>
                  <SelectItem value="planning">Just planning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell us about your hiring needs, team culture, and what success looks like..."
                rows={5}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-2">Terms & Compliance</h2>
              <p className="text-muted-foreground">Review and accept our partnership terms</p>
            </div>
            
            <Card className="p-6 glass-effect">
              <h3 className="font-semibold mb-3">No-Cure-No-Pay Model</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You only pay when we successfully place a candidate. No upfront fees, no retainers. 
                Our fee is 20% of first-year salary, paid only upon successful hire and completion of probation period.
              </p>
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={formData.agreed_no_cure_no_pay}
                  onCheckedChange={(checked) => setFormData({ ...formData, agreed_no_cure_no_pay: checked as boolean })}
                />
                <Label className="text-sm cursor-pointer">
                  I agree to the no-cure-no-pay terms and fee structure *
                </Label>
              </div>
            </Card>

            <Card className="p-6 glass-effect">
              <h3 className="font-semibold mb-3">Privacy & Data Protection</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We handle all candidate and company data in strict compliance with GDPR and privacy regulations. 
                Data is only shared with explicit consent and used solely for recruitment purposes.
              </p>
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={formData.agreed_privacy}
                  onCheckedChange={(checked) => setFormData({ ...formData, agreed_privacy: checked as boolean })}
                />
                <Label className="text-sm cursor-pointer">
                  I agree to the privacy policy and data handling terms *
                </Label>
              </div>
            </Card>

            <Card className="p-6 glass-effect">
              <h3 className="font-semibold mb-3">Non-Disclosure Agreement (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For sensitive searches or confidential company information, we can establish an NDA 
                to protect proprietary information shared during the partnership.
              </p>
              <div className="flex items-start space-x-3">
                <Checkbox
                  checked={formData.agreed_nda}
                  onCheckedChange={(checked) => setFormData({ ...formData, agreed_nda: checked as boolean })}
                />
                <Label className="text-sm cursor-pointer">
                  I would like to establish an NDA for this partnership
                </Label>
              </div>
            </Card>

            <div>
              <Label>Phone Number *</Label>
              <PhoneInput
                international
                defaultCountry="NL"
                value={phoneNumber}
                onChange={(value) => setPhoneNumber(value || "")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-center pt-4">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setRecaptchaToken(token)}
                onExpired={() => setRecaptchaToken(null)}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Phone className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Verify Your Phone</h2>
              <p className="text-muted-foreground">
                We sent a verification code to {phoneNumber}
              </p>
            </div>

            <div className="space-y-4">
              <Label htmlFor="code">Verification Code *</Label>
              <Input
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
              />
            </div>

            {resendCooldown > 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                Resend code in {resendCooldown}s
              </p>
            ) : (
              <Button
                variant="ghost"
                onClick={() => sendOTP(phoneNumber)}
                disabled={isSendingOtp}
                className="w-full"
              >
                Resend Code
              </Button>
            )}
          </div>
        );

      case 5:
        return (
          <div className="py-8">
            <div className="text-center mb-8">
              <CheckCircle className="w-20 h-20 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-3">Successfully Submitted Partner Request</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Thank you for your interest in partnering with The Quantum Club. 
                Your strategist is reviewing your request now.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <PartnerRequestTracker />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button size="lg" onClick={() => navigate("/booking")}>
                Book a Call
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/companies")}>
                View Portfolio
              </Button>
            </div>
          </div>
        );
    }
  };

  if (currentStep === 5) {
    return <Card className="p-8 glass-effect">{renderStep()}</Card>;
  }

  return (
    <Card className="p-8 glass-effect">
      {/* Availability Indicator */}
      <div className="flex items-center justify-center gap-3 p-4 glass-effect border border-primary/20 rounded-2xl mb-6">
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
        </div>
        <span className="text-sm font-semibold">
          <span className="text-green-500">2/5</span> partner spots left for this quarter
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of 5
          </span>
          <span className="text-sm font-medium">
            {Math.round(((currentStep + 1) / 5) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      {renderStep()}

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <div className="flex gap-4 mt-8">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {currentStep < 4 ? (
            <Button onClick={handleNext} className="flex-1">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={!verificationCode || verificationCode.length !== 6 || isVerifying}
            >
              {isVerifying ? "Verifying..." : "Submit Request"}
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
