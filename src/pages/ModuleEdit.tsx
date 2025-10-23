import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Save, BookOpen, Upload, X, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ModuleEdit() {
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

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
      setFormData({
        title: moduleData.title || "",
        description: moduleData.description || "",
        estimated_minutes: moduleData.estimated_minutes?.toString() || "",
        video_url: moduleData.video_url || "",
        image_url: moduleData.image_url || "",
      });
    } catch (error: any) {
      toast({
        title: "Error loading module",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
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

  const handleYouTubeUrl = (url: string) => {
    const embedUrl = convertYouTubeUrl(url);
    setFormData({ ...formData, video_url: embedUrl });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !id) return;

    if (!formData.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a module title",
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

      await loadModuleData();
    } catch (error: any) {
      toast({
        title: "Error saving module",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!module) {
    return (
      <AppLayout>
        <div className="container max-w-6xl mx-auto p-6 text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Module not found</h2>
          <Button onClick={() => navigate("/academy/creator")}>
            Back to Creator Hub
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/courses/manage-modules/${module.course_id}`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Modules
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/courses/manage-modules/${module.course_id}`)}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
            <div className="p-2 squircle-sm bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Edit Module</h1>
              <p className="text-sm text-muted-foreground">
                Update your module details
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="squircle mb-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Module Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Introduction to React Hooks"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="What will students learn in this module?"
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_minutes">Estimated Time (minutes)</Label>
                  <Input
                    id="estimated_minutes"
                    type="number"
                    min="1"
                    value={formData.estimated_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_minutes: e.target.value })
                    }
                    placeholder="e.g., 45"
                  />
                  <p className="text-xs text-muted-foreground">
                    Approximate time to complete the module
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-6">
                {/* Video Section */}
                <div className="space-y-4">
                  <Label>Video Content</Label>
                  
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
                  </div>

                  {/* Video Preview */}
                  {formData.video_url && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Current Video</Label>
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
                            title="Video preview"
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
                  <Label>Module Image</Label>
                  
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
                  </div>

                  {/* Image Preview */}
                  {formData.image_url && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Current Image</Label>
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
                        alt="Module"
                        className="w-full aspect-video object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>

                {uploading && (
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{uploadProgress}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
