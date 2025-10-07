import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, Video, FileText, Send, X, BarChart2, Plus } from "lucide-react";
import { CreatePoll } from "./PollPost";
import { toast } from "@/hooks/use-toast";
import { MediaEditor } from "./MediaEditor";
import { VideoEditor } from "./VideoEditor";
import { AudienceSelection } from "@/components/audience/AudiencePickerButton";
import { AudiencePickerCollapsible } from "@/components/audience/AudiencePickerCollapsible";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    type: 'connections',
  });
  const [contentMenuOpen, setContentMenuOpen] = useState(false);
  const [audienceMenuOpen, setAudienceMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data));
    }
  }, [user]);

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

      // Save audience settings
      if (newPost) {
        await (supabase as any).from('post_audience_settings').insert({
          post_id: newPost.id,
          post_type: 'user_post',
          audience_type: audienceSelection.type,
          custom_list_ids: audienceSelection.customListIds || [],
          allow_company_internal: audienceSelection.multiSelect?.company || false,
          allow_connections: audienceSelection.multiSelect?.connections || false,
          allow_best_friends: audienceSelection.multiSelect?.bestFriends || false,
          allow_public: audienceSelection.type === 'public',
        });
      }

      setContent("");
      setUploadedFiles([]);
      setPreviews([]);
      setPollData(null);
      setShowPollCreator(false);
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
    <Card className="p-4">
      <div className="flex gap-3">
        <Avatar>
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback>
            {profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <Textarea
            placeholder="What do you want to talk about?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] border-none focus-visible:ring-0 resize-none"
          />

          {previews.length > 0 && (
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
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(index)}
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
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Collapsible open={contentMenuOpen} onOpenChange={setContentMenuOpen}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="group relative h-9 w-9 p-0 hover:bg-white/5"
                    title="Add content"
                  >
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      Add content
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="absolute mt-2 z-50">
                  <div className="flex flex-col gap-1 bg-popover border border-border rounded-lg p-1 shadow-lg min-w-[160px]">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        handleFileSelect('image/*');
                        setContentMenuOpen(false);
                      }}
                      disabled={loading}
                      className="justify-start gap-2"
                    >
                      <Image className="w-4 h-4" />
                      Photo
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        handleFileSelect('video/*');
                        setContentMenuOpen(false);
                      }}
                      disabled={loading}
                      className="justify-start gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Video
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        handleFileSelect('.pdf,.doc,.docx,.txt');
                        setContentMenuOpen(false);
                      }}
                      disabled={loading}
                      className="justify-start gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Document
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShowPollCreator(!showPollCreator);
                        setContentMenuOpen(false);
                      }}
                      disabled={loading}
                      className="justify-start gap-2"
                    >
                      <BarChart2 className="w-4 h-4" />
                      Poll
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            <div className="flex items-center gap-2 relative">
              <AudiencePickerCollapsible
                value={audienceSelection}
                onChange={setAudienceSelection}
                open={audienceMenuOpen}
                onOpenChange={setAudienceMenuOpen}
              />
              <Button 
                onClick={handlePost}
                disabled={!content.trim() || loading}
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Post
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
    </Card>
  );
}