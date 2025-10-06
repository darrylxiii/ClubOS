import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Video, FileText, Users, Calendar, Settings, BookTemplate, ChevronRight } from "lucide-react";
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
    { id: "essentials", label: "Essentials", icon: FileText },
    { id: "type", label: "Stage Type", icon: Building2 },
    { id: "scheduling", label: "Scheduling", icon: Calendar },
    { id: "team", label: "Team", icon: Users },
    { id: "materials", label: "Materials", icon: FileText },
    { id: "evaluation", label: "Evaluation", icon: Settings },
    { id: "template", label: "Template", icon: BookTemplate }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                      isActive ? "bg-primary/10 text-primary" : isCompleted ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive ? "border-primary bg-primary text-primary-foreground" : 
                      isCompleted ? "border-primary bg-primary/20" : "border-muted"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === "essentials" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="stage-name">Stage Name *</Label>
                  <Input
                    id="stage-name"
                    value={stage.name}
                    onChange={(e) => updateStage({ name: e.target.value })}
                    placeholder="e.g., Technical Interview, Culture Fit"
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
                  />
                </div>

                <div className="space-y-2">
                  <Label>Stage Owner</Label>
                  <Select value={stage.owner} onValueChange={(value: 'company' | 'quantum_club') => updateStage({ owner: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Your Company</SelectItem>
                      <SelectItem value="quantum_club">
                        Quantum Club Elite 
                        <span className="text-xs text-muted-foreground ml-2">(Premium vetting)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === "type" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label>Stage Format</Label>
                  <Select value={stage.format} onValueChange={(value: any) => updateStage({ format: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Online/Virtual
                        </div>
                      </SelectItem>
                      <SelectItem value="in_person">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Physical/In-Person
                        </div>
                      </SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {stage.format === "in_person" && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                    <h4 className="font-semibold">Location Details</h4>
                    <Input
                      placeholder="Office address or venue"
                      value={stage.location || ""}
                      onChange={(e) => updateStage({ location: e.target.value })}
                    />
                    <Textarea
                      placeholder="Building/Room, Reception instructions, Parking info..."
                      rows={3}
                    />
                  </div>
                )}

                {stage.format === "online" && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                    <h4 className="font-semibold">Meeting Details</h4>
                    <Input
                      placeholder="Meeting link (Zoom, Teams, etc.)"
                      value={stage.meeting_link || ""}
                      onChange={(e) => updateStage({ meeting_link: e.target.value })}
                    />
                    <Textarea
                      placeholder="Preparation instructions for candidates..."
                      rows={3}
                    />
                  </div>
                )}

                {stage.format === "assessment" && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                    <h4 className="font-semibold">Assessment Configuration</h4>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Assessment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coding">Coding Challenge</SelectItem>
                        <SelectItem value="technical">Technical Test</SelectItem>
                        <SelectItem value="personality">Personality Assessment</SelectItem>
                        <SelectItem value="case">Case Study</SelectItem>
                        <SelectItem value="portfolio">Portfolio Review</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Platform (e.g., HackerRank, Custom)" />
                  </div>
                )}
              </div>
            )}

            {currentStep === "scheduling" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={stage.duration_minutes}
                    onChange={(e) => updateStage({ duration_minutes: parseInt(e.target.value) })}
                    placeholder="60"
                  />
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold">Scheduling Preferences</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="self-schedule" />
                      <label htmlFor="self-schedule" className="text-sm">Allow candidate self-scheduling</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="approval" />
                      <label htmlFor="approval" className="text-sm">Require approval before scheduling</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="buffer" />
                      <label htmlFor="buffer" className="text-sm">Add buffer time between interviews</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "team" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold">Assign Interviewers/Evaluators</h4>
                  <p className="text-sm text-muted-foreground">Select team members for this stage</p>
                  <Input placeholder="Search team members..." />
                  <div className="space-y-2 mt-4">
                    <p className="text-sm text-muted-foreground">No interviewers assigned yet</p>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold">Notification Settings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="notify-team" defaultChecked />
                      <label htmlFor="notify-team" className="text-sm">Notify team when candidate enters stage</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="notify-candidate" defaultChecked />
                      <label htmlFor="notify-candidate" className="text-sm">Send automated email to candidate</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="reminders" defaultChecked />
                      <label htmlFor="reminders" className="text-sm">Send reminders</label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === "materials" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold">Materials Required from Candidates</h4>
                  <Textarea placeholder="List materials candidates should prepare (portfolio, references, certificates, etc.)" rows={4} />
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold">Resources to Share</h4>
                  <p className="text-sm text-muted-foreground">Attach files, links, or guides for candidates</p>
                  <Button variant="outline" className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Files or Add Links
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "evaluation" && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <Label>Evaluation Criteria</Label>
                  <Textarea
                    value={stage.evaluation_criteria}
                    onChange={(e) => updateStage({ evaluation_criteria: e.target.value })}
                    placeholder="Define scoring criteria, rubric, or required feedback fields..."
                    rows={4}
                  />
                </div>

                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold">Advanced Options</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Stage Weight (for analytics)</Label>
                      <Input type="range" min="0" max="100" defaultValue="50" className="w-full" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="auto-advance" />
                      <label htmlFor="auto-advance" className="text-sm">Auto-advance on passing score</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="gdpr" defaultChecked />
                      <label htmlFor="gdpr" className="text-sm">Include GDPR consent form</label>
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
        <div className="flex items-center justify-between pt-6 border-t mt-6">
          <Button
            variant="outline"
            onClick={() => {
              const currentIndex = steps.findIndex(s => s.id === currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1].id);
              }
            }}
            disabled={currentStep === "essentials"}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep !== "template" ? (
              <Button
                onClick={() => {
                  const currentIndex = steps.findIndex(s => s.id === currentStep);
                  if (currentIndex < steps.length - 1) {
                    setCurrentStep(steps[currentIndex + 1].id);
                  }
                }}
              >
                Next Step
              </Button>
            ) : (
              <Button onClick={handleSave} className="bg-gradient-to-r from-primary to-secondary">
                Add Stage
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
