import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, Video, FileText, Send, X, BarChart2, Plus, Users, Globe, UserCircle, Building, Heart, MoreHorizontal } from "lucide-react";
import { CreatePoll } from "./PollPost";
import { toast } from "@/hooks/use-toast";
import { MediaEditor } from "./MediaEditor";
import { VideoEditor } from "./VideoEditor";
import { AudienceSelection } from "@/components/audience/AudiencePickerButton";
import { AudiencePickerModal } from "@/components/audience/AudiencePickerModal";
import { ContentOptionsDialog } from "./ContentOptionsDialog";
import { RichTextEditor } from "./RichTextEditor";

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

  const handleAudienceSelect = (type: AudienceSelection['type']) => {
    setAudienceSelection({ type });
    localStorage.setItem('lastUsedAudience', type);
    setLastUsedAudience(type);
    setAudienceMenuOpen(true); // Keep menu open to show selection
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
                onMouseLeave={() => {
                  if (audienceSelection.type === 'best_friends' && !lastUsedAudience) {
                    setAudienceMenuOpen(false);
                  }
                }}
              >
                {/* Inline expandable options - More button FIRST */}
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
                    
                    {/* Only show Best Friends if selected or on hover - CONDITIONAL */}
                    {audienceSelection.type === 'best_friends' && (
                      <Button 
                        variant="default"
                        size="sm"
                        onClick={() => handleAudienceSelect('best_friends')}
                        className="gap-2 whitespace-nowrap h-9 flex-shrink-0 hidden lg:flex"
                      >
                        <Heart className="w-4 h-4" />
                        Best Friends
                      </Button>
                    )}
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
    </Card>
  );
}