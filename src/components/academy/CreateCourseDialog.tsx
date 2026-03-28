import { useTranslation } from 'react-i18next';
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify } from "@/lib/notify";
import { Loader2, Sparkles, Wand2, Brain, ChevronRight, CheckCircle2, BookOpen, Clock, Zap, GraduationCap } from "lucide-react";

const COURSE_TEMPLATES = [
  {
    key: "quick-tutorial",
    label: "Quick Tutorial",
    icon: Zap,
    modules: 3,
    hours: "1",
    difficulty: "beginner",
    description: "3 modules, 1 hour, beginner",
    moduleTitles: [
      { title: "Introduction & Setup", description: "Getting started with the basics" },
      { title: "Core Concepts", description: "Understanding the key fundamentals" },
      { title: "Hands-On Practice", description: "Applying what you learned" },
    ],
  },
  {
    key: "workshop",
    label: "Workshop",
    icon: BookOpen,
    modules: 6,
    hours: "4",
    difficulty: "intermediate",
    description: "6 modules, 4 hours, intermediate",
    moduleTitles: [
      { title: "Workshop Overview", description: "Goals and expectations" },
      { title: "Foundation Skills", description: "Building the baseline knowledge" },
      { title: "Deep Dive: Theory", description: "Understanding the principles" },
      { title: "Deep Dive: Practice", description: "Guided exercises and examples" },
      { title: "Advanced Techniques", description: "Taking skills to the next level" },
      { title: "Final Project & Review", description: "Putting it all together" },
    ],
  },
  {
    key: "masterclass",
    label: "Masterclass",
    icon: GraduationCap,
    modules: 12,
    hours: "10",
    difficulty: "advanced",
    description: "12 modules, 10 hours, advanced",
    moduleTitles: [
      { title: "Welcome & Course Roadmap", description: "Overview of the learning journey" },
      { title: "Foundational Concepts", description: "Essential building blocks" },
      { title: "Core Principles", description: "Key theories and frameworks" },
      { title: "Intermediate Techniques", description: "Building on the basics" },
      { title: "Case Study Analysis", description: "Real-world application review" },
      { title: "Advanced Strategies", description: "Expert-level approaches" },
      { title: "Hands-On Lab I", description: "Practical exercises" },
      { title: "Hands-On Lab II", description: "Complex project work" },
      { title: "Industry Best Practices", description: "Professional standards" },
      { title: "Troubleshooting & Debugging", description: "Solving common challenges" },
      { title: "Capstone Project", description: "Comprehensive final project" },
      { title: "Wrap-Up & Next Steps", description: "Review and future learning paths" },
    ],
  },
  {
    key: "mini-course",
    label: "Mini-Course",
    icon: Clock,
    modules: 2,
    hours: "0.5",
    difficulty: "beginner",
    description: "2 modules, 30 min, beginner",
    moduleTitles: [
      { title: "Key Concepts", description: "The essentials you need to know" },
      { title: "Quick Practice", description: "Apply it right away" },
    ],
  },
] as const;

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academyId: string;
  onSuccess: () => void;
}

export function CreateCourseDialog({
  open,
  onOpenChange,
  academyId,
  onSuccess,
}: CreateCourseDialogProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [suggestedModules, setSuggestedModules] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    difficulty_level: "beginner",
    estimated_hours: "",
    category: "",
    course_image_url: "",
    course_video_url: "",
  });

  const generateCourseFromAI = async () => {
    if (!aiPrompt.trim()) {
      notify.error("Enter a prompt", {
        description: "Please describe the course you want to create",
      });
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-course-generator', {
        body: { action: 'generate_course', prompt: aiPrompt }
      });

      if (error) throw error;

      const courseData = JSON.parse(data.content);
      setFormData({
        title: courseData.title,
        description: courseData.description,
        difficulty_level: courseData.difficulty_level,
        estimated_hours: courseData.estimated_hours.toString(),
        category: courseData.category || "",
        course_image_url: "",
        course_video_url: "",
      });
      setSuggestedModules(courseData.modules || []);

      notify.success("Course generated", {
        description: "Review and customize the AI-generated course details",
      });
    } catch (error: unknown) {
      notify.error("AI generation failed", {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const enhanceDescription = async () => {
    if (!formData.title || !formData.description) {
      notify.error("Missing information", {
        description: "Please add a title and description first",
      });
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-course-generator', {
        body: { 
          action: 'enhance_description', 
          prompt: formData.description,
          courseData: { title: formData.title }
        }
      });

      if (error) throw error;

      setFormData({ ...formData, description: data.content });
      notify.success("Description enhanced", {
        description: "AI has improved your course description",
      });
    } catch (error: unknown) {
      notify.error("Enhancement failed", {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const suggestModulesFromAI = async () => {
    if (!formData.title || !formData.description) {
      notify.error("Missing information", {
        description: "Please add a title and description first",
      });
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-course-generator', {
        body: { 
          action: 'suggest_modules',
          courseData: { title: formData.title, description: formData.description }
        }
      });

      if (error) throw error;

      const modules = JSON.parse(data.content);
      setSuggestedModules(modules);
      notify.success("Modules suggested", {
        description: `AI has generated ${modules.length} module suggestions`,
      });
    } catch (error: unknown) {
      notify.error("Suggestion failed", {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert({
          academy_id: academyId,
          title: formData.title,
          slug,
          description: formData.description,
          difficulty_level: formData.difficulty_level,
          estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
          category: formData.category || null,
          course_image_url: formData.course_image_url || null,
          course_video_url: formData.course_video_url || null,
          created_by: user.id,
          is_published: false,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Create suggested modules if any
      if (suggestedModules.length > 0 && courseData) {
        const modulesInsert = suggestedModules.map((module, index) => {
          const slug = module.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
          
          return {
            course_id: courseData.id,
            title: module.title,
            slug,
            description: module.description,
            display_order: index + 1,
            created_by: user.id,
            is_published: false,
          };
        });

        const { error: modulesError } = await supabase
          .from("modules")
          .insert(modulesInsert);

        if (modulesError) {
          console.error("Error creating modules:", modulesError);
        }
      }

      notify.success("Course created", {
        description: suggestedModules.length > 0 
          ? `Course created with ${suggestedModules.length} modules. You can now add content to them.`
          : "Your course has been created successfully. You can now add modules to it.",
      });

      onOpenChange(false);
      onSuccess();
      setFormData({
        title: "",
        description: "",
        difficulty_level: "beginner",
        estimated_hours: "",
        category: "",
        course_image_url: "",
        course_video_url: "",
      });
      setSuggestedModules([]);
      setAiPrompt("");
      setSelectedTemplate(null);
    } catch (error: unknown) {
      notify.error("Error creating course", {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI-Powered Course Creator
          </DialogTitle>
          <DialogDescription>
            Let AI help you create a comprehensive course structure, or build it manually
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="manual">{t("manual_entry", "Manual Entry")}</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-6">
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ai-prompt" className="text-base font-semibold">
                    Describe Your Course Idea
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Tell the AI what kind of course you want to create. Be specific about the topic, target audience, and goals.
                  </p>
                  <Textarea
                    id="ai-prompt"
                    placeholder="e.g., 'I want to create a course teaching software engineers how to transition into leadership roles, covering communication skills, team management, and strategic thinking...'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                    className="rounded-xl"
                  />
                </div>
                <Button
                  onClick={generateCourseFromAI}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {aiLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  Generate Complete Course Structure
                </Button>
              </div>
            </Card>

            {formData.title && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                  AI Generated Course Details
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("course_title", "Course Title *")}</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">{t("description", "Description *")}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={enhanceDescription}
                        disabled={aiLoading}
                      >
                        {aiLoading ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-3 w-3" />
                        )}
                        Enhance with AI
                      </Button>
                    </div>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                      rows={5}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">{t("categorytopic", "Category/Topic *")}</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="category" className="rounded-xl">
                        <SelectValue placeholder={t("select_a_category", "Select a category")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="Design">{t("design", "Design")}</SelectItem>
                        <SelectItem value="Business">{t("business", "Business")}</SelectItem>
                        <SelectItem value="Code">{t("code", "Code")}</SelectItem>
                        <SelectItem value="Marketing">{t("marketing", "Marketing")}</SelectItem>
                        <SelectItem value="Leadership">{t("leadership", "Leadership")}</SelectItem>
                        <SelectItem value="Data">{t("data", "Data")}</SelectItem>
                        <SelectItem value="Product">{t("product", "Product")}</SelectItem>
                        <SelectItem value="Other">{t("other", "Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course-image">{t("course_image_url_optional", "Course Image URL (Optional)")}</Label>
                    <Input
                      id="course-image"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.course_image_url}
                      onChange={(e) => setFormData({ ...formData, course_image_url: e.target.value })}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">{t("image_will_be_displayed", "Image will be displayed on course cards")}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course-video">{t("course_video_url_optional", "Course Video URL (Optional)")}</Label>
                    <Input
                      id="course-video"
                      type="url"
                      placeholder="https://youtube.com/..."
                      value={formData.course_video_url}
                      onChange={(e) => setFormData({ ...formData, course_video_url: e.target.value })}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">{t("preview_video_for_the", "Preview video for the course")}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">{t("difficulty_level", "Difficulty Level")}</Label>
                      <Select
                        value={formData.difficulty_level}
                        onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                      >
                        <SelectTrigger id="difficulty" className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="beginner">{t("beginner", "Beginner")}</SelectItem>
                          <SelectItem value="intermediate">{t("intermediate", "Intermediate")}</SelectItem>
                          <SelectItem value="advanced">{t("advanced", "Advanced")}</SelectItem>
                          <SelectItem value="expert">{t("expert", "Expert")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours">{t("estimated_hours", "Estimated Hours")}</Label>
                      <Input
                        id="hours"
                        type="number"
                        value={formData.estimated_hours}
                        onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {suggestedModules.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Suggested Modules ({suggestedModules.length})</Label>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {suggestedModules.map((module, index) => (
                          <Card key={index} className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{module.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Course {suggestedModules.length > 0 && `with ${suggestedModules.length} Modules`}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Template Picker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Templates</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COURSE_TEMPLATES.map((tpl) => {
                    const Icon = tpl.icon;
                    const isSelected = selectedTemplate === tpl.key;
                    return (
                      <button
                        key={tpl.key}
                        type="button"
                        className={`p-3 rounded-lg border text-left transition-all hover:border-primary/50 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border"
                        }`}
                        onClick={() => {
                          setSelectedTemplate(isSelected ? null : tpl.key);
                          if (!isSelected) {
                            setFormData((prev) => ({
                              ...prev,
                              estimated_hours: tpl.hours,
                              difficulty_level: tpl.difficulty,
                            }));
                            setSuggestedModules([...tpl.moduleTitles]);
                          } else {
                            setSuggestedModules([]);
                          }
                        }}
                      >
                        <Icon className={`h-4 w-4 mb-1.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="text-xs font-semibold leading-tight">{tpl.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{tpl.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-title">{t("course_title", "Course Title *")}</Label>
                <Input
                  id="manual-title"
                  placeholder={t("eg_advanced_career_strategies", "e.g., Advanced Career Strategies for Tech Leaders")}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="manual-description">{t("description", "Description *")}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={enhanceDescription}
                    disabled={aiLoading || !formData.title}
                  >
                    {aiLoading ? (
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-3 w-3" />
                    )}
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  id="manual-description"
                  placeholder={t("describe_what_learners_will", "Describe what learners will achieve in this course...")}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={5}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-category">{t("categorytopic", "Category/Topic *")}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="manual-category" className="rounded-xl">
                    <SelectValue placeholder={t("select_a_category", "Select a category")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Design">{t("design", "Design")}</SelectItem>
                    <SelectItem value="Business">{t("business", "Business")}</SelectItem>
                    <SelectItem value="Code">{t("code", "Code")}</SelectItem>
                    <SelectItem value="Marketing">{t("marketing", "Marketing")}</SelectItem>
                    <SelectItem value="Leadership">{t("leadership", "Leadership")}</SelectItem>
                    <SelectItem value="Data">{t("data", "Data")}</SelectItem>
                    <SelectItem value="Product">{t("product", "Product")}</SelectItem>
                    <SelectItem value="Other">{t("other", "Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-course-image">{t("course_image_url_optional", "Course Image URL (Optional)")}</Label>
                <Input
                  id="manual-course-image"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.course_image_url}
                  onChange={(e) => setFormData({ ...formData, course_image_url: e.target.value })}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">{t("image_will_be_displayed", "Image will be displayed on course cards")}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-course-video">{t("course_video_url_optional", "Course Video URL (Optional)")}</Label>
                <Input
                  id="manual-course-video"
                  type="url"
                  placeholder="https://youtube.com/..."
                  value={formData.course_video_url}
                  onChange={(e) => setFormData({ ...formData, course_video_url: e.target.value })}
                  className="rounded-xl"
                />
                <p className="text-xs text-muted-foreground">{t("preview_video_for_the", "Preview video for the course")}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-difficulty">{t("difficulty_level", "Difficulty Level")}</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                  >
                    <SelectTrigger id="manual-difficulty" className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="beginner">{t("beginner", "Beginner")}</SelectItem>
                      <SelectItem value="intermediate">{t("intermediate", "Intermediate")}</SelectItem>
                      <SelectItem value="advanced">{t("advanced", "Advanced")}</SelectItem>
                      <SelectItem value="expert">{t("expert", "Expert")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-hours">{t("estimated_hours", "Estimated Hours")}</Label>
                  <Input
                    id="manual-hours"
                    type="number"
                    placeholder={t("eg_8", "e.g., 8")}
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={suggestModulesFromAI}
                disabled={aiLoading || !formData.title || !formData.description}
                className="w-full"
              >
                {aiLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                Get AI Module Suggestions
              </Button>

              {suggestedModules.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base">Suggested Modules ({suggestedModules.length})</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {suggestedModules.map((module, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{module.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Course {suggestedModules.length > 0 && `with ${suggestedModules.length} Modules`}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
