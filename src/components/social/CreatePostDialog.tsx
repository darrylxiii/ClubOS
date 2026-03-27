import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Image as ImageIcon,
  Video,
  BarChart,
  Calendar as CalendarIcon,
  FileText,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORMS = [
  { id: "internal", name: "Quantum Club", icon: "🏠" },
  { id: "instagram", name: "Instagram", icon: "📷" },
  { id: "twitter", name: "Twitter", icon: "🐦" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "youtube", name: "YouTube", icon: "▶️" },
  { id: "linkedin", name: "LinkedIn", icon: "💼" },
];

export const CreatePostDialog = ({ open, onOpenChange }: CreatePostDialogProps) => {
  const { t } = useTranslation("common");
  const [postType, setPostType] = useState<"standard" | "poll" | "event" | "article">("standard");
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["internal"]);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [eventDetails, setEventDetails] = useState({
    date: "",
    location: "",
    link: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const handleAISuggestion = async () => {
    setLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-post-suggestions', {
        body: { 
          postType,
          platform: selectedPlatforms[0] || 'linkedin',
          currentContent: content
        }
      });

      if (error) throw error;

      if (data?.suggestions && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
        toast.success(t('social.createPost.suggestionsGenerated'));
      } else {
        toast.info(t('social.createPost.noSuggestions'));
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error(t('social.createPost.suggestionsFailed'));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setContent(suggestion);
    setAiSuggestions([]);
    toast.success(t('social.createPost.suggestionApplied'));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error(t('social.createPost.enterContent'));
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error(t('social.createPost.selectPlatform'));
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const postData = {
        user_id: user.id,
        platform: selectedPlatforms[0],
        post_type: postType === "standard" ? "text" : postType,
        post_subtype: postType,
        content,
        status: "published",
        published_at: new Date().toISOString(),
        ...(postType === "poll" && {
          poll_options: pollOptions.filter((opt) => opt.trim()),
          poll_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        ...(postType === "event" && {
          event_date: eventDetails.date,
          event_location: eventDetails.location,
          event_link: eventDetails.link,
        }),
      };

      const { error } = await supabase.from("unified_posts").insert(postData);

      if (error) throw error;

      toast.success(t('social.createPost.created'));
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(t('social.createPost.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setContent("");
    setPostType("standard");
    setSelectedPlatforms(["internal"]);
    setPollOptions(["", ""]);
    setEventDetails({ date: "", location: "", link: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('social.createPost.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Platform Selection */}
          <div>
            <Label className="mb-3 block">{t('social.createPost.selectPlatforms')}</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <Badge
                  key={platform.id}
                  variant={selectedPlatforms.includes(platform.id) ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => togglePlatform(platform.id)}
                >
                  <span className="mr-2">{platform.icon}</span>
                  {platform.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Post Type Selection */}
          <Tabs value={postType} onValueChange={(v: any) => setPostType(v)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="standard" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                {t('social.createPost.tabs.post')}
              </TabsTrigger>
              <TabsTrigger value="poll" className="gap-2">
                <BarChart className="h-4 w-4" />
                {t('social.createPost.tabs.poll')}
              </TabsTrigger>
              <TabsTrigger value="event" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {t('social.createPost.tabs.event')}
              </TabsTrigger>
              <TabsTrigger value="article" className="gap-2">
                <FileText className="h-4 w-4" />
                {t('social.createPost.tabs.article')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="space-y-4">
              <div>
                <Label htmlFor="content">{t('social.createPost.whatsOnMind')}</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('social.createPost.sharePlaceholder')}
                  className="min-h-[150px] mt-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="poll" className="space-y-4">
              <div>
                <Label htmlFor="poll-question">{t('social.createPost.pollQuestion')}</Label>
                <Textarea
                  id="poll-question"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('social.createPost.askQuestion')}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>{t('social.createPost.options')}</Label>
                <div className="space-y-2 mt-2">
                  {pollOptions.map((option, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[idx] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        placeholder={`Option ${idx + 1}`}
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPollOptions([...pollOptions, ""])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('social.createPost.addOption')}
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="event" className="space-y-4">
              <div>
                <Label htmlFor="event-description">{t('social.createPost.eventDescription')}</Label>
                <Textarea
                  id="event-description"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('social.createPost.describeEvent')}
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-date">{t('social.createPost.dateTime')}</Label>
                  <Input
                    id="event-date"
                    type="datetime-local"
                    value={eventDetails.date}
                    onChange={(e) =>
                      setEventDetails({ ...eventDetails, date: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="event-location">{t('social.createPost.location')}</Label>
                  <Input
                    id="event-location"
                    value={eventDetails.location}
                    onChange={(e) =>
                      setEventDetails({ ...eventDetails, location: e.target.value })
                    }
                    placeholder={t('social.createPost.eventLocationPlaceholder')}
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="event-link">{t('social.createPost.eventLink')}</Label>
                <Input
                  id="event-link"
                  type="url"
                  value={eventDetails.link}
                  onChange={(e) => setEventDetails({ ...eventDetails, link: e.target.value })}
                  placeholder="https://"
                  className="mt-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="article" className="space-y-4">
              <div>
                <Label htmlFor="article-content">{t('social.createPost.articleContent')}</Label>
                <Textarea
                  id="article-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t('social.createPost.writeArticle')}
                  className="min-h-[300px] mt-2"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* AI Suggestions */}
          <Button variant="outline" onClick={handleAISuggestion} className="w-full gap-2" disabled={loadingSuggestions}>
            {loadingSuggestions ? (
              <>
                <span className="animate-spin">⏳</span>
                {t('social.createPost.generating')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t('social.createPost.getAISuggestions')}
              </>
            )}
          </Button>

          {/* Display AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="space-y-2">
              <Label>{t('social.createPost.aiSuggestionsLabel')}</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {aiSuggestions.map((suggestion, idx) => (
                  <Card 
                    key={idx} 
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <p className="text-sm line-clamp-2">{suggestion}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('actions.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? t('social.createPost.publishing') : t('social.createPost.publish')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
