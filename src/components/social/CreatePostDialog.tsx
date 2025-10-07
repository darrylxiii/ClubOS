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

  const handleAISuggestion = async () => {
    toast.info("AI suggestions coming soon!");
    // TODO: Implement AI suggestions
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform");
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

      toast.success("Post created successfully!");
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
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
          <DialogTitle className="text-2xl">Create New Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Platform Selection */}
          <div>
            <Label className="mb-3 block">Select Platforms</Label>
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
                Post
              </TabsTrigger>
              <TabsTrigger value="poll" className="gap-2">
                <BarChart className="h-4 w-4" />
                Poll
              </TabsTrigger>
              <TabsTrigger value="event" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                Event
              </TabsTrigger>
              <TabsTrigger value="article" className="gap-2">
                <FileText className="h-4 w-4" />
                Article
              </TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="space-y-4">
              <div>
                <Label htmlFor="content">What's on your mind?</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="min-h-[150px] mt-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="poll" className="space-y-4">
              <div>
                <Label htmlFor="poll-question">Poll Question</Label>
                <Textarea
                  id="poll-question"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ask a question..."
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Options</Label>
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
                      Add Option
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="event" className="space-y-4">
              <div>
                <Label htmlFor="event-description">Event Description</Label>
                <Textarea
                  id="event-description"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe your event..."
                  className="mt-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-date">Date & Time</Label>
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
                  <Label htmlFor="event-location">Location</Label>
                  <Input
                    id="event-location"
                    value={eventDetails.location}
                    onChange={(e) =>
                      setEventDetails({ ...eventDetails, location: e.target.value })
                    }
                    placeholder="Event location"
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="event-link">Event Link</Label>
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
                <Label htmlFor="article-content">Article Content</Label>
                <Textarea
                  id="article-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your article..."
                  className="min-h-[300px] mt-2"
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* AI Suggestions */}
          <Button variant="outline" onClick={handleAISuggestion} className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Get AI Suggestions
          </Button>

          {/* Submit */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Publishing..." : "Publish"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
