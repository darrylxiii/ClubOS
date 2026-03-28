import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/lib/notify";
import { ChevronLeft, Save, BookOpen, Upload, X, Link2, Sparkles, Bot } from "lucide-react";
import { InlineLoader, SectionLoader } from "@/components/ui/unified-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormErrors {
  title?: string;
  description?: string;
  youtubeUrl?: string;
}

export default function ModuleEdit() {
  const { t } = useTranslation('common');
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [module, setModule] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    estimated_minutes: "",
    video_url: "",
    image_url: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const initialFormData = useRef<typeof formData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  const getAiContentSuggestions = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Missing information",
        description: "Please add a title and description first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-course-generator', {
        body: {
          action: 'suggest_content',
          courseData: {
            moduleTitle: formData.title,
            moduleDescription: formData.description,
            courseTitle: module?.courses?.title || "Course"
          }
        }
      });

      if (error) throw error;

      const result = JSON.parse(data.content);
      setAiSuggestions(result.suggestions || []);
      setShowAiSuggestions(true);

      toast({
        title: "Suggestions ready",
        description: "AI has found some content ideas for you",
      });
    } catch (error: unknown) {
      toast({
        title: "AI suggestion failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (suggestion: any) => {
    // In a real app, we might use the YouTube API to search for this query
    // For now, we'll just set the video URL to a search link or placeholder
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(suggestion.search_query)}`;
    window.open(searchUrl, '_blank');

    toast({
      title: "Opening YouTube Search",
      description: `Searching for: ${suggestion.search_query}`,
    });
  };

  // Validate fields on change
  const validateField = useCallback((field: string, value: string): string | undefined => {
    switch (field) {
      case "title":
        if (!value.trim()) return "Title is required";
        if (value.trim().length < 3) return "Title must be at least 3 characters";
        return undefined;
      case "description":
        if (!value.trim()) return "Description is required";
        return undefined;
      default:
        return undefined;
    }
  }, []);

  const updateFormField = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "title" || field === "description") {
      setFormErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
    }
  }, [validateField]);

  // Track dirty state
  useEffect(() => {
    if (!initialFormData.current) return;
    const changed = Object.keys(formData).some(
      key => formData[key as keyof typeof formData] !== initialFormData.current![key as keyof typeof formData]
    );
    setIsDirty(changed);
  }, [formData]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    loadModuleData();
  }, [id, user]);

  const loadModuleData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data: moduleData, error } = await supabase
        .from("modules")
        .select("*, courses!inner(*)")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Check if user owns this module's course
      if (moduleData.courses.created_by !== user?.id) {
        toast({
          title: "Access denied",
          description: "You don't have permission to edit this module",
          variant: "destructive",
        });
        navigate("/academy/creator");
        return;
      }

      setModule(moduleData);
      const loaded = {
        title: moduleData.title || "",
        description: moduleData.description || "",
        estimated_minutes: moduleData.estimated_minutes?.toString() || "",
        video_url: moduleData.video_url || "",
        image_url: moduleData.image_url || "",
      };
      setFormData(loaded);
      initialFormData.current = loaded;
      setFormErrors({});
      setIsDirty(false);
    } catch (error: unknown) {
      toast({
        title: "Error loading module",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      navigate("/academy/creator");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (!user || !id) return;

    setUploading(true);
    setUploadProgress(`Uploading ${type}...`);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${id}-${type}-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('module-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('module-media')
        .getPublicUrl(fileName);

      if (type === 'image') {
        setFormData({ ...formData, image_url: publicUrl });
      } else {
        setFormData({ ...formData, video_url: publicUrl });
      }

      toast({
        title: "Upload successful",
        description: `${type} has been uploaded successfully`,
      });
    } catch (error: unknown) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const convertYouTubeUrl = (url: string): string => {
    if (!url) return "";

    // Extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }

    return url;
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    if (!url.trim()) return true; // empty is fine
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
    return pattern.test(url);
  };

  const handleYouTubeUrl = async (url: string) => {
    if (!url.trim()) {
      setFormErrors(prev => ({ ...prev, youtubeUrl: undefined }));
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      setFormErrors(prev => ({ ...prev, youtubeUrl: "Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)" }));
      return;
    }

    setFormErrors(prev => ({ ...prev, youtubeUrl: undefined }));
    const embedUrl = convertYouTubeUrl(url);
    setFormData(prev => ({ ...prev, video_url: embedUrl }));

    // Auto-fetch metadata from YouTube via noembed
    const videoIdMatch = url.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/);
    if (videoIdMatch && videoIdMatch[1]) {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoIdMatch[1]}`);
        const data = await res.json();
        if (data && !data.error) {
          setFormData(prev => ({
            ...prev,
            video_url: embedUrl,
            title: prev.title || data.title || prev.title,
            image_url: prev.image_url || data.thumbnail_url || prev.image_url,
          }));
          if (data.title) {
            toast({
              title: "Video found",
              description: `Auto-filled from: ${data.title}`,
            });
          }
        }
      } catch {
        // Silent fail — metadata fetch is optional
      }
    }
  };

  const hasFormErrors = !!(formErrors.title || formErrors.description || formErrors.youtubeUrl);
  const isFormValid = formData.title.trim().length >= 3 && formData.description.trim().length > 0 && !hasFormErrors;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !id) return;

    // Run full validation
    const titleErr = validateField("title", formData.title);
    const descErr = validateField("description", formData.description);
    if (titleErr || descErr) {
      setFormErrors(prev => ({ ...prev, title: titleErr, description: descErr }));
      toast({
        title: "Validation errors",
        description: "Please fix the highlighted fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("modules")
        .update({
          title: formData.title,
          slug,
          description: formData.description,
          estimated_minutes: formData.estimated_minutes
            ? parseInt(formData.estimated_minutes)
            : null,
          video_url: formData.video_url || null,
          image_url: formData.image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Module updated",
        description: "Your changes have been saved successfully",
      });
      setIsDirty(false);

      await loadModuleData();
    } catch (error: unknown) {
      toast({
        title: "Error saving module",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <SectionLoader />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 text-center py-12">
        <h2 className="text-2xl font-bold mb-4">{t('moduleEdit.text3')}</h2>
        <Button onClick={() => navigate("/academy/creator")}>
          Back to Creator Hub
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/courses/${module.courses?.id}/edit`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Course
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/courses/${module.courses?.id}/edit`)}
            >
              Cancel
            </Button>
            <Button onClick={() => handleSubmit()} disabled={saving || !isFormValid}>
              {saving ? (
                <>
                  <InlineLoader />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('moduleEdit.text4')}</h1>
              <p className="text-sm text-muted-foreground">{t('moduleEdit.desc')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="rounded-2xl mb-6">
                <TabsTrigger value="basic">{t('moduleEdit.text5')}</TabsTrigger>
                <TabsTrigger value="media">{t('moduleEdit.text6')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{"Module Title *"}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormField("title", e.target.value)}
                    placeholder={"e.g., Introduction to React Hooks"}
                    required
                    className={formErrors.title ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {formErrors.title && (
                    <p className="text-xs text-red-500">{formErrors.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{"Description *"}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormField("description", e.target.value)}
                    placeholder={t('moduleEdit.text7')}
                    rows={6}
                    required
                    className={formErrors.description ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-500">{formErrors.description}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_minutes">{t('moduleEdit.text8')}</Label>
                  <Input
                    id="estimated_minutes"
                    type="number"
                    min="1"
                    value={formData.estimated_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_minutes: e.target.value })
                    }
                    placeholder={"e.g., 45"}
                  />
                  <p className="text-xs text-muted-foreground">{t('moduleEdit.desc2')}</p>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-6">
                {/* Video Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t('moduleEdit.text9')}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getAiContentSuggestions}
                      disabled={loading || !formData.title}
                      className="text-primary border-primary/20 hover:bg-primary/5"
                    >
                      <Sparkles className="mr-2 h-3 w-3" />
                      Ask AI for Suggestions
                    </Button>
                  </div>

                  {showAiSuggestions && aiSuggestions.length > 0 && (
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Bot className="h-4 w-4 text-primary" />
                          AI Suggested Content
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setShowAiSuggestions(false)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {aiSuggestions.map((suggestion, idx) => (
                          <div key={idx} className="p-3 bg-background rounded border text-sm flex items-start justify-between gap-3 group hover:border-primary/30 transition-colors">
                            <div>
                              <p className="font-medium text-primary">{suggestion.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => applySuggestion(suggestion)}
                            >
                              Search YouTube
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* YouTube URL Input */}
                  <div className="space-y-2">
                    <Label htmlFor="youtube_url" className="text-sm text-muted-foreground">
                      YouTube URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="youtube_url"
                        placeholder="https://youtube.com/watch?v=..."
                        onBlur={(e) => handleYouTubeUrl(e.target.value)}
                        className={formErrors.youtubeUrl ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const input = document.getElementById('youtube_url') as HTMLInputElement;
                          if (input) handleYouTubeUrl(input.value);
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {formErrors.youtubeUrl && (
                      <p className="text-xs text-red-500">{formErrors.youtubeUrl}</p>
                    )}
                  </div>

                  {/* OR Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  {/* Video Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="video_upload" className="text-sm text-muted-foreground">
                      Upload Video
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="video_upload"
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'video');
                        }}
                        disabled={uploading}
                        className="cursor-pointer"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Max 100MB</p>
                  </div>

                  {/* Video Preview */}
                  {formData.video_url && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">{t('moduleEdit.text10')}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, video_url: "" })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {formData.video_url.includes('youtube.com') || formData.video_url.includes('youtu.be') ? (
                        <div className="aspect-video w-full rounded-lg overflow-hidden border">
                          <iframe
                            src={formData.video_url}
                            className="w-full h-full"
                            allowFullScreen
                            title={t('moduleEdit.text11')}
                          />
                        </div>
                      ) : (
                        <video
                          src={formData.video_url}
                          controls
                          className="w-full aspect-video rounded-lg border"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Image Section */}
                <div className="space-y-4">
                  <Label>{t('moduleEdit.text12')}</Label>

                  <div className="space-y-2">
                    <Input
                      id="image_upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'image');
                      }}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">Max 10MB</p>
                  </div>

                  {/* Image Preview */}
                  {formData.image_url && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">{t('moduleEdit.text13')}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, image_url: "" })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <img
                        src={formData.image_url}
                        alt={t('moduleEdit.text14')}
                        className="w-full aspect-video object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <SectionLoader />
                    <p className="text-sm text-muted-foreground">{uploadProgress}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </form>
        </Card>
    </div>
  );
}
