import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  FileText, DollarSign, Clock, Settings,
  ChevronRight, ChevronLeft, Sparkles, CheckCircle2,
  Plus, X, Briefcase, Target, Eye
} from "lucide-react";

const WIZARD_STEPS = [
  { id: "basics", label: "Project Basics", icon: FileText },
  { id: "skills", label: "Skills Required", icon: Target },
  { id: "budget", label: "Budget & Timeline", icon: DollarSign },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "review", label: "Review & Post", icon: Eye },
];

const SKILL_OPTIONS = [
  "React", "TypeScript", "Node.js", "Python", "AWS", "UI/UX Design",
  "Mobile Development", "DevOps", "Data Science", "Machine Learning",
  "Blockchain", "Product Management", "Marketing", "Content Writing"
];

const EXPERIENCE_LEVELS = [
  { value: "junior", label: "Junior", description: "1-2 years experience" },
  { value: "mid", label: "Mid-Level", description: "3-5 years experience" },
  { value: "senior", label: "Senior", description: "5-8 years experience" },
  { value: "expert", label: "Expert", description: "8+ years experience" },
];

interface PostProjectWizardProps {
  companyId?: string;
  onSuccess?: (projectId: string) => void;
}

export function PostProjectWizard({ companyId, onSuccess }: PostProjectWizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basics
    title: "",
    description: "",
    category: "",
    subcategory: "",
    
    // Skills
    required_skills: [] as string[],
    preferred_skills: [] as string[],
    experience_level: "mid",
    
    // Budget & Timeline
    engagement_type: "hourly", // hourly, fixed, milestone
    budget_min: 50,
    budget_max: 150,
    estimated_hours: 40,
    timeline_weeks: 4,
    start_date_target: "",
    
    // Settings
    visibility: "public",
    remote_policy: "remote",
    requires_nda: false,
    requires_interview: true,
    max_proposals: 50,
    club_ai_match_enabled: true,
    auto_accept_proposals: false,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const projectData = {
        title: data.title,
        description: data.description,
        category: data.category,
        required_skills: data.required_skills,
        preferred_skills: data.preferred_skills,
        experience_level: data.experience_level,
        engagement_type: data.engagement_type as "hourly" | "fixed" | "milestone",
        budget_min: data.budget_min,
        budget_max: data.budget_max,
        timeline_weeks: data.timeline_weeks,
        visibility: data.visibility,
        remote_policy: data.remote_policy,
        requires_nda: data.requires_nda,
        requires_interview: data.requires_interview,
        max_proposals: data.max_proposals,
        company_id: companyId || null,
        posted_by: user.id,
        status: "open" as const,
        published_at: new Date().toISOString(),
      };

      const { data: project, error } = await supabase
        .from("marketplace_projects")
        .insert(projectData)
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-projects"] });
      toast.success("Project posted successfully!");
      onSuccess?.(project.id);
      navigate(`/projects/${project.id}`);
    },
    onError: (error) => {
      toast.error("Failed to post project: " + error.message);
    },
  });

  const addSkill = (skill: string, type: "required" | "preferred") => {
    const key = type === "required" ? "required_skills" : "preferred_skills";
    if (!formData[key].includes(skill)) {
      setFormData({ ...formData, [key]: [...formData[key], skill] });
    }
  };

  const removeSkill = (skill: string, type: "required" | "preferred") => {
    const key = type === "required" ? "required_skills" : "preferred_skills";
    setFormData({ ...formData, [key]: formData[key].filter(s => s !== skill) });
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      createProjectMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.title.length >= 10 && formData.description.length >= 50;
      case 1:
        return formData.required_skills.length >= 1;
      case 2:
        return formData.budget_min > 0 && formData.timeline_weeks > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Post a New Project
        </CardTitle>
        <CardDescription>
          Describe your project to attract the best freelancers
        </CardDescription>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mt-6">
          {WIZARD_STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => index < currentStep && setCurrentStep(index)}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
                <span className="text-sm font-medium hidden lg:inline">{step.label}</span>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Basics */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Project Title *</Label>
              <Input
                placeholder="e.g., Build a React Native Mobile App for E-commerce"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Be specific and descriptive (minimum 10 characters)
              </p>
            </div>

            <div>
              <Label>Project Description *</Label>
              <Textarea
                placeholder="Describe your project in detail. Include goals, deliverables, and any specific requirements..."
                rows={8}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.description.length}/2000 characters (minimum 50)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web_development">Web Development</SelectItem>
                    <SelectItem value="mobile_development">Mobile Development</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="data_science">Data Science</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Subcategory</Label>
                <Input
                  placeholder="e.g., React, iOS, UI/UX"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                />
              </div>
            </div>

            {/* AI Description Helper */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Club AI Tip</p>
                    <p className="text-sm text-muted-foreground">
                      Include specific deliverables, tech stack requirements, and success criteria 
                      for better freelancer matches.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Skills */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <Label>Required Skills *</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select skills that are essential for this project
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.required_skills.map((skill) => (
                  <Badge key={skill} variant="default" className="gap-1 pr-1">
                    {skill}
                    <button onClick={() => removeSkill(skill, "required")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.filter(s => !formData.required_skills.includes(s)).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => addSkill(skill, "required")}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Nice-to-Have Skills</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Skills that would be a bonus but aren't required
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {formData.preferred_skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <button onClick={() => removeSkill(skill, "preferred")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.filter(
                  s => !formData.required_skills.includes(s) && !formData.preferred_skills.includes(s)
                ).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => addSkill(skill, "preferred")}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Experience Level Required</Label>
              <RadioGroup
                value={formData.experience_level}
                onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                className="grid grid-cols-2 gap-4 mt-3"
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <div key={level.value}>
                    <RadioGroupItem
                      value={level.value}
                      id={level.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={level.value}
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                    >
                      <span className="font-semibold">{level.label}</span>
                      <span className="text-xs text-muted-foreground">{level.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Timeline */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <Label>Engagement Type</Label>
              <RadioGroup
                value={formData.engagement_type}
                onValueChange={(value) => setFormData({ ...formData, engagement_type: value })}
                className="grid grid-cols-3 gap-4 mt-3"
              >
                <div>
                  <RadioGroupItem value="hourly" id="hourly" className="peer sr-only" />
                  <Label
                    htmlFor="hourly"
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <Clock className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Hourly</span>
                    <span className="text-xs text-muted-foreground">Pay per hour worked</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="fixed" id="fixed" className="peer sr-only" />
                  <Label
                    htmlFor="fixed"
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <DollarSign className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Fixed Price</span>
                    <span className="text-xs text-muted-foreground">One-time payment</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="milestone" id="milestone" className="peer sr-only" />
                  <Label
                    htmlFor="milestone"
                    className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <Target className="h-6 w-6 mb-2" />
                    <span className="font-semibold">Milestone</span>
                    <span className="text-xs text-muted-foreground">Pay per deliverable</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.engagement_type === "hourly" && (
              <div>
                <Label>Hourly Rate Range (€)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    type="number"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({ ...formData, budget_min: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({ ...formData, budget_max: parseInt(e.target.value) || 0 })}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">per hour</span>
                </div>
              </div>
            )}

            {formData.engagement_type === "fixed" && (
              <div>
                <Label>Project Budget (€)</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Input
                    type="number"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({ ...formData, budget_min: parseInt(e.target.value) || 0 })}
                    className="w-32"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({ ...formData, budget_max: parseInt(e.target.value) || 0 })}
                    className="w-32"
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Estimated Duration: {formData.timeline_weeks} weeks</Label>
              <Slider
                value={[formData.timeline_weeks]}
                onValueChange={([value]) => setFormData({ ...formData, timeline_weeks: value })}
                min={1}
                max={52}
                step={1}
                className="mt-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1 week</span>
                <span>1 year</span>
              </div>
            </div>

            {formData.engagement_type === "hourly" && (
              <div>
                <Label>Estimated Hours: {formData.estimated_hours} hours</Label>
                <Slider
                  value={[formData.estimated_hours]}
                  onValueChange={([value]) => setFormData({ ...formData, estimated_hours: value })}
                  min={5}
                  max={500}
                  step={5}
                  className="mt-3"
                />
              </div>
            )}

            <div>
              <Label>Target Start Date</Label>
              <Input
                type="date"
                value={formData.start_date_target}
                onChange={(e) => setFormData({ ...formData, start_date_target: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        )}

        {/* Step 4: Settings */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <Label>Project Visibility</Label>
              <RadioGroup
                value={formData.visibility}
                onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                className="mt-3 space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public" className="cursor-pointer">
                    <span className="font-medium">Public</span>
                    <p className="text-sm text-muted-foreground">
                      Any freelancer can view and apply
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="invite_only" id="invite_only" />
                  <Label htmlFor="invite_only" className="cursor-pointer">
                    <span className="font-medium">Invite Only</span>
                    <p className="text-sm text-muted-foreground">
                      Only invited freelancers can apply
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Work Location</Label>
              <Select
                value={formData.remote_policy}
                onValueChange={(value) => setFormData({ ...formData, remote_policy: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Fully Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site Required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require NDA</Label>
                  <p className="text-sm text-muted-foreground">
                    Freelancers must sign an NDA before viewing details
                  </p>
                </div>
                <Switch
                  checked={formData.requires_nda}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_nda: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Interview</Label>
                  <p className="text-sm text-muted-foreground">
                    Schedule an interview before hiring
                  </p>
                </div>
                <Switch
                  checked={formData.requires_interview}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_interview: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Club AI Matching</Label>
                  <p className="text-sm text-muted-foreground">
                    Let AI recommend the best freelancers
                  </p>
                </div>
                <Switch
                  checked={formData.club_ai_match_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, club_ai_match_enabled: checked })}
                />
              </div>
            </div>

            <div>
              <Label>Maximum Proposals: {formData.max_proposals}</Label>
              <Slider
                value={[formData.max_proposals]}
                onValueChange={([value]) => setFormData({ ...formData, max_proposals: value })}
                min={5}
                max={100}
                step={5}
                className="mt-3"
              />
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Title</p>
                    <p className="font-medium">{formData.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p>{formData.category || "Not specified"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Budget & Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="capitalize">{formData.engagement_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p>€{formData.budget_min} - €{formData.budget_max}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p>{formData.timeline_weeks} weeks</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {formData.required_skills.map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Description</p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {formData.description}
              </p>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Ready to Post</p>
                    <p className="text-sm text-muted-foreground">
                      Your project will be visible to freelancers immediately after posting
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid() || createProjectMutation.isPending}
          >
            {currentStep === WIZARD_STEPS.length - 1 ? (
              createProjectMutation.isPending ? "Posting..." : "Post Project"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
