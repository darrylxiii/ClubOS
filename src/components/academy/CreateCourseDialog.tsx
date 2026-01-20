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
import { Loader2, Sparkles, Wand2, Brain, ChevronRight, CheckCircle2 } from "lucide-react";

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [suggestedModules, setSuggestedModules] = useState<any[]>([]);
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
    } catch (error: any) {
      notify.error("AI generation failed", {
        description: error.message,
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
    } catch (error: any) {
      notify.error("Enhancement failed", {
        description: error.message,
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
    } catch (error: any) {
      notify.error("Suggestion failed", {
        description: error.message,
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
    } catch (error: any) {
      notify.error("Error creating course", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="squircle max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
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
                    className="squircle-sm"
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
                    <Label htmlFor="title">Course Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="squircle-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Description *</Label>
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
                      className="squircle-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category/Topic *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="category" className="squircle-sm">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="squircle">
                        <SelectItem value="Design">Design</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Code">Code</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Leadership">Leadership</SelectItem>
                        <SelectItem value="Data">Data</SelectItem>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course-image">Course Image URL (Optional)</Label>
                    <Input
                      id="course-image"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.course_image_url}
                      onChange={(e) => setFormData({ ...formData, course_image_url: e.target.value })}
                      className="squircle-sm"
                    />
                    <p className="text-xs text-muted-foreground">Image will be displayed on course cards</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course-video">Course Video URL (Optional)</Label>
                    <Input
                      id="course-video"
                      type="url"
                      placeholder="https://youtube.com/..."
                      value={formData.course_video_url}
                      onChange={(e) => setFormData({ ...formData, course_video_url: e.target.value })}
                      className="squircle-sm"
                    />
                    <p className="text-xs text-muted-foreground">Preview video for the course</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty Level</Label>
                      <Select
                        value={formData.difficulty_level}
                        onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                      >
                        <SelectTrigger id="difficulty" className="squircle-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="squircle">
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours">Estimated Hours</Label>
                      <Input
                        id="hours"
                        type="number"
                        value={formData.estimated_hours}
                        onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                        className="squircle-sm"
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
              <div className="space-y-2">
                <Label htmlFor="manual-title">Course Title *</Label>
                <Input
                  id="manual-title"
                  placeholder="e.g., Advanced Career Strategies for Tech Leaders"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="squircle-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="manual-description">Description *</Label>
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
                  placeholder="Describe what learners will achieve in this course..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={5}
                  className="squircle-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-category">Category/Topic *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="manual-category" className="squircle-sm">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="squircle">
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Code">Code</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Leadership">Leadership</SelectItem>
                    <SelectItem value="Data">Data</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-course-image">Course Image URL (Optional)</Label>
                <Input
                  id="manual-course-image"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.course_image_url}
                  onChange={(e) => setFormData({ ...formData, course_image_url: e.target.value })}
                  className="squircle-sm"
                />
                <p className="text-xs text-muted-foreground">Image will be displayed on course cards</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-course-video">Course Video URL (Optional)</Label>
                <Input
                  id="manual-course-video"
                  type="url"
                  placeholder="https://youtube.com/..."
                  value={formData.course_video_url}
                  onChange={(e) => setFormData({ ...formData, course_video_url: e.target.value })}
                  className="squircle-sm"
                />
                <p className="text-xs text-muted-foreground">Preview video for the course</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-difficulty">Difficulty Level</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) => setFormData({ ...formData, difficulty_level: value })}
                  >
                    <SelectTrigger id="manual-difficulty" className="squircle-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="squircle">
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manual-hours">Estimated Hours</Label>
                  <Input
                    id="manual-hours"
                    type="number"
                    placeholder="e.g., 8"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    className="squircle-sm"
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
