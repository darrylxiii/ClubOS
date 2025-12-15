import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  User, Briefcase, DollarSign, Clock, Globe, Award, 
  CheckCircle2, ChevronRight, ChevronLeft, Sparkles,
  Plus, X, Upload, Star
} from "lucide-react";

const STEPS = [
  { id: "basics", label: "Basic Info", icon: User },
  { id: "skills", label: "Skills & Expertise", icon: Briefcase },
  { id: "rates", label: "Rates & Availability", icon: DollarSign },
  { id: "portfolio", label: "Portfolio", icon: Star },
  { id: "preferences", label: "Preferences", icon: Globe },
];

const SKILL_CATEGORIES = [
  "Web Development", "Mobile Development", "UI/UX Design", "Data Science",
  "Machine Learning", "DevOps", "Cloud Architecture", "Blockchain",
  "Product Management", "Marketing", "Content Writing", "Video Production",
  "3D Animation", "Game Development", "Security", "QA Testing"
];

const EXPERIENCE_LEVELS = [
  { value: "junior", label: "Junior (1-2 years)" },
  { value: "mid", label: "Mid-Level (3-5 years)" },
  { value: "senior", label: "Senior (5-8 years)" },
  { value: "expert", label: "Expert (8+ years)" },
];

interface FreelancerProfileBuilderProps {
  onComplete?: () => void;
}

export function FreelancerProfileBuilder({ onComplete }: FreelancerProfileBuilderProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    professional_title: "",
    bio: "",
    skills: [] as string[],
    experience_level: "mid",
    hourly_rate_min: 50,
    hourly_rate_max: 150,
    availability_hours: 40,
    available_from: "",
    preferred_project_types: [] as string[],
    preferred_industries: [] as string[],
    portfolio_items: [] as { title: string; description: string; url: string; image_url: string }[],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languages: ["English"],
    is_open_to_retainers: true,
    min_project_value: 500,
  });

  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ["freelance-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("freelance_profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const profileData = {
        id: user.id,
        hourly_rate_min: data.hourly_rate_min,
        hourly_rate_max: data.hourly_rate_max,
        availability_hours_per_week: data.availability_hours,
        categories: data.skills,
        portfolio_items: data.portfolio_items,
        preferred_industries: data.preferred_industries,
        timezone_preference: data.timezone,
        language_proficiencies: data.languages.map(l => ({ language: l, level: "fluent" })),
        is_open_to_retainers: data.is_open_to_retainers,
        min_project_value: data.min_project_value,
        freelance_status: "available",
        profile_completeness: calculateCompleteness(data),
      };

      const { error } = await supabase
        .from("freelance_profiles")
        .upsert(profileData);

      if (error) throw error;

      // Also update main profile
      await supabase
        .from("profiles")
        .update({
          current_title: data.professional_title,
          bio: data.bio,
          open_to_freelance_work: true,
          freelance_availability_status: "available",
          freelance_categories: data.skills,
          freelance_hourly_rate_min: data.hourly_rate_min,
          freelance_hourly_rate_max: data.hourly_rate_max,
        })
        .eq("id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelance-profile"] });
      toast.success("Profile saved successfully!");
      if (currentStep === STEPS.length - 1) {
        onComplete?.();
      }
    },
    onError: (error) => {
      toast.error("Failed to save profile: " + error.message);
    },
  });

  const calculateCompleteness = (data: typeof formData) => {
    let score = 0;
    if (data.professional_title) score += 15;
    if (data.bio && data.bio.length > 50) score += 15;
    if (data.skills.length >= 3) score += 20;
    if (data.hourly_rate_min > 0) score += 10;
    if (data.portfolio_items.length > 0) score += 20;
    if (data.preferred_industries.length > 0) score += 10;
    if (data.languages.length > 0) score += 10;
    return score;
  };

  const completeness = calculateCompleteness(formData);

  const addSkill = (skill: string) => {
    if (!formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addPortfolioItem = () => {
    setFormData({
      ...formData,
      portfolio_items: [
        ...formData.portfolio_items,
        { title: "", description: "", url: "", image_url: "" }
      ]
    });
  };

  const updatePortfolioItem = (index: number, field: string, value: string) => {
    const updated = [...formData.portfolio_items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, portfolio_items: updated });
  };

  const removePortfolioItem = (index: number) => {
    setFormData({
      ...formData,
      portfolio_items: formData.portfolio_items.filter((_, i) => i !== index)
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      saveProfileMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="py-12 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Build Your Freelancer Profile
            </CardTitle>
            <CardDescription>
              Complete your profile to start receiving project matches
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Profile Completeness</p>
            <div className="flex items-center gap-2">
              <Progress value={completeness} className="w-24" />
              <span className="font-semibold text-sm">{completeness}%</span>
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div 
                key={step.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" :
                  isCompleted ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
                <span className="text-sm font-medium hidden md:inline">{step.label}</span>
              </div>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Basic Info */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Professional Title</Label>
              <Input
                placeholder="e.g., Senior Full-Stack Developer"
                value={formData.professional_title}
                onChange={(e) => setFormData({ ...formData, professional_title: e.target.value })}
              />
            </div>

            <div>
              <Label>Professional Bio</Label>
              <Textarea
                placeholder="Describe your experience, expertise, and what makes you unique..."
                rows={5}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>

            <div>
              <Label>Experience Level</Label>
              <Select
                value={formData.experience_level}
                onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Skills */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Your Skills & Expertise</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select at least 3 skills that best describe your expertise
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="default" className="gap-1 pr-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SKILL_CATEGORIES.filter(s => !formData.skills.includes(s)).map((skill) => (
                  <Button
                    key={skill}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => addSkill(skill)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {skill}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Rates & Availability */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <Label>Hourly Rate Range (€)</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Set your minimum and maximum hourly rates
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs">Minimum</Label>
                  <Input
                    type="number"
                    value={formData.hourly_rate_min}
                    onChange={(e) => setFormData({ ...formData, hourly_rate_min: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <span className="text-muted-foreground mt-5">to</span>
                <div className="flex-1">
                  <Label className="text-xs">Maximum</Label>
                  <Input
                    type="number"
                    value={formData.hourly_rate_max}
                    onChange={(e) => setFormData({ ...formData, hourly_rate_max: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Weekly Availability: {formData.availability_hours} hours</Label>
              <Slider
                value={[formData.availability_hours]}
                onValueChange={([value]) => setFormData({ ...formData, availability_hours: value })}
                min={5}
                max={60}
                step={5}
                className="mt-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5 hrs</span>
                <span>60 hrs</span>
              </div>
            </div>

            <div>
              <Label>Minimum Project Value (€)</Label>
              <Input
                type="number"
                value={formData.min_project_value}
                onChange={(e) => setFormData({ ...formData, min_project_value: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                You won't be matched with projects below this value
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Open to Retainers</Label>
                <p className="text-sm text-muted-foreground">
                  Long-term ongoing work arrangements
                </p>
              </div>
              <Switch
                checked={formData.is_open_to_retainers}
                onCheckedChange={(checked) => setFormData({ ...formData, is_open_to_retainers: checked })}
              />
            </div>
          </div>
        )}

        {/* Step 4: Portfolio */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Portfolio Items</Label>
                <p className="text-sm text-muted-foreground">
                  Showcase your best work
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addPortfolioItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {formData.portfolio_items.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Add portfolio items to showcase your work
                </p>
                <Button variant="outline" className="mt-4" onClick={addPortfolioItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.portfolio_items.map((item, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between">
                        <Label>Portfolio Item {index + 1}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePortfolioItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Project Title"
                        value={item.title}
                        onChange={(e) => updatePortfolioItem(index, "title", e.target.value)}
                      />
                      <Textarea
                        placeholder="Brief description..."
                        value={item.description}
                        onChange={(e) => updatePortfolioItem(index, "description", e.target.value)}
                      />
                      <Input
                        placeholder="Project URL (optional)"
                        value={item.url}
                        onChange={(e) => updatePortfolioItem(index, "url", e.target.value)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Preferences */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <Label>Preferred Industries</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Select industries you prefer to work in
              </p>
              <div className="flex flex-wrap gap-2">
                {["Technology", "Finance", "Healthcare", "E-commerce", "Education", "Media", "Manufacturing", "Consulting"].map((industry) => (
                  <Badge
                    key={industry}
                    variant={formData.preferred_industries.includes(industry) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (formData.preferred_industries.includes(industry)) {
                        setFormData({
                          ...formData,
                          preferred_industries: formData.preferred_industries.filter(i => i !== industry)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          preferred_industries: [...formData.preferred_industries, industry]
                        });
                      }
                    }}
                  >
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Timezone</Label>
              <Input
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              />
            </div>

            <div>
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {["English", "Dutch", "German", "French", "Spanish", "Portuguese", "Mandarin"].map((lang) => (
                  <Badge
                    key={lang}
                    variant={formData.languages.includes(lang) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (formData.languages.includes(lang)) {
                        setFormData({
                          ...formData,
                          languages: formData.languages.filter(l => l !== lang)
                        });
                      } else {
                        setFormData({
                          ...formData,
                          languages: [...formData.languages, lang]
                        });
                      }
                    }}
                  >
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
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
            disabled={saveProfileMutation.isPending}
          >
            {currentStep === STEPS.length - 1 ? (
              saveProfileMutation.isPending ? "Saving..." : "Complete Profile"
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
