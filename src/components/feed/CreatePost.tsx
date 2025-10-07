import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Image, Video, FileText, Send, X, BarChart2 } from "lucide-react";
import { CreatePoll } from "./PollPost";
import { toast } from "@/hooks/use-toast";
import { MediaEditor } from "./MediaEditor";
import { VideoEditor } from "./VideoEditor";

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

      const { error } = await supabase
        .from('posts')
        .insert(postData);

      if (error) throw error;

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
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleFileSelect('image/*')}
                disabled={loading}
              >
                <Image className="w-4 h-4 mr-2" />
                Photo
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleFileSelect('video/*')}
                disabled={loading}
              >
                <Video className="w-4 h-4 mr-2" />
                Video
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleFileSelect('.pdf,.doc,.docx,.txt')}
                disabled={loading}
              >
                <FileText className="w-4 h-4 mr-2" />
                Document
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowPollCreator(!showPollCreator)}
                disabled={loading}
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                Poll
              </Button>
            </div>
            
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