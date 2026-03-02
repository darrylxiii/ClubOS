import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { migrateToast as toast } from "@/lib/notify";
import { ArrowRight, ArrowLeft, CheckCircle, Loader2, Clock, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TrackRequestDialog } from "./TrackRequestDialog";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useCountryDetection } from "@/hooks/useCountryDetection";
import { useFunnelAutoSave } from "@/hooks/useFunnelAutoSave";
import { ResumeFunnelDialog } from "./ResumeFunnelDialog";
import { Badge } from "@/components/ui/badge";
import { ExitIntentPopup, useExitIntent } from "./ExitIntentPopup";
import { TrustBadges } from "./TrustBadges";
import { FunnelErrorBoundary } from "./FunnelErrorBoundary";
import { useFormValidation, FieldError } from "@/hooks/useFormValidation";
import { MobileProgressIndicator, DesktopProgressSteps } from "./MobileProgressIndicator";
import { SuccessConfetti } from "./SuccessConfetti";
import { useFunnelAnalytics } from "@/hooks/useFunnelAnalytics";
import { useActiveFunnelExperiments } from "@/hooks/useFunnelABTest";
import { usePrefetch } from "./LazyFunnelComponents";
import { NetworkStatusIndicator, InlineNetworkStatus } from "./NetworkStatusIndicator";
import { StepTransition } from "./StepTransition";
import { cn } from "@/lib/utils";
import { RainbowButton } from "@/components/ui/rainbow-button";

// 3 clean, benefit-oriented step labels
const STEPS = ["About you", "Your brief", "Review"];

const STEP_TIME_ESTIMATES: Record<number, number> = {
  0: 1,
  1: 1,
  2: 0,
};

export function FunnelSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [startTime] = useState(Date.now());
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [spotsLeft, setSpotsLeft] = useState(2);

  // Email-first micro-step state
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<'idle' | 'checking' | 'verified' | 'failed' | 'otp_sent' | 'otp_verified'>('idle');
  const [emailVerifyReason, setEmailVerifyReason] = useState<string | null>(null);

  // Honeypot field for spam prevention
  const [honeypot, setHoneypot] = useState("");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  usePrefetch(currentStep);
  const validation = useFormValidation();
  const analytics = useFunnelAnalytics(sessionId);
  const experiments = useActiveFunnelExperiments(sessionId);
  const partialSaveRef = useRef(false);

  // Exit intent – enable on step 0 and step 1
  const handleExitIntent = useCallback(() => {
    if (currentStep >= 0 && currentStep < 2) {
      setExitIntentOpen(true);
    }
  }, [currentStep]);

  useExitIntent(currentStep >= 0 && currentStep < 2, handleExitIntent);

  const autoSave = useFunnelAutoSave({
    storageKey: 'partner_funnel_save',
    debounceMs: 300,
    expiryHours: 24,
  });

  const { countryCode } = useCountryDetection();

  const [formData, setFormData] = useState({
    // Step 0 — Your Details
    contact_name: "",
    contact_email: "",
    company_name: "",
    industry: "",
    // Step 1 — Hiring Needs
    company_size: "",
    headquarters_location: "",
    website: "",
    estimated_roles_per_year: "",
    budget_range: "",
    timeline: "",
    description: "",
  });

  // Resume from email link (?resume=sessionId)
  useEffect(() => {
    const resumeId = searchParams.get('resume');
    if (resumeId) {
      setIsResuming(true);
      (async () => {
        try {
          const { data } = await supabase
            .from('funnel_partial_submissions')
            .select('*')
            .eq('session_id', resumeId)
            .single();

          if (data && !data.completed) {
            const savedForm = data.form_data as Record<string, string> || {};
            setFormData(prev => ({
              ...prev,
              contact_email: data.contact_email || '',
              contact_name: data.contact_name || '',
              company_name: data.company_name || '',
              ...savedForm,
            }));
            setEmailCaptured(true);
            if (data.current_step > 0) {
              setCurrentStep(data.current_step);
            }
            if (savedForm._saved_utm_source || savedForm._saved_utm_medium || savedForm._saved_utm_campaign) {
              analytics.setUtmOverrides({
                utm_source: savedForm._saved_utm_source || null,
                utm_medium: savedForm._saved_utm_medium || null,
                utm_campaign: savedForm._saved_utm_campaign || null,
                source_channel: savedForm._saved_source_channel || 'direct',
              });
            }
            toast({
              title: "Welcome back.",
              description: "We've restored your progress.",
            });
          }
        } catch {
          // Silent fail — just start fresh
        } finally {
          setIsResuming(false);
        }
      })();
      return;
    }

    // Load saved data from localStorage
    const savedData = autoSave.load();
    if (savedData && !savedData.completed) {
      const savedAge = savedData.timestamp
        ? Date.now() - new Date(savedData.timestamp).getTime()
        : 0;
      const isStaleEnough = savedAge > 5 * 60 * 1000; // 5 minutes

      if (
        isStaleEnough &&
        (savedData.currentStep > 0 ||
          (savedData.formData?.contact_name && savedData.formData?.contact_email))
      ) {
        setTimeout(() => setResumeDialogOpen(true), 500);
      }
    }

    const loadSpotsCount = async () => {
      const { data } = await supabase
        .from("funnel_config")
        .select("live_stats")
        .single();
      if (data?.live_stats && typeof data.live_stats === 'object') {
        const stats = data.live_stats as { available_spots?: number };
        if (stats.available_spots !== undefined) {
          setSpotsLeft(stats.available_spots);
        }
      }
    };
    loadSpotsCount();
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    if (currentStep > 0 || formData.contact_name || formData.contact_email) {
      autoSave.save({ ...formData, phoneNumber }, currentStep, sessionId);
    }
  }, [formData, currentStep, phoneNumber]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Enter' &&
        e.target instanceof HTMLElement &&
        e.target.tagName !== 'TEXTAREA' &&
        !e.target.closest('[role="textbox"]')
      ) {
        e.preventDefault();
        if (currentStep === 0 && !emailCaptured) {
          handleEmailCapture();
        } else {
          handleNext();
        }
      }
      if (e.key === 'Escape' && currentStep > 0 && currentStep < 3) {
        e.preventDefault();
        handleBack();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, formData, phoneNumber, emailCaptured]);

  // Track step views
  useEffect(() => {
    analytics.trackStepView(currentStep, STEPS[currentStep]);
  }, [currentStep, analytics]);

  // Upsert partial submission to DB
  const upsertPartialSubmission = useCallback(async (email: string) => {
    try {
      await supabase
        .from('funnel_partial_submissions')
        .upsert({
          session_id: sessionId,
          contact_email: email,
          contact_name: formData.contact_name || null,
          company_name: formData.company_name || null,
          form_data: formData,
          current_step: currentStep,
          last_active_at: new Date().toISOString(),
        }, { onConflict: 'session_id' });
    } catch {
      // Non-blocking
    }
  }, [sessionId, formData, currentStep]);

  // Update partial submission on step change
  useEffect(() => {
    if (emailCaptured && partialSaveRef.current) {
      supabase
        .from('funnel_partial_submissions')
        .update({
          form_data: formData,
          current_step: currentStep,
          last_active_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
        .then(() => {});
    }
  }, [currentStep]);

  // Handle email capture (Phase A → Phase B)
  const handleEmailCapture = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.contact_email || !emailRegex.test(formData.contact_email)) {
      toast({ title: "Please enter a valid work email", variant: "destructive" });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    if (utmSource || utmMedium || utmCampaign) {
      setFormData(prev => ({
        ...prev,
        _saved_utm_source: utmSource || '',
        _saved_utm_medium: utmMedium || '',
        _saved_utm_campaign: utmCampaign || '',
      } as any));
    }

    await upsertPartialSubmission(formData.contact_email);
    partialSaveRef.current = true;

    // Silent email verification via MillionVerifier + Findymail
    setEmailVerificationStatus('checking');
    try {
      const { data, error } = await supabase.functions.invoke('verify-funnel-email', {
        body: { email: formData.contact_email, sessionId },
      });

      if (error) {
        console.warn('Email verification failed (proceeding):', error);
        setEmailVerificationStatus('idle');
        setEmailCaptured(true);
        return;
      }

      const quality = data?.quality || 'unknown';

      if (quality === 'verified' || quality === 'unknown' || quality === 'catch_all') {
        setEmailVerificationStatus('verified');
        setEmailCaptured(true);
      } else {
        // invalid or disposable
        setEmailVerificationStatus('failed');
        setEmailVerifyReason(data?.reason || 'invalid');
      }
    } catch {
      // Fail open
      setEmailVerificationStatus('idle');
      setEmailCaptured(true);
    }
  };

  // Handle OTP verification for failed emails
  const handleSendOtp = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-email-verification', {
        body: { email: formData.contact_email, type: 'funnel' },
      });
      if (error) throw error;
      setEmailVerificationStatus('otp_sent');
      toast({ title: "Verification code sent.", description: `Check ${formData.contact_email}.` });
    } catch {
      toast({ title: "Could not send code. Try again.", variant: "destructive" });
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) return;
    try {
      const { data, error } = await supabase.functions.invoke('verify-email-code', {
        body: { email: formData.contact_email, code },
      });
      if (error) throw error;
      if (data?.verified) {
        setEmailVerificationStatus('otp_verified');
        // Update email_quality in DB
        if (partialSaveRef.current) {
          supabase
            .from('funnel_partial_submissions')
            .update({ email_quality: 'otp_verified', email_verified_at: new Date().toISOString() })
            .eq('session_id', sessionId)
            .then(() => {});
        }
        setEmailCaptured(true);
      } else {
        toast({ title: "Invalid code. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Verification failed. Please try again.", variant: "destructive" });
    }
  };

  const handleUseAnotherEmail = () => {
    setFormData(prev => ({ ...prev, contact_email: '' }));
    setEmailVerificationStatus('idle');
    setEmailVerifyReason(null);
  };

  // Handle email blur — auto-capture if valid
  const handleEmailBlur = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.contact_email && emailRegex.test(formData.contact_email) && !emailCaptured) {
      handleEmailCapture();
    }
    validation.validateField('contact_email', formData.contact_email);
  };

  const validateStep = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (currentStep) {
      case 0:
        if (!formData.contact_name || !formData.contact_email || !formData.company_name || !formData.industry) {
          toast({ title: "Please complete the required fields.", variant: "destructive" });
          return false;
        }
        if (!emailRegex.test(formData.contact_email)) {
          toast({ title: "Please enter a valid email address", variant: "destructive" });
          return false;
        }
        break;
      case 1:
        if (!formData.company_size) {
          toast({ title: "Please select your company size", variant: "destructive" });
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (partialSaveRef.current) {
      await supabase
        .from('funnel_partial_submissions')
        .update({
          contact_name: formData.contact_name,
          company_name: formData.company_name,
          form_data: formData,
          current_step: currentStep + 1,
          last_active_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId);
    }

    await analytics.trackStepComplete(currentStep, STEPS[currentStep]);
    setTransitionDirection('forward');
    setCurrentStep(currentStep + 1);
  };

  const handleBack = async () => {
    await analytics.trackStepAbandon(currentStep, STEPS[currentStep]);
    setTransitionDirection('backward');
    setCurrentStep(currentStep - 1);
  };

  const handleContinue = () => {
    const savedData = autoSave.load();
    if (savedData) {
      setFormData(savedData.formData);
      setCurrentStep(savedData.currentStep);
      setPhoneNumber(savedData.formData.phoneNumber || "");
      if (savedData.formData.contact_email) {
        setEmailCaptured(true);
        partialSaveRef.current = true;
      }
      toast({
        title: "Welcome back.",
        description: "Resuming where you left off.",
      });
    }
    setResumeDialogOpen(false);
  };

  const handleStartFresh = () => {
    autoSave.clear();
    setResumeDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (honeypot) {
      toast({ title: "Request submitted.", description: "Your strategist will be in touch." });
      return;
    }

    // Final validation guard for required DB fields
    const requiredFields: Record<string, string> = {
      contact_name: formData.contact_name,
      contact_email: formData.contact_email,
      company_name: formData.company_name,
      industry: formData.industry,
      company_size: formData.company_size,
    };
    const missing = Object.entries(requiredFields)
      .filter(([_, v]) => !v)
      .map(([k]) => k);

    if (missing.length > 0) {
      toast({ title: "Please complete the required fields.", variant: "destructive" });
      if (!formData.company_name || !formData.industry || !formData.contact_name || !formData.contact_email) {
        setCurrentStep(0);
      } else {
        setCurrentStep(1);
      }
      return;
    }
    try {
      const timeToComplete = Math.floor((Date.now() - startTime) / 1000);

      const { error } = await supabase.from("partner_requests").insert({
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: phoneNumber || null,
        company_name: formData.company_name,
        website: formData.website || null,
        industry: formData.industry,
        company_size: formData.company_size,
        headquarters_location: formData.headquarters_location || null,
        estimated_roles_per_year: formData.estimated_roles_per_year
          ? parseInt(formData.estimated_roles_per_year)
          : null,
        budget_range: formData.budget_range || null,
        timeline: formData.timeline || null,
        description: formData.description || null,
        agreed_no_cure_no_pay: false,
        agreed_privacy: true,
        agreed_nda: false,
        session_id: sessionId,
        steps_completed: 3,
        time_to_complete_seconds: timeToComplete,
        last_step_viewed: "submit",
        source_channel:
          new URLSearchParams(window.location.search).get("source") || "direct",
        utm_source: (formData as any)._saved_utm_source || new URLSearchParams(window.location.search).get("utm_source"),
        utm_medium: (formData as any)._saved_utm_medium || new URLSearchParams(window.location.search).get("utm_medium"),
        utm_campaign: (formData as any)._saved_utm_campaign || new URLSearchParams(window.location.search).get("utm_campaign"),
        status: 'pending',
        assigned_to: '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5',
      });

      if (error) {
        toast({ title: "Something went wrong. Please try again.", description: error.message, variant: "destructive" });
        return;
      }

      if (partialSaveRef.current) {
        supabase
          .from('funnel_partial_submissions')
          .update({ completed: true })
          .eq('session_id', sessionId)
          .then(() => {});
      }

      await analytics.trackFunnelComplete(timeToComplete);

      supabase.functions.invoke('notify-admin-partner-request', {
        body: {
          requestId: crypto.randomUUID(),
          name: formData.contact_name || 'Unknown',
          email: formData.contact_email || '',
          type: 'partner',
        }
      }).catch(err => console.warn('Admin notification failed (non-blocking):', err));

      supabase.functions.invoke('send-partner-request-received', {
        body: {
          email: formData.contact_email,
          contactName: formData.contact_name,
          companyName: formData.company_name || undefined,
        }
      }).catch(err => console.warn('Partner confirmation email failed (non-blocking):', err));

      await experiments.trackAllConversions('submission_complete');
      autoSave.markCompleted();
      setTimeout(() => autoSave.clear(), 1000);

      toast({
        title: "Request submitted.",
        description: "Your strategist will be in touch within 24 hours.",
      });

      navigate(`/partnership-submitted/${encodeURIComponent(formData.company_name || 'unknown')}`, {
        state: {
          contactName: formData.contact_name,
          contactEmail: formData.contact_email,
          contactPhone: phoneNumber || null,
          estimatedRolesPerYear: formData.estimated_roles_per_year
            ? parseInt(formData.estimated_roles_per_year)
            : null,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      // ─────────────────────────────────────────────
      // STEP 0 — Your Details (email-first micro-step)
      // ─────────────────────────────────────────────
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-1">
                {emailCaptured ? "Tell us about your company" : "Begin your search"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {emailCaptured ? "This takes less than a minute." : "We will follow up at this address."}
              </p>
            </div>

            {/* Phase A: Email only (or always visible once captured) */}
            <div>
              <Label className="glass-label">Work email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => {
                  setFormData({ ...formData, contact_email: e.target.value });
                  validation.clearError('contact_email');
                }}
                onBlur={handleEmailBlur}
                placeholder="you@yourcompany.com"
                className={cn("glass-input", validation.hasError('contact_email') && "border-destructive")}
                readOnly={emailCaptured}
                autoFocus={!emailCaptured}
              />
              <FieldError error={validation.getFieldError('contact_email')} />
            </div>

            {/* Phase A button — show only before email is captured */}
            {!emailCaptured && (
              <RainbowButton
                onClick={handleEmailCapture}
                className="w-full min-h-[44px] text-base"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </RainbowButton>
            )}

            {/* Phase B: Remaining fields (slide in after email capture) */}
            {emailCaptured && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="glass-label">Your name</Label>
                    <Input
                      value={formData.contact_name}
                      onChange={(e) => {
                        setFormData({ ...formData, contact_name: e.target.value });
                        validation.clearError('contact_name');
                      }}
                      onBlur={() => validation.validateField('contact_name', formData.contact_name)}
                      className={cn("glass-input", validation.hasError('contact_name') && "border-destructive")}
                      autoFocus
                    />
                    <FieldError error={validation.getFieldError('contact_name')} />
                  </div>

                  <div>
                    <Label className="glass-label">Company</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => {
                        setFormData({ ...formData, company_name: e.target.value });
                        validation.clearError('company_name');
                      }}
                      onBlur={() => validation.validateField('company_name', formData.company_name)}
                      className={cn("glass-input", validation.hasError('company_name') && "border-destructive")}
                    />
                    <FieldError error={validation.getFieldError('company_name')} />
                  </div>
                </div>

                <div>
                  <Label className="glass-label">Industry *</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(v) => setFormData({ ...formData, industry: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your industry" />
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
                  <Label className="glass-label">Website</Label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="yourcompany.com"
                    className="glass-input"
                  />
                </div>
              </div>
            )}

            {/* Honeypot field — invisible to humans, bots fill it */}
            <input
              type="text"
              name="company_url_verify"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] top-[-9999px] w-0 h-0 overflow-hidden opacity-0 pointer-events-none"
            />
          </div>
        );

      // ─────────────────────────────────────────────
      // STEP 1 — Hiring Needs
      // ─────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-1">Tell us what you are looking for</h2>
              <p className="text-sm text-muted-foreground">So we can prepare for our conversation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="glass-label">Company Size *</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(v) => setFormData({ ...formData, company_size: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1–10</SelectItem>
                    <SelectItem value="11-50">11–50</SelectItem>
                    <SelectItem value="51-200">51–200</SelectItem>
                    <SelectItem value="201-500">201–500</SelectItem>
                    <SelectItem value="501-1000">501–1,000</SelectItem>
                    <SelectItem value="1001+">1,001+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="glass-label">Roles per year</Label>
                <Input
                  type="number"
                  value={formData.estimated_roles_per_year}
                  onChange={(e) => setFormData({ ...formData, estimated_roles_per_year: e.target.value })}
                  placeholder="e.g. 5"
                  className="glass-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="glass-label">When do you need to start?</Label>
                <Select
                  value={formData.timeline}
                  onValueChange={(v) => setFormData({ ...formData, timeline: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediately</SelectItem>
                    <SelectItem value="1_month">Within 1 month</SelectItem>
                    <SelectItem value="3_months">Within 3 months</SelectItem>
                    <SelectItem value="6_months">Within 6 months</SelectItem>
                    <SelectItem value="planning">No immediate need</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="glass-label">Recruitment budget (annual)</Label>
                <Select
                  value={formData.budget_range}
                  onValueChange={(v) => setFormData({ ...formData, budget_range: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<50k">&lt; €50k</SelectItem>
                    <SelectItem value="50k-100k">€50k – €100k</SelectItem>
                    <SelectItem value="100k-250k">€100k – €250k</SelectItem>
                    <SelectItem value="250k-500k">€250k – €500k</SelectItem>
                    <SelectItem value="500k+">€500k+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="glass-label">Anything else we should know? <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Specific roles, seniority levels, or challenges..."
                rows={3}
                className="glass-input"
              />
            </div>

            <div>
              <Label className="glass-label">Headquarters location</Label>
              <Input
                value={formData.headquarters_location}
                onChange={(e) => setFormData({ ...formData, headquarters_location: e.target.value })}
                placeholder="e.g. Amsterdam, Dubai, London"
                className="glass-input"
              />
            </div>
          </div>
        );

      // ─────────────────────────────────────────────
      // STEP 2 — Submit
      // ─────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-1">Review and submit</h2>
              <p className="text-sm text-muted-foreground">
                Optional. Helps us reach you faster.
              </p>
            </div>

            <div>
              <Label className="glass-label">Phone Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry={countryCode as "NL" | "US" | "GB" | "DE" | undefined}
                value={phoneNumber}
                onChange={(v) => setPhoneNumber(v || "")}
                placeholder=""
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-2 text-sm">
              <p className="font-medium text-foreground mb-3">Your details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <span>Name</span>
                <span className="text-foreground font-medium truncate">{formData.contact_name}</span>
                <span>Email</span>
                <span className="text-foreground font-medium truncate">{formData.contact_email}</span>
                <span>Company</span>
                <span className="text-foreground font-medium truncate">{formData.company_name}</span>
                <span>Industry</span>
                <span className="text-foreground font-medium capitalize">{formData.industry}</span>
                {formData.timeline && (
                  <>
                    <span>Timeline</span>
                    <span className="text-foreground font-medium capitalize">{formData.timeline.replace('_', ' ')}</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              By submitting, you agree to our{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                Terms of Service
              </a>.
            </p>
          </div>
        );

    }
  };

  if (isResuming) {
    return (
      <Card className="p-5 sm:p-8 glass">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Restoring your progress...</span>
        </div>
      </Card>
    );
  }

  const remainingMinutes = Object.entries(STEP_TIME_ESTIMATES)
    .filter(([step]) => parseInt(step) >= currentStep)
    .reduce((sum, [_, time]) => sum + time, 0);

  return (
    <React.Fragment>
      <TrackRequestDialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen} />

      <ExitIntentPopup
        isOpen={exitIntentOpen}
        onClose={() => setExitIntentOpen(false)}
        onStay={() => setExitIntentOpen(false)}
        currentStep={currentStep}
        totalSteps={3}
      />

      <ResumeFunnelDialog
        open={resumeDialogOpen}
        savedData={autoSave.load()}
        totalSteps={STEPS.length}
        onContinue={handleContinue}
        onStartFresh={handleStartFresh}
      />

      <FunnelErrorBoundary stepName={STEPS[currentStep]}>
        <Card className="p-5 sm:p-8 glass">
          {/* Availability indicator — minimal inline */}
          <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              spotsLeft >= 4 ? 'bg-primary' : spotsLeft >= 2 ? 'bg-primary/70' : 'bg-destructive'
            )} />
            <span>Limited availability this quarter</span>
          </div>

          {/* Progress — hide until email is captured */}
          {emailCaptured && (
            <>
              <MobileProgressIndicator
                currentStep={currentStep}
                totalSteps={3}
                stepLabels={STEPS}
              />
              <DesktopProgressSteps
                currentStep={currentStep}
                totalSteps={3}
                stepLabels={STEPS}
              />
            </>
          )}

          {emailCaptured && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {remainingMinutes > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Clock className="w-3 h-3" />
                      ~{remainingMinutes} min
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep + 1) / 3) * 100}%` }}
                />
              </div>
            </div>
          )}

          <InlineNetworkStatus className="mb-4" />

          <StepTransition stepKey={currentStep} direction={transitionDirection}>
            {renderStep()}
          </StepTransition>

          <TrustBadges />

          {/* Navigation — only show after email captured for step 0 */}
          {(emailCaptured || currentStep > 0) && (
            <div className="flex gap-4 mt-8">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 min-h-[44px] text-base"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              {currentStep < 2 ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  className="flex-1 min-h-[44px] text-base"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  className="flex-1 min-h-[44px] text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit your brief
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </Card>
      </FunnelErrorBoundary>

      <NetworkStatusIndicator />
    </React.Fragment>
  );
}
