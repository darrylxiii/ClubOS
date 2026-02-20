import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { migrateToast as toast } from "@/lib/notify";
import { ArrowRight, ArrowLeft, CheckCircle, Calendar, Users, Target, Loader2, Clock, Keyboard, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { ProgressSaver } from "./ProgressSaver";
import { useActiveFunnelExperiments } from "@/hooks/useFunnelABTest";
import { KeyboardHintToast } from "./KeyboardShortcuts";
import { usePrefetch } from "./LazyFunnelComponents";
import { NetworkStatusIndicator, InlineNetworkStatus } from "./NetworkStatusIndicator";
import { StepTransition } from "./StepTransition";
import { cn } from "@/lib/utils";

// 3 clean, benefit-oriented step labels — no "compliance" or "verification"
const STEPS = ["Your Details", "Hiring Needs", "Submit"];

const STEP_TIME_ESTIMATES: Record<number, number> = {
  0: 1, // Details – 1 min
  1: 1, // Needs – 1 min
  2: 0, // Submit – instant
};

export function FunnelSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [startTime] = useState(Date.now());
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(true);
  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [spotsLeft, setSpotsLeft] = useState(2);

  const navigate = useNavigate();

  usePrefetch(currentStep);
  const validation = useFormValidation();
  const analytics = useFunnelAnalytics(sessionId);
  const experiments = useActiveFunnelExperiments(sessionId);

  // Exit intent – only on middle steps
  const handleExitIntent = useCallback(() => {
    if (currentStep > 0 && currentStep < 2) {
      setExitIntentOpen(true);
    }
  }, [currentStep]);

  useExitIntent(currentStep > 0 && currentStep < 2, handleExitIntent);

  const autoSave = useFunnelAutoSave({
    storageKey: 'partner_funnel_save',
    debounceMs: 300,
    expiryHours: 24,
  });

  const { countryCode } = useCountryDetection();

  const [formData, setFormData] = useState({
    // Step 0 — Your Details (contact + company merged)
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

  // Load saved data and spots count
  useEffect(() => {
    const savedData = autoSave.load();
    if (savedData && !savedData.completed) {
      setResumeDialogOpen(true);
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

  // Auto-save
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
        handleNext();
      }
      if (e.key === 'Escape' && currentStep > 0 && currentStep < 3) {
        e.preventDefault();
        handleBack();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, formData, phoneNumber]);

  // Track step views
  useEffect(() => {
    analytics.trackStepView(currentStep, STEPS[currentStep]);
  }, [currentStep, analytics]);

  const validateStep = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (currentStep) {
      case 0: // Your Details
        if (!formData.contact_name || !formData.contact_email || !formData.company_name || !formData.industry) {
          toast({ title: "Please fill in all required fields", variant: "destructive" });
          return false;
        }
        if (!emailRegex.test(formData.contact_email)) {
          toast({ title: "Please enter a valid email address", variant: "destructive" });
          return false;
        }
        break;
      case 1: // Hiring Needs
        if (!formData.company_size) {
          toast({ title: "Please select your company size", variant: "destructive" });
          return false;
        }
        break;
      // Step 2 — no blocking validation; phone + privacy are optional/inline
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
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
      toast({
        title: "Welcome back.",
        description: `Resuming at step ${savedData.currentStep + 1} of ${STEPS.length}`,
      });
    }
    setResumeDialogOpen(false);
  };

  const handleStartFresh = () => {
    autoSave.clear();
    setResumeDialogOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const timeToComplete = Math.floor((Date.now() - startTime) / 1000);

      const { error } = await supabase.from("partner_requests").insert({
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: phoneNumber || null,
        company_name: formData.company_name,
        website: formData.website || null,
        industry: formData.industry,
        company_size: formData.company_size || null,
        headquarters_location: formData.headquarters_location || null,
        estimated_roles_per_year: formData.estimated_roles_per_year
          ? parseInt(formData.estimated_roles_per_year)
          : null,
        budget_range: formData.budget_range || null,
        timeline: formData.timeline || null,
        description: formData.description || null,
        // Keep columns but send harmless defaults
        agreed_no_cure_no_pay: false,
        agreed_privacy: true,
        agreed_nda: false,
        session_id: sessionId,
        steps_completed: 3,
        time_to_complete_seconds: timeToComplete,
        last_step_viewed: "submit",
        source_channel:
          new URLSearchParams(window.location.search).get("source") || "direct",
        utm_source: new URLSearchParams(window.location.search).get("utm_source"),
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
        status: 'pending',
        assigned_to: '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5',
      });

      if (error) {
        toast({ title: "Submission failed", description: error.message, variant: "destructive" });
        return;
      }

      await analytics.trackFunnelComplete(timeToComplete);

      // Non-blocking admin notification
      supabase.functions.invoke('notify-admin-partner-request', {
        body: {
          requestId: crypto.randomUUID(),
          name: formData.contact_name || 'Unknown',
          email: formData.contact_email || '',
          type: 'partner',
        }
      }).catch(err => console.warn('Admin notification failed (non-blocking):', err));

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
      // STEP 0 — Your Details (contact + company)
      // ─────────────────────────────────────────────
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Users className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-1">Tell us about yourself</h2>
              <p className="text-sm text-muted-foreground">Takes about 60 seconds</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => {
                    setFormData({ ...formData, contact_name: e.target.value });
                    validation.clearError('contact_name');
                  }}
                  onBlur={() => validation.validateField('contact_name', formData.contact_name)}
                  placeholder="Jane Smith"
                  className={cn(validation.hasError('contact_name') && "border-destructive")}
                />
                <FieldError error={validation.getFieldError('contact_name')} />
              </div>

              <div>
                <Label>Work Email *</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => {
                    setFormData({ ...formData, contact_email: e.target.value });
                    validation.clearError('contact_email');
                  }}
                  onBlur={() => validation.validateField('contact_email', formData.contact_email)}
                  placeholder="jane@company.com"
                  className={cn(validation.hasError('contact_email') && "border-destructive")}
                />
                <FieldError error={validation.getFieldError('contact_email')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => {
                    setFormData({ ...formData, company_name: e.target.value });
                    validation.clearError('company_name');
                  }}
                  onBlur={() => validation.validateField('company_name', formData.company_name)}
                  placeholder="Acme Corp"
                  className={cn(validation.hasError('company_name') && "border-destructive")}
                />
                <FieldError error={validation.getFieldError('company_name')} />
              </div>

              <div>
                <Label>Industry *</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(v) => setFormData({ ...formData, industry: v })}
                >
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
            </div>
          </div>
        );

      // ─────────────────────────────────────────────
      // STEP 1 — Hiring Needs
      // ─────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Target className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-1">Your hiring needs</h2>
              <p className="text-sm text-muted-foreground">Help us prepare for our first call</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Company Size *</Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(v) => setFormData({ ...formData, company_size: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Number of employees" />
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
                <Label>Estimated Roles / Year</Label>
                <Input
                  type="number"
                  value={formData.estimated_roles_per_year}
                  onChange={(e) => setFormData({ ...formData, estimated_roles_per_year: e.target.value })}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>When do you need to start?</Label>
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
                    <SelectItem value="planning">Just exploring</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Approximate Annual Budget</Label>
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
              <Label>Anything else we should know? <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional — share anything that would help us prepare for our call. Roles you're hiring for, seniority levels, or challenges you're facing."
                rows={3}
              />
            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={formData.headquarters_location}
                onChange={(e) => setFormData({ ...formData, headquarters_location: e.target.value })}
                placeholder="e.g. Amsterdam, Dubai, London"
              />
            </div>
          </div>
        );

      // ─────────────────────────────────────────────
      // STEP 2 — Submit (no OTP, no contracts)
      // ─────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <CheckCircle className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-1">Almost done</h2>
              <p className="text-sm text-muted-foreground">
                Add your phone number so we can reach you — or skip and we'll use email.
              </p>
            </div>

            <div>
              <Label>Phone Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <PhoneInput
                international
                countryCallingCodeEditable={false}
                defaultCountry={countryCode as "NL" | "US" | "GB" | "DE" | undefined}
                value={phoneNumber}
                onChange={(v) => setPhoneNumber(v || "")}
                placeholder="Add phone for faster response"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Summary of what they submitted */}
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
              No contracts, no upfront fees.
            </p>
          </div>
        );

      // ─────────────────────────────────────────────
      // SUCCESS
      // ─────────────────────────────────────────────
      case 3:
        return (
          <SuccessConfetti
            companyName={formData.company_name || "Partner"}
            sessionId={sessionId}
            onTrackRequest={() => setTrackDialogOpen(true)}
          />
        );
    }
  };

  if (currentStep === 3) {
    return <Card className="p-8 glass-effect">{renderStep()}</Card>;
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

      {showKeyboardHints && currentStep === 0 && (
        <KeyboardHintToast onDismiss={() => setShowKeyboardHints(false)} />
      )}

      <FunnelErrorBoundary stepName={STEPS[currentStep]}>
        <Card className="p-8 glass-effect">
          {/* Availability indicator */}
          {(() => {
            const indicatorColor =
              spotsLeft >= 4 ? 'bg-primary' : spotsLeft >= 2 ? 'bg-primary/70' : 'bg-destructive';
            const textColor =
              spotsLeft >= 4 ? 'text-primary' : spotsLeft >= 2 ? 'text-primary' : 'text-destructive';
            return (
              <div className="flex items-center justify-center gap-3 p-3 glass-effect border border-primary/20 rounded-2xl mb-6">
                <div className="relative">
                  <div className={`w-2.5 h-2.5 ${indicatorColor} rounded-full animate-pulse`} />
                  <div className={`absolute inset-0 w-2.5 h-2.5 ${indicatorColor} rounded-full animate-ping`} />
                </div>
                <span className="text-sm font-medium">
                  <span className={textColor}>{spotsLeft}/5</span> partner spots available this quarter
                </span>
              </div>
            );
          })()}

          {/* Progress */}
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
              {showKeyboardHints && currentStep < 2 && (
                <div className="hidden md:flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs gap-1 px-2 py-0.5">
                    <Keyboard className="w-3 h-3" />
                    <span>Enter</span> = Next
                  </Badge>
                  {currentStep > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1 px-2 py-0.5">
                      <Keyboard className="w-3 h-3" />
                      <span>Esc</span> = Back
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          <InlineNetworkStatus className="mb-4" />

          <StepTransition stepKey={currentStep} direction={transitionDirection}>
            {renderStep()}
          </StepTransition>

          <TrustBadges />

          {currentStep > 0 && currentStep < 3 && (
            <div className="mt-4 flex justify-center">
              <ProgressSaver
                sessionId={sessionId}
                currentStep={currentStep}
                formData={formData}
                email={formData.contact_email}
              />
            </div>
          )}

          {/* Navigation */}
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
                onClick={handleNext}
                className="flex-1 min-h-[44px] text-base"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
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
                    Send My Request
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </FunnelErrorBoundary>

      <NetworkStatusIndicator />
    </React.Fragment>
  );
}
