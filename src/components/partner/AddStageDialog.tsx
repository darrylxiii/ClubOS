import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Video, FileText, Users, Calendar, Settings, BookTemplate, ChevronRight, MapPin, Link as LinkIcon, ClipboardList, CheckCircle2, AlertCircle, HelpCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

interface Stage {
  name: string;
  order: number;
  owner?: 'company' | 'quantum_club';
  format?: 'online' | 'in_person' | 'hybrid' | 'assessment';
  resources?: string[];
  description?: string;
  duration_minutes?: number;
  interviewers?: string[];
  location?: string;
  meeting_link?: string;
  materials_required?: string[];
  evaluation_criteria?: string;
  save_as_template?: boolean;
  template_name?: string;
}

interface AddStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stage: Stage) => Promise<{ success: boolean }>;
  currentStagesCount: number;
  jobId: string;
  companyId: string;
}

export function AddStageDialog({ open, onOpenChange, onSave, currentStagesCount, jobId, companyId }: AddStageDialogProps) {
  const [currentStep, setCurrentStep] = useState("essentials");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [bookingLinks, setBookingLinks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [stage, setStage] = useState<Stage>({
    name: "",
    order: currentStagesCount,
    owner: 'company',
    format: 'online',
    resources: [],
    description: "",
    duration_minutes: 60,
    interviewers: [],
    location: "",
    meeting_link: "",
    materials_required: [],
    evaluation_criteria: "",
    save_as_template: false,
    template_name: ""
  });

  // Refs for smart navigation
  const stageNameRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const meetingLinkRef = useRef<HTMLInputElement>(null);
  const templateNameRef = useRef<HTMLInputElement>(null);

  // Fetch booking links and team members
  useEffect(() => {
    if (open) {
      fetchBookingLinks();
      fetchTeamMembers();
    }
  }, [open, companyId]);

  const fetchBookingLinks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('booking_links')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setBookingLinks(data || []);
    } catch (error) {
      console.error('Error fetching booking links:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      // Fetch company members
      const { data: companyData, error: companyError } = await supabase
        .from('company_members')
        .select(`
          user_id,
          role,
          profiles!inner (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (companyError) throw companyError;

      // Fetch talent strategists (admin and strategist roles)
      const { data: strategistData, error: strategistError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profiles!inner (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .in('role', ['admin', 'strategist']);

      if (strategistError) throw strategistError;

      const members = [
        ...(companyData || []).map(m => {
          const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          return { ...profile, role: m.role, type: 'company' };
        }),
        ...(strategistData || []).map(s => {
          const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          return { ...profile, role: s.role, type: 'strategist' };
        })
      ];

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const updateStage = (updates: Partial<Stage>) => {
    setStage(prev => ({ ...prev, ...updates }));
  };

  const validateStep = (stepId: string): { valid: boolean; message?: string; field?: string } => {
    switch (stepId) {
      case "essentials":
        if (!stage.name.trim()) {
          return { valid: false, message: "Stage name is required", field: "stage-name" };
        }
        if (!stage.owner) {
          return { valid: false, message: "Stage ownership is required", field: "stage-owner" };
        }
        return { valid: true };
      case "type":
        if (stage.format === "in_person" && !stage.location?.trim()) {
          return { valid: false, message: "Location is required for in-person stages", field: "location" };
        }
        if (stage.format === "online" && !stage.meeting_link?.trim()) {
          return { valid: false, message: "Meeting link is required for online stages", field: "meeting-link" };
        }
        return { valid: true };
      case "template":
        if (stage.save_as_template && !stage.template_name?.trim()) {
          return { valid: false, message: "Template name is required when saving as template", field: "template-name" };
        }
        return { valid: true };
      default:
        return { valid: true };
    }
  };

  const isStepComplete = (stepId: string): boolean => {
    return validateStep(stepId).valid;
  };

  const handleSave = async () => {
    // Validate all required steps
    const essentialsValidation = validateStep("essentials");
    if (!essentialsValidation.valid) {
      toast.error(essentialsValidation.message);
      setCurrentStep("essentials");
      setTimeout(() => {
        const field = document.getElementById(essentialsValidation.field!);
        field?.focus();
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    const typeValidation = validateStep("type");
    if (!typeValidation.valid) {
      toast.error(typeValidation.message);
      setCurrentStep("type");
      setTimeout(() => {
        const field = document.getElementById(typeValidation.field!);
        field?.focus();
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    const templateValidation = validateStep("template");
    if (!templateValidation.valid) {
      toast.error(templateValidation.message);
      setCurrentStep("template");
      setTimeout(() => {
        templateNameRef.current?.focus();
        templateNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    const result = await onSave(stage);
    if (result.success) {
      // Confetti celebration
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899']
      });
      
      toast.success("✨ Pipeline stage added successfully!", {
        description: "Stage configuration saved and audit logged"
      });
      
      onOpenChange(false);
      
      // Reset form
      setStage({
        name: "",
        order: currentStagesCount + 1,
        owner: 'company',
        format: 'online',
        resources: [],
        description: "",
        duration_minutes: 60,
        interviewers: [],
        location: "",
        meeting_link: "",
        materials_required: [],
        evaluation_criteria: "",
        save_as_template: false,
        template_name: ""
      });
      setCurrentStep("essentials");
      setCompletedSteps(new Set());
    }
  };

  const steps = [
    { id: "essentials", label: "Essentials", icon: FileText, required: true },
    { id: "type", label: "Stage Type", icon: Building2, required: true },
    { id: "scheduling", label: "Scheduling", icon: Calendar, required: false },
    { id: "team", label: "Team", icon: Users, required: false },
    { id: "materials", label: "Materials", icon: FileText, required: false },
    { id: "evaluation", label: "Evaluation", icon: Settings, required: false },
    { id: "template", label: "Template", icon: BookTemplate, required: false }
  ];

  const goToNextStep = () => {
    const validation = validateStep(currentStep);
    if (!validation.valid) {
      toast.error(validation.message);
      // Smart navigation to incomplete field
      setTimeout(() => {
        if (validation.field) {
          const field = document.getElementById(validation.field);
          field?.focus();
          field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }
    
    // Mark step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const goToStep = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    // Allow navigation to completed steps or next step
    if (completedSteps.has(stepId) || stepIndex <= currentIndex + 1) {
      setCurrentStep(stepId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Add New Pipeline Stage
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure every detail for a luxury, tailored candidate experience
          </p>
        </DialogHeader>

        <div className="mt-6">
          {/* Step Indicator */}
          <TooltipProvider>
            <div className="mb-8">
              {/* Progress Bar */}
              <div className="relative h-2 bg-muted rounded-full mb-6 overflow-hidden">
                <div 
                  className="absolute h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 rounded-full"
                  style={{ width: `${((steps.findIndex(s => s.id === currentStep) + 1) / steps.length) * 100}%` }}
                />
              </div>
              
              {/* Step Pills */}
              <div className="flex items-center justify-between overflow-x-auto pb-2 gap-2">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const currentIndex = steps.findIndex(s => s.id === currentStep);
                  const isCompleted = currentIndex > index;
                  const isAccessible = index <= currentIndex;
                  const stepComplete = isStepComplete(step.id);
                  
                  return (
                    <div key={step.id} className="flex items-center flex-1 min-w-fit">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => goToStep(step.id)}
                            disabled={!isAccessible && !completedSteps.has(step.id)}
                            className={`flex flex-col items-center gap-2 p-2 md:p-3 rounded-xl transition-all flex-1 min-w-[80px] md:min-w-[100px] ${
                              isActive 
                                ? "bg-primary/10 border-2 border-primary shadow-lg scale-105" 
                                 : isCompleted || completedSteps.has(step.id)
                                  ? "bg-primary/5 border border-primary/30 hover:bg-primary/10 cursor-pointer" 
                                  : "bg-muted/50 border border-muted hover:bg-muted"
                            } ${!isAccessible && !completedSteps.has(step.id) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <div className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                              isActive 
                                ? "border-primary bg-primary text-primary-foreground shadow-lg" 
                                : isCompleted && stepComplete
                                  ? "border-primary bg-primary text-primary-foreground" 
                                  : isCompleted
                                    ? "border-primary bg-primary/20 text-primary"
                                    : "border-muted-foreground/30 bg-background"
                            }`}>
                              {completedSteps.has(step.id) && stepComplete ? (
                                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                              ) : isCompleted && !stepComplete ? (
                                <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
                              ) : (
                                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                              )}
                              {step.required && !isCompleted && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
                              )}
                            </div>
                            <span className={`text-[10px] md:text-xs font-medium whitespace-nowrap text-center ${
                              isActive ? "text-primary" : isCompleted || completedSteps.has(step.id) ? "text-primary" : "text-muted-foreground"
                            }`}>
                              {step.label}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{step.required ? "Required" : "Optional"}</p>
                          {isCompleted && !stepComplete && <p className="text-xs text-destructive">Incomplete</p>}
                        </TooltipContent>
                      </Tooltip>
                      {index < steps.length - 1 && (
                        <ChevronRight className={`w-4 h-4 mx-1 flex-shrink-0 ${
                          isCompleted ? "text-primary" : "text-muted-foreground"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === "essentials" && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Basic Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="stage-name" className="flex items-center gap-2">
                        Stage Name <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Choose a clear, descriptive name visible to candidates</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        ref={stageNameRef}
                        id="stage-name"
                        value={stage.name}
                        onChange={(e) => updateStage({ name: e.target.value })}
                        placeholder="e.g., Technical Interview, Culture Fit"
                        className="h-12"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stage-description">Stage Description</Label>
                      <Textarea
                        id="stage-description"
                        value={stage.description}
                        onChange={(e) => updateStage({ description: e.target.value })}
                        placeholder="Internal notes for the team..."
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground">For internal use only, not visible to candidates</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-br from-secondary/5 to-primary/5 border border-secondary/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-secondary" />
                    Stage Ownership
                  </h3>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2" htmlFor="stage-owner">
                      Who manages this stage? <span className="text-destructive">*</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Quantum Club Elite offers premium vetting and white-glove candidate management</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select value={stage.owner} onValueChange={(value: 'company' | 'quantum_club') => updateStage({ owner: value })} required>
                      <SelectTrigger id="stage-owner" className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Your Company
                          </div>
                        </SelectItem>
                        <SelectItem value="quantum_club">
                          <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2">
                              <span className="text-primary">✦</span> Quantum Club Elite
                            </div>
                            <span className="text-xs text-muted-foreground">Premium vetting & candidate management</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "type" && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                  <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Select Stage Format *
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Choose how this stage will be conducted</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {[
                      { value: 'online', icon: Video, label: 'Online/Virtual', desc: 'Video or phone meetings' },
                      { value: 'in_person', icon: Building2, label: 'In-Person', desc: 'Face-to-face meetings' },
                      { value: 'hybrid', icon: Users, label: 'Hybrid', desc: 'Flexible format' },
                      { value: 'assessment', icon: ClipboardList, label: 'Assessment', desc: 'Tests & challenges' }
                    ].map(({ value, icon: Icon, label, desc }) => (
                      <button
                        key={value}
                        onClick={() => updateStage({ format: value as any })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          stage.format === value
                            ? 'border-primary bg-primary/10 shadow-lg'
                            : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        <Icon className={`w-8 h-8 mb-2 ${stage.format === value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="font-semibold">{label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Sections Based on Format */}
                {stage.format === "in_person" && (
                  <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-blue-500/5 to-primary/5 border border-blue-500/20 animate-fade-in">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      Location Details
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="location">Office Address or Venue <span className="text-destructive">*</span></Label>
                        <Input
                          ref={locationRef}
                          id="location"
                          placeholder="123 Business St, City, Country"
                          value={stage.location || ""}
                          onChange={(e) => updateStage({ location: e.target.value })}
                          className="h-12"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location-details">Additional Details</Label>
                        <Textarea
                          id="location-details"
                          placeholder="Building/Room number, Reception instructions, Parking information, Accessibility notes..."
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {stage.format === "online" && (
                  <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-green-500/5 to-primary/5 border border-green-500/20 animate-fade-in">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <Video className="w-5 h-5 text-green-500" />
                      Online Meeting Details
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="meeting-type">Meeting Type</Label>
                        <Select defaultValue="video">
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">Video Call</SelectItem>
                            <SelectItem value="phone">Phone Call</SelectItem>
                            <SelectItem value="chat">Chat/Messaging</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meeting-link">Meeting Link <span className="text-destructive">*</span></Label>
                        {bookingLinks.length > 0 ? (
                          <Select value={stage.meeting_link || ""} onValueChange={(value) => updateStage({ meeting_link: value })}>
                            <SelectTrigger id="meeting-link" className="h-12">
                              <SelectValue placeholder="Select existing link or create new" />
                            </SelectTrigger>
                            <SelectContent>
                              {bookingLinks.map((link) => (
                                <SelectItem key={link.id} value={link.slug}>
                                  {link.title} ({link.duration_minutes}min)
                                </SelectItem>
                              ))}
                              <SelectItem value="__create_new__">
                                <div className="flex items-center gap-2">
                                  <Plus className="w-4 h-4" />
                                  Create New Meeting Link
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              ref={meetingLinkRef}
                              id="meeting-link"
                              placeholder="https://zoom.us/j/... or https://teams.microsoft.com/..."
                              value={stage.meeting_link || ""}
                              onChange={(e) => updateStage({ meeting_link: e.target.value })}
                              className="h-12 pl-10"
                              required
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prep-instructions">Preparation Instructions</Label>
                        <Textarea
                          id="prep-instructions"
                          placeholder="What should candidates prepare? Any technical requirements? Dress code?"
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {stage.format === "assessment" && (
                  <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-purple-500/5 to-primary/5 border border-purple-500/20 animate-fade-in">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-purple-500" />
                      Assessment Configuration
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="assessment-type">Assessment Type</Label>
                        <Select>
                          <SelectTrigger id="assessment-type" className="h-12">
                            <SelectValue placeholder="Select assessment type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="coding">Coding Challenge</SelectItem>
                            <SelectItem value="technical">Technical Test</SelectItem>
                            <SelectItem value="personality">Personality Assessment</SelectItem>
                            <SelectItem value="case">Case Study</SelectItem>
                            <SelectItem value="portfolio">Portfolio Review</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platform">Platform</Label>
                        <Input
                          id="platform"
                          placeholder="e.g., HackerRank, LeetCode, Custom"
                          className="h-12"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="time-limit">Time Limit (minutes)</Label>
                          <Input
                            id="time-limit"
                            type="number"
                            placeholder="60"
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="difficulty">Difficulty</Label>
                          <Select>
                            <SelectTrigger id="difficulty" className="h-12">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {stage.format === "hybrid" && (
                  <div className="p-6 rounded-xl bg-gradient-to-br from-amber-500/5 to-primary/5 border border-amber-500/20 animate-fade-in">
                    <h4 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-amber-500" />
                      Hybrid Format Options
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Candidates can choose between online or in-person. Configure both options above or provide flexible instructions.
                    </p>
                    <Textarea
                      placeholder="Explain hybrid options to candidates..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {currentStep === "scheduling" && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Time & Duration
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={stage.duration_minutes}
                        onChange={(e) => updateStage({ duration_minutes: parseInt(e.target.value) })}
                        placeholder="60"
                        className="h-12"
                      />
                      <p className="text-xs text-muted-foreground">Typical duration for this stage</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-6 rounded-xl bg-muted/30 border">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Scheduling Preferences
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox id="self-schedule" />
                      <label htmlFor="self-schedule" className="text-sm cursor-pointer flex-1">
                        Allow candidate self-scheduling
                      </label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox id="approval" />
                      <label htmlFor="approval" className="text-sm cursor-pointer flex-1">
                        Require approval before scheduling
                      </label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox id="buffer" />
                      <label htmlFor="buffer" className="text-sm cursor-pointer flex-1">
                        Add buffer time between interviews
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "team" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Assign Interviewers/Evaluators
                  </h4>
                  <p className="text-sm text-muted-foreground">Select from your company team and Quantum Club strategists</p>
                  <Select>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select team members..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {teamMembers.length > 0 ? (
                        teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <span>{member.full_name || member.email}</span>
                              <Badge variant={member.type === 'strategist' ? 'default' : 'secondary'} className="text-xs">
                                {member.type === 'strategist' ? '✦ Strategist' : member.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-members" disabled>
                          No team members available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2 mt-4 p-4 rounded-lg bg-muted/30 border border-dashed">
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {stage.interviewers?.length ? `${stage.interviewers.length} assigned` : 'No interviewers assigned yet'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-6 rounded-xl bg-muted/30 border">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Notification Settings
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox id="notify-team" defaultChecked />
                      <label htmlFor="notify-team" className="text-sm cursor-pointer flex-1">
                        Notify team when candidate enters stage
                      </label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox id="notify-candidate" defaultChecked />
                      <label htmlFor="notify-candidate" className="text-sm cursor-pointer flex-1">
                        Send automated email to candidate
                      </label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox id="reminders" defaultChecked />
                      <label htmlFor="reminders" className="text-sm cursor-pointer flex-1">
                        Send reminders
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "materials" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Materials Required from Candidates
                  </h4>
                  <Textarea 
                    placeholder="List materials candidates should prepare (portfolio, references, certificates, etc.)" 
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">This will be shown to candidates when they enter this stage</p>
                </div>

                <div className="space-y-4 p-6 rounded-xl bg-muted/30 border">
                  <h4 className="font-semibold flex items-center gap-2">
                    <LinkIcon className="w-5 h-5" />
                    Resources to Share
                  </h4>
                  <p className="text-sm text-muted-foreground">Attach files, links, or guides for candidates</p>
                  <Button variant="outline" className="w-full h-12 border-dashed hover:border-primary hover:bg-primary/5">
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Files or Add Links
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "evaluation" && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Evaluation Criteria
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="criteria">Define Scoring & Feedback Requirements</Label>
                    <Textarea
                      id="criteria"
                      value={stage.evaluation_criteria}
                      onChange={(e) => updateStage({ evaluation_criteria: e.target.value })}
                      placeholder="Define scoring criteria, rubric, or required feedback fields..."
                      rows={5}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      This helps evaluators provide consistent, structured feedback
                    </p>
                  </div>
                </div>

                <div className="space-y-4 p-6 rounded-xl bg-muted/30 border">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Advanced Options
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Stage Weight (for analytics)</Label>
                      <div className="flex items-center gap-4">
                        <Input 
                          id="weight"
                          type="range" 
                          min="0" 
                          max="100" 
                          defaultValue="50" 
                          className="flex-1"
                        />
                        <span className="text-sm font-mono w-12 text-center">50%</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox id="auto-advance" />
                      <label htmlFor="auto-advance" className="text-sm cursor-pointer flex-1">
                        Auto-advance on passing score
                      </label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox id="gdpr" defaultChecked />
                      <label htmlFor="gdpr" className="text-sm cursor-pointer flex-1">
                        Include GDPR consent form
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "template" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="save-template" 
                      checked={stage.save_as_template}
                      onCheckedChange={(checked) => updateStage({ save_as_template: checked as boolean })}
                    />
                    <label htmlFor="save-template" className="text-sm font-medium">
                      Save this stage as a reusable template
                    </label>
                  </div>

                  {stage.save_as_template && (
                    <div className="space-y-4 mt-4 pl-6 animate-fade-in">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">
                          Template Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          ref={templateNameRef}
                          id="template-name"
                          value={stage.template_name}
                          onChange={(e) => updateStage({ template_name: e.target.value })}
                          placeholder="e.g., Standard Technical Interview"
                          required={stage.save_as_template}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="behavioral">Behavioral</SelectItem>
                            <SelectItem value="assessment">Assessment</SelectItem>
                            <SelectItem value="culture">Culture Fit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BookTemplate className="w-5 h-5" />
                    Browse Template Library
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Quick-start with pre-configured stage templates
                  </p>
                  <Button variant="outline" className="w-full">
                    View Template Library
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t mt-8 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Button
            variant="outline"
            onClick={() => {
              const currentIndex = steps.findIndex(s => s.id === currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1].id);
              }
            }}
            disabled={currentStep === "essentials"}
            size="lg"
            className="w-full sm:w-auto"
          >
            Previous
          </Button>

          <div className="flex gap-2 w-full sm:w-auto">
            {currentStep !== "template" ? (
              <Button
                onClick={goToNextStep}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 flex-1 sm:flex-initial"
                size="lg"
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 flex-1 sm:flex-initial"
                size="lg"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Add Stage
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
