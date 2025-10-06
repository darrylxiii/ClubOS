import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Video, FileText, Users, Calendar, Settings, BookTemplate, ChevronRight, MapPin, Link as LinkIcon, ClipboardList, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

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
}

export function AddStageDialog({ open, onOpenChange, onSave, currentStagesCount }: AddStageDialogProps) {
  const [currentStep, setCurrentStep] = useState("essentials");
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

  const updateStage = (updates: Partial<Stage>) => {
    setStage(prev => ({ ...prev, ...updates }));
  };

  const validateStep = (stepId: string): { valid: boolean; message?: string } => {
    switch (stepId) {
      case "essentials":
        if (!stage.name.trim()) {
          return { valid: false, message: "Stage name is required" };
        }
        return { valid: true };
      case "type":
        if (stage.format === "in_person" && !stage.location?.trim()) {
          return { valid: false, message: "Location is required for in-person stages" };
        }
        if (stage.format === "online" && !stage.meeting_link?.trim()) {
          return { valid: false, message: "Meeting link is required for online stages" };
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
    if (!stage.name.trim()) {
      toast.error("Stage name is required");
      return;
    }

    const result = await onSave(stage);
    if (result.success) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success("Stage added successfully!");
      onOpenChange(false);
      // Reset form
      setStage({
        name: "",
        order: currentStagesCount + 1,
        owner: 'company',
        format: 'online',
        resources: [],
        description: ""
      });
      setCurrentStep("essentials");
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
      return;
    }
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
                            onClick={() => isAccessible && setCurrentStep(step.id)}
                            disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all flex-1 min-w-[100px] ${
                              isActive 
                                ? "bg-primary/10 border-2 border-primary shadow-lg scale-105" 
                                : isCompleted 
                                  ? "bg-primary/5 border border-primary/30 hover:bg-primary/10" 
                                  : "bg-muted/50 border border-muted hover:bg-muted"
                            } ${!isAccessible ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                              isActive 
                                ? "border-primary bg-primary text-primary-foreground shadow-lg" 
                                : isCompleted && stepComplete
                                  ? "border-primary bg-primary text-primary-foreground" 
                                  : isCompleted
                                    ? "border-primary bg-primary/20 text-primary"
                                    : "border-muted-foreground/30 bg-background"
                            }`}>
                              {isCompleted && stepComplete ? (
                                <CheckCircle2 className="w-6 h-6" />
                              ) : isCompleted && !stepComplete ? (
                                <AlertCircle className="w-6 h-6" />
                              ) : (
                                <Icon className="w-6 h-6" />
                              )}
                              {step.required && !isCompleted && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
                              )}
                            </div>
                            <span className={`text-xs font-medium whitespace-nowrap text-center ${
                              isActive ? "text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"
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
                        Stage Name *
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
                        id="stage-name"
                        value={stage.name}
                        onChange={(e) => updateStage({ name: e.target.value })}
                        placeholder="e.g., Technical Interview, Culture Fit"
                        className="h-12"
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
                    <Label className="flex items-center gap-2">
                      Who manages this stage?
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Quantum Club Elite offers premium vetting and white-glove candidate management</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select value={stage.owner} onValueChange={(value: 'company' | 'quantum_club') => updateStage({ owner: value })}>
                      <SelectTrigger className="h-12">
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
                        <Label htmlFor="location">Office Address or Venue *</Label>
                        <Input
                          id="location"
                          placeholder="123 Business St, City, Country"
                          value={stage.location || ""}
                          onChange={(e) => updateStage({ location: e.target.value })}
                          className="h-12"
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
                        <Label htmlFor="meeting-link">Meeting Link *</Label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="meeting-link"
                            placeholder="https://zoom.us/j/... or https://teams.microsoft.com/..."
                            value={stage.meeting_link || ""}
                            onChange={(e) => updateStage({ meeting_link: e.target.value })}
                            className="h-12 pl-10"
                          />
                        </div>
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
                  <p className="text-sm text-muted-foreground">Select team members for this stage</p>
                  <Input placeholder="Search team members..." className="h-12" />
                  <div className="space-y-2 mt-4 p-4 rounded-lg bg-muted/30 border border-dashed">
                    <p className="text-sm text-muted-foreground text-center py-4">No interviewers assigned yet</p>
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
                    <div className="space-y-4 mt-4 pl-6">
                      <div className="space-y-2">
                        <Label>Template Name</Label>
                        <Input
                          value={stage.template_name}
                          onChange={(e) => updateStage({ template_name: e.target.value })}
                          placeholder="e.g., Standard Technical Interview"
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
        <div className="flex items-center justify-between pt-6 border-t mt-8 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep !== "template" ? (
              <Button
                onClick={goToNextStep}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                size="lg"
              >
                Next Step
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave} 
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
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
