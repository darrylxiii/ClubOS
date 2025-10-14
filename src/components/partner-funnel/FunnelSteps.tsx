import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, ArrowLeft, CheckCircle, Calendar, Users, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TrackRequestDialog } from "./TrackRequestDialog";

const STEPS = ["contact", "company", "partnership", "compliance"];

export function FunnelSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [startTime] = useState(Date.now());
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    // Contact
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    linkedin_url: "",
    // Company
    company_name: "",
    website: "",
    industry: "",
    company_size: "",
    headquarters_location: "",
    // Partnership
    partnership_type: "",
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
    if (!validateStep()) return;
    
    await trackStep("complete");
    setCurrentStep(currentStep + 1);
  };

  const handleBack = async () => {
    await trackStep("abandon");
    setCurrentStep(currentStep - 1);
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0: // Contact
        if (!formData.contact_name || !formData.contact_email) {
          toast({ title: "Please fill in all required fields", variant: "destructive" });
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
        if (!formData.partnership_type || !formData.description) {
          toast({ title: "Please fill in all required fields", variant: "destructive" });
          return false;
        }
        break;
      case 3: // Compliance
        if (!formData.agreed_no_cure_no_pay || !formData.agreed_privacy) {
          toast({ title: "Please accept the required terms", variant: "destructive" });
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    const timeToComplete = Math.floor((Date.now() - startTime) / 1000);

    const { error } = await supabase.from("partner_requests").insert({
      ...formData,
      estimated_roles_per_year: formData.estimated_roles_per_year ? parseInt(formData.estimated_roles_per_year) : null,
      session_id: sessionId,
      steps_completed: 4,
      time_to_complete_seconds: timeToComplete,
      last_step_viewed: "compliance",
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
      title: "Request submitted successfully!",
      description: "We'll be in touch within 48 hours.",
    });

    // Show success view
    setCurrentStep(4);
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
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+31 6 12345678"
              />
            </div>
            <div>
              <Label>LinkedIn Profile</Label>
              <Input
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                placeholder="linkedin.com/in/johndoe"
              />
            </div>
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
              <Label>Partnership Type *</Label>
              <Select value={formData.partnership_type} onValueChange={(value) => setFormData({ ...formData, partnership_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive_search">Executive Search</SelectItem>
                  <SelectItem value="bulk_hiring">Bulk Hiring</SelectItem>
                  <SelectItem value="retained">Retained Partnership</SelectItem>
                  <SelectItem value="project_based">Project-Based</SelectItem>
                  <SelectItem value="ongoing">Ongoing Collaboration</SelectItem>
                </SelectContent>
              </Select>
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
          </div>
        );

      case 4:
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-20 h-20 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Request Submitted Successfully!</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Thank you for your interest in partnering with The Quantum Club. 
              Our team will review your request and respond within 48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/booking")}>
                Book a Call
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/companies")}>
                View Portfolio
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setTrackDialogOpen(true)}>
                Track My Request
              </Button>
            </div>
            <TrackRequestDialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen} />
          </div>
        );
    }
  };

  if (currentStep === 4) {
    return <Card className="p-8 glass-effect">{renderStep()}</Card>;
  }

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`flex-1 ${index < STEPS.length - 1 ? "mr-2" : ""}`}
            >
              <div
                className={`h-2 rounded-full transition-all ${
                  index <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Contact</span>
          <span>Company</span>
          <span>Partnership</span>
          <span>Compliance</span>
        </div>
      </div>

      {/* Form */}
      <Card className="p-8 glass-effect mb-6">
        {renderStep()}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {currentStep < 3 ? (
          <Button size="lg" onClick={handleNext}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button size="lg" onClick={handleSubmit}>
            Submit Request
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
