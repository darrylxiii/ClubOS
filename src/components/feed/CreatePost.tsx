import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, Video, FileText, Send, X, BarChart2, Plus, Users, Globe, UserCircle, Building, Heart, MoreHorizontal, Youtube, Sparkles } from "lucide-react";
import { CreatePoll } from "./PollPost";
import { toast } from "@/hooks/use-toast";
import { MediaEditor } from "./MediaEditor";
import { VideoEditor } from "./VideoEditor";
import { AudienceSelection } from "@/components/audience/AudiencePickerButton";
import { AudiencePickerModal } from "@/components/audience/AudiencePickerModal";
import { ContentOptionsDialog } from "./ContentOptionsDialog";
import { RichTextEditor } from "./RichTextEditor";
import { validatePostMediaFile } from "@/lib/fileValidation";
import { YouTubePicker } from "@/components/messages/YouTubePicker";
import { extractYouTubeVideoId, containsYouTubeUrl } from "@/lib/youtubeUtils";
import { detectSocialEmbeds, containsSocialMediaUrl, removeSocialMediaUrls, SocialEmbed as SocialEmbedType } from "@/lib/socialEmbedUtils";
import { detectSpotifyEmbeds, containsSpotifyUrl, removeSpotifyUrls } from "@/lib/spotifyEmbedUtils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { YouTubePickerDialog } from "./YouTubePickerDialog";
import { SocialEmbed } from "./SocialEmbed";
import { SpotifyEmbed } from "./SpotifyEmbed";

interface CreatePostProps {
  onPostCreated: () => void;
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [editingFileType, setEditingFileType] = useState<'image' | 'video' | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollData, setPollData] = useState<any>(null);
  const [audienceSelection, setAudienceSelection] = useState<AudienceSelection>({
    type: 'best_friends',
  });
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [lastUsedAudience, setLastUsedAudience] = useState<string | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [contentMenuOpen, setContentMenuOpen] = useState(false);
  const [audienceMenuOpen, setAudienceMenuOpen] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [showYoutubePrompt, setShowYoutubePrompt] = useState(false);
  const [detectedYoutubeUrl, setDetectedYoutubeUrl] = useState<string | null>(null);
  const [showYoutubePicker, setShowYoutubePicker] = useState(false);
  const [socialEmbeds, setSocialEmbeds] = useState<SocialEmbedType[]>([]);
  const [showSocialPrompt, setShowSocialPrompt] = useState(false);
  const [detectedSocialEmbeds, setDetectedSocialEmbeds] = useState<SocialEmbedType[]>([]);
  const [spotifyEmbeds, setSpotifyEmbeds] = useState<Array<{type: string, id: string, url: string}>>([]);
  const [showSpotifyPrompt, setShowSpotifyPrompt] = useState(false);
  const [detectedSpotifyEmbeds, setDetectedSpotifyEmbeds] = useState<Array<{type: string, id: string, url: string}>>([]);

  useEffect(() => {
    if (user) {
      // Fetch profile and company info
      supabase
        .from('profiles')
        .select('full_name, avatar_url, company_id')
        .eq('id', user.id)
        .single()
        .then(async ({ data: profileData }) => {
          setProfile(profileData);
          
          // Fetch company name if company_id exists
          if (profileData?.company_id) {
            const { data: companyData } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profileData.company_id)
              .single();
            
            if (companyData) {
              setCompanyName(companyData.name);
            }
          }
        });
      
      // Load last used audience from localStorage
      const saved = localStorage.getItem('lastUsedAudience');
      if (saved) {
        setLastUsedAudience(saved);
      }
    }
  }, [user]);

  // Detect YouTube URLs in content
  useEffect(() => {
    if (content && !youtubeVideoId) {
      if (containsYouTubeUrl(content)) {
        const urls = content.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+/g);
        if (urls && urls.length > 0) {
          const url = urls[0];
          const videoId = extractYouTubeVideoId(url);
          if (videoId) {
            setDetectedYoutubeUrl(url);
            setShowYoutubePrompt(true);
          }
        }
      }
    }
  }, [content, youtubeVideoId]);

  // Detect social media embeds in content
  useEffect(() => {
    if (content && socialEmbeds.length === 0) {
      const plainText = content.replace(/<[^>]*>/g, ' '); // Strip HTML tags
      if (containsSocialMediaUrl(plainText)) {
        const detected = detectSocialEmbeds(plainText);
        if (detected.length > 0) {
          setDetectedSocialEmbeds(detected);
          setShowSocialPrompt(true);
        }
      }
    }
  }, [content, socialEmbeds.length]);

  // Detect Spotify embeds in content
  useEffect(() => {
    if (content && spotifyEmbeds.length === 0) {
      const plainText = content.replace(/<[^>]*>/g, ' ');
      if (containsSpotifyUrl(plainText)) {
        const detected = detectSpotifyEmbeds(plainText);
        if (detected.length > 0) {
          setDetectedSpotifyEmbeds(detected);
          setShowSpotifyPrompt(true);
        }
      }
    }
  }, [content, spotifyEmbeds.length]);

  const handleFileSelect = (acceptedTypes: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptedTypes;
    input.multiple = false; // Changed to single file for editing
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        const file = files[0];
        // Check if it's an image or video to open editor
        if (file.type.startsWith('image/')) {
          setEditingFile(file);
          setEditingFileType('image');
        } else if (file.type.startsWith('video/')) {
          setEditingFile(file);
          setEditingFileType('video');
        } else {
          // For documents, add directly
          handleFiles([file]);
        }
      }
    };
    input.click();
  };

  const handleEditorSave = (editedFile: File) => {
    handleFiles([editedFile]);
    setEditingFile(null);
    setEditingFileType(null);
  };

  const handleEditorClose = () => {
    setEditingFile(null);
    setEditingFileType(null);
  };

  const handleFiles = (files: File[]) => {
    // Validate each file
    for (const file of files) {
      const validation = validatePostMediaFile(file);
      if (!validation.valid) {
        toast({
          title: "Invalid file",
          description: validation.error,
          variant: "destructive"
        });
        return;
      }
    }

    const newFiles = [...uploadedFiles, ...files];
    setUploadedFiles(newFiles);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) return [];

    const uploadPromises = uploadedFiles.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        type: file.type.startsWith('image/') ? 'image' : 
              file.type.startsWith('video/') ? 'video' : 'document',
        name: file.name
      };
    });

    return await Promise.all(uploadPromises);
  };

  const handleAudienceSelect = (type: AudienceSelection['type']) => {
    setAudienceSelection({ type });
    localStorage.setItem('lastUsedAudience', type);
    setLastUsedAudience(type);
    setAudienceMenuOpen(true); // Keep menu open to show selection
  };

  const getAudienceLabel = () => {
    switch (audienceSelection.type) {
      case 'best_friends':
        return { icon: Heart, label: 'Best Friends' };
      case 'company_internal':
        return { icon: Building, label: companyName || 'Company' };
      case 'connections':
        return { icon: UserCircle, label: 'Connections' };
      case 'public':
        return { icon: Globe, label: 'Public' };
      default:
        return { icon: Heart, label: 'Best Friends' };
    }
  };

  const handleYouTubeSelect = (videoId: string, url: string) => {
    setYoutubeVideoId(videoId);
    setYoutubeUrl(url);
    setShowYoutubePrompt(false);
    setDetectedYoutubeUrl(null);
    setShowYoutubePicker(false);
  };

  const handleEmbedDetectedVideo = () => {
    if (detectedYoutubeUrl) {
      const videoId = extractYouTubeVideoId(detectedYoutubeUrl);
      if (videoId) {
        handleYouTubeSelect(videoId, detectedYoutubeUrl);
        // Remove ALL YouTube URLs from content
        const updatedContent = content.replace(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s]+/g, '').trim();
        setContent(updatedContent);
      }
    }
  };

  const handleDismissYoutubePrompt = () => {
    setShowYoutubePrompt(false);
    setDetectedYoutubeUrl(null);
  };

  const handleEmbedDetectedSocial = () => {
    if (detectedSocialEmbeds.length > 0) {
      setSocialEmbeds([...socialEmbeds, ...detectedSocialEmbeds]);
      // Get plain text content and remove social URLs
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      const updatedText = removeSocialMediaUrls(plainText);
      
      // Set the cleaned content
      setContent(updatedText);
      setShowSocialPrompt(false);
      setDetectedSocialEmbeds([]);
      toast({ title: "Social posts embedded", description: "URLs removed from post content" });
    }
  };

  const handleDismissSocialPrompt = () => {
    setShowSocialPrompt(false);
    setDetectedSocialEmbeds([]);
  };

  const removeSocialEmbed = (index: number) => {
    setSocialEmbeds(prev => prev.filter((_, i) => i !== index));
  };

  const handleEmbedDetectedSpotify = () => {
    if (detectedSpotifyEmbeds.length > 0) {
      setSpotifyEmbeds([...spotifyEmbeds, ...detectedSpotifyEmbeds]);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      const updatedText = removeSpotifyUrls(plainText);
      setContent(updatedText);
      setShowSpotifyPrompt(false);
      setDetectedSpotifyEmbeds([]);
      toast({ title: "Spotify content embedded", description: "URLs removed from post content" });
    }
  };

  const handleDismissSpotifyPrompt = () => {
    setShowSpotifyPrompt(false);
    setDetectedSpotifyEmbeds([]);
  };

  const removeSpotifyEmbed = (index: number) => {
    setSpotifyEmbeds(prev => prev.filter((_, i) => i !== index));
  };

  const handleLinkedInClick = () => {
    const url = prompt('Paste a LinkedIn post URL (e.g., https://linkedin.com/posts/...)');
    if (!url) return;
    
    if (url.includes('linkedin.com')) {
      const detected = detectSocialEmbeds(url);
      if (detected.length > 0 && detected[0].platform === 'linkedin') {
        setSocialEmbeds([...socialEmbeds, ...detected]);
        // Remove the URL from content if it exists
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (plainText.includes(url)) {
          const updatedText = removeSocialMediaUrls(plainText);
          setContent(updatedText);
          toast({ title: "LinkedIn post added", description: "URL removed from post content" });
        } else {
          toast({ title: "LinkedIn post added", description: "The post will be embedded" });
        }
      } else {
        toast({ 
          title: "Invalid LinkedIn URL", 
          description: "Please paste a valid LinkedIn post URL (must include /posts/ or /feed/update/)", 
          variant: "destructive" 
        });
      }
    } else {
      toast({ 
        title: "Not a LinkedIn URL", 
        description: "Please paste a LinkedIn post URL", 
        variant: "destructive" 
      });
    }
  };

  const handleTwitterClick = () => {
    const url = prompt('Paste an X (Twitter) post URL (e.g., https://x.com/user/status/...)');
    if (!url) return;
    
    if (url.includes('twitter.com') || url.includes('x.com')) {
      const detected = detectSocialEmbeds(url);
      if (detected.length > 0 && detected[0].platform === 'twitter') {
        setSocialEmbeds([...socialEmbeds, ...detected]);
        // Remove the URL from content if it exists
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (plainText.includes(url)) {
          const updatedText = removeSocialMediaUrls(plainText);
          setContent(updatedText);
          toast({ title: "X post added", description: "URL removed from post content" });
        } else {
          toast({ title: "X post added", description: "The post will be embedded" });
        }
      } else {
        toast({ 
          title: "Invalid X URL", 
          description: "Please paste a valid X/Twitter post URL (must include /status/)", 
          variant: "destructive" 
        });
      }
    } else {
      toast({ 
        title: "Not an X/Twitter URL", 
        description: "Please paste an X or Twitter post URL", 
        variant: "destructive" 
      });
    }
  };

  const handleInstagramClick = () => {
    const url = prompt('Paste an Instagram post URL (e.g., https://instagram.com/p/...)');
    if (!url) return;
    
    if (url.includes('instagram.com')) {
      const detected = detectSocialEmbeds(url);
      if (detected.length > 0 && detected[0].platform === 'instagram') {
        setSocialEmbeds([...socialEmbeds, ...detected]);
        // Remove the URL from content if it exists
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (plainText.includes(url)) {
          const updatedText = removeSocialMediaUrls(plainText);
          setContent(updatedText);
          toast({ title: "Instagram post added", description: "URL removed from post content" });
        } else {
          toast({ title: "Instagram post added", description: "The post will be embedded" });
        }
      } else {
        toast({ 
          title: "Invalid Instagram URL", 
          description: "Please paste a valid Instagram post URL (must include /p/, /reel/, or /tv/)", 
          variant: "destructive" 
        });
      }
    } else {
      toast({ 
        title: "Not an Instagram URL", 
        description: "Please paste an Instagram post URL", 
        variant: "destructive" 
      });
    }
  };

  const handlePost = async () => {
    if (!content.trim() || !user) return;

    setLoading(true);
    try {
      const mediaUrls = await uploadFiles();

      const postData: any = {
        user_id: user.id,
        content: content.trim(),
        media_urls: mediaUrls
      };

      // Add YouTube video if exists
      if (youtubeVideoId && youtubeUrl) {
        postData.media_urls = [
          ...mediaUrls,
          {
            url: youtubeUrl,
            type: 'youtube',
            videoId: youtubeVideoId
          }
        ];
      }

      // Add social embeds if exist
      if (socialEmbeds.length > 0) {
        postData.media_urls = [
          ...(postData.media_urls || mediaUrls),
          ...socialEmbeds.map(embed => ({
            url: embed.url,
            type: 'social_embed',
            platform: embed.platform,
            embedId: embed.id,
            username: embed.username
          }))
        ];
      }

      // Add Spotify embeds if exist
      if (spotifyEmbeds.length > 0) {
        postData.media_urls = [
          ...(postData.media_urls || mediaUrls),
          ...spotifyEmbeds.map(embed => ({
            url: embed.url,
            type: 'spotify',
            spotify_type: embed.type,
            spotify_id: embed.id
          }))
        ];
      }

      // Add poll data if exists
      if (pollData) {
        postData.poll_question = pollData.question;
        postData.poll_options = pollData.options;
      }

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert(postData)
        .select('id')
        .single();

      if (error) throw error;

      // Generate AI summary in background (don't wait for it)
      if (content.trim().length > 50 && newPost) {
        supabase.functions.invoke('generate-post-summary', {
          body: { postId: newPost.id, content: content.trim() }
        }).catch(err => console.error('Error generating summary:', err));
      }

      setContent("");
      setUploadedFiles([]);
      setPreviews([]);
      setPollData(null);
      setShowPollCreator(false);
      setYoutubeVideoId(null);
      setYoutubeUrl(null);
      setSocialEmbeds([]);
      setSpotifyEmbeds([]);
      toast({
        title: "Posted successfully",
        description: "Your post is now live on the feed."
      });
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Failed to post",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 w-full overflow-hidden">
      <div className="flex gap-3 w-full">
        <Avatar>
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback>
            {profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 max-w-full">
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="What do you want to talk about?"
            className="border-none"
            onYouTubeClick={() => setShowYoutubePicker(true)}
            onLinkedInClick={handleLinkedInClick}
            onTwitterClick={handleTwitterClick}
            onInstagramClick={handleInstagramClick}
          />

          {(previews.length > 0 || youtubeVideoId || socialEmbeds.length > 0 || spotifyEmbeds.length > 0) && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  {uploadedFiles[index].type.startsWith('image/') ? (
                    <img 
                      src={preview} 
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : uploadedFiles[index].type.startsWith('video/') ? (
                    <video 
                      src={preview}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        {uploadedFiles[index].name}
                      </span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {youtubeVideoId && (
                <div className="relative group col-span-2">
                  <div className="relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                      alt="YouTube video"
                      className="w-full aspect-video object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                        <Youtube className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      setYoutubeVideoId(null);
                      setYoutubeUrl(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {socialEmbeds.map((embed, index) => (
                <div key={`social-${index}`} className="relative group col-span-2">
                  <div className="relative rounded-lg overflow-hidden bg-muted border p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold capitalize">{embed.platform} Post</p>
                        {embed.username && (
                          <p className="text-sm text-muted-foreground mt-0.5">@{embed.username}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {embed.url.length > 50 ? `${embed.url.substring(0, 50)}...` : embed.url}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeSocialEmbed(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {spotifyEmbeds.map((embed, index) => (
                <div key={`spotify-${index}`} className="relative group col-span-2">
                  <div className="relative rounded-lg overflow-hidden bg-muted border p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold capitalize">Spotify {embed.type}</p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {embed.url.length > 50 ? `${embed.url.substring(0, 50)}...` : embed.url}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeSpotifyEmbed(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showPollCreator && (
            <div className="mt-3">
              <CreatePoll 
                onPollCreated={(data) => {
                  setPollData(data);
                  setShowPollCreator(false);
                  toast({ title: "Poll added to post" });
                }}
              />
            </div>
          )}

          {pollData && !showPollCreator && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{pollData.question}</p>
                  <p className="text-xs text-muted-foreground">
                    {pollData.options.length} options
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPollData(null);
                    setShowPollCreator(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* YouTube URL Detection Prompt */}
          {showYoutubePrompt && detectedYoutubeUrl && (
            <div className="mt-3 p-3 bg-accent/10 border border-accent rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                  <Youtube className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">YouTube link detected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Would you like to embed this video in your post?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleEmbedDetectedVideo}
                      className="gap-2"
                    >
                      <Youtube className="w-4 h-4" />
                      Embed Video
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismissYoutubePrompt}
                    >
                      Keep as Link
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Social Media Embed Detection Prompt */}
          {showSocialPrompt && detectedSocialEmbeds.length > 0 && (
            <div className="mt-3 p-3 bg-accent/10 border border-accent rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {detectedSocialEmbeds.length} social {detectedSocialEmbeds.length === 1 ? 'post' : 'posts'} detected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Found {detectedSocialEmbeds.map(e => e.platform).join(', ')} link(s). Embed in your post?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleEmbedDetectedSocial}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Embed {detectedSocialEmbeds.length} Post{detectedSocialEmbeds.length > 1 ? 's' : ''}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismissSocialPrompt}
                    >
                      Keep as Links
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Spotify Embed Detection Prompt */}
          {showSpotifyPrompt && detectedSpotifyEmbeds.length > 0 && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {detectedSpotifyEmbeds.length} Spotify {detectedSpotifyEmbeds.length === 1 ? 'link' : 'links'} detected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Found Spotify {detectedSpotifyEmbeds.map(e => e.type).join(', ')}. Embed in your post?
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleEmbedDetectedSpotify}
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Sparkles className="w-4 h-4" />
                      Embed {detectedSpotifyEmbeds.length} {detectedSpotifyEmbeds.length > 1 ? 'Items' : 'Item'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismissSpotifyPrompt}
                    >
                      Keep as Links
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-shrink">
              {/* Content add button with hover/click to expand */}
              <div 
                className="flex items-center gap-1"
                onMouseEnter={() => setContentMenuOpen(true)}
                onMouseLeave={() => {
                  if (!uploadedFiles.length) setContentMenuOpen(false);
                }}
              >
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-white/5 transition-all"
                  onClick={() => setContentMenuOpen(!contentMenuOpen)}
                  title="Add content"
                >
                  <Plus className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
                
                {/* Inline expandable options */}
                {(contentMenuOpen || uploadedFiles.length > 0) && (
                  <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                    {uploadedFiles.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-accent rounded h-9">
                        {uploadedFiles[0].type.startsWith('image/') && <Image className="w-4 h-4" />}
                        {uploadedFiles[0].type.startsWith('video/') && <Video className="w-4 h-4" />}
                        <span className="text-xs">{uploadedFiles.length}</span>
                      </div>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleFileSelect('image/*')}
                      disabled={loading}
                      className="gap-2 whitespace-nowrap h-9"
                    >
                      <Image className="w-4 h-4" />
                      Photo
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleFileSelect('video/*')}
                      disabled={loading}
                      className="gap-2 whitespace-nowrap h-9"
                    >
                      <Video className="w-4 h-4" />
                      Video
                    </Button>
                    
                    <div className="inline-block">
                      <YouTubePicker onSelect={handleYouTubeSelect} />
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowContentModal(true)}
                      className="gap-2 whitespace-nowrap h-9"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      More
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Audience selector with hover/click to expand */}
              <div 
                className="flex items-center gap-1"
                onMouseEnter={() => setAudienceMenuOpen(true)}
                onMouseLeave={() => setAudienceMenuOpen(false)}
              >
                {/* Inline expandable options - More button FIRST, then current selection */}
                {audienceMenuOpen && (
                  <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShowAudienceModal(true);
                        setAudienceMenuOpen(false);
                      }}
                      className="gap-2 whitespace-nowrap h-9 flex-shrink-0"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                      More
                    </Button>
                    
                    {(() => {
                      const { icon: Icon, label } = getAudienceLabel();
                      return (
                        <Button 
                          variant="default"
                          size="sm"
                          onClick={() => handleAudienceSelect(audienceSelection.type)}
                          className="gap-2 whitespace-nowrap h-9 flex-shrink-0"
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </Button>
                      );
                    })()}
                  </div>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 w-9 p-0 hover:bg-white/5 transition-all flex-shrink-0"
                  onClick={() => setAudienceMenuOpen(!audienceMenuOpen)}
                  title="Audience"
                >
                  <Users className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </div>
              
              <Button 
                onClick={handlePost}
                disabled={!content.trim() || loading}
                className="h-9 w-9 p-0 transition-all hover:w-auto hover:px-4 overflow-hidden group/post flex-shrink-0"
                title="Post"
              >
                <Send className="w-4 h-4 flex-shrink-0" />
                <span className="max-w-0 overflow-hidden group-hover/post:max-w-xs group-hover/post:ml-2 transition-all duration-300 whitespace-nowrap">
                  Post
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {editingFile && editingFileType === 'image' && (
        <MediaEditor
          file={editingFile}
          open={true}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
        />
      )}

      {editingFile && editingFileType === 'video' && (
        <VideoEditor
          file={editingFile}
          open={true}
          onClose={handleEditorClose}
          onSave={handleEditorSave}
        />
      )}

      <AudiencePickerModal
        isOpen={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        value={audienceSelection}
        onChange={(selection) => {
          setAudienceSelection(selection);
          localStorage.setItem('lastUsedAudience', selection.type);
          setLastUsedAudience(selection.type);
        }}
      />

      <ContentOptionsDialog
        open={showContentModal}
        onOpenChange={setShowContentModal}
        onPhotoSelect={() => handleFileSelect('image/*')}
        onVideoSelect={() => handleFileSelect('video/*')}
        onDocumentSelect={() => handleFileSelect('.pdf,.doc,.docx,.txt')}
        onPollSelect={() => setShowPollCreator(true)}
        disabled={loading}
      />

      {showYoutubePicker && (
        <Dialog open={showYoutubePicker} onOpenChange={setShowYoutubePicker}>
          <DialogContent className="sm:max-w-md p-0">
            <YouTubePickerDialog 
              onSelect={handleYouTubeSelect}
              onClose={() => setShowYoutubePicker(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}