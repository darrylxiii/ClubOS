import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Search, Filter, Plus, AlertCircle, Settings, Loader2, Video, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMeetingRecordings } from "@/hooks/useMeetingRecordings";
import { MeetingRecordingCard } from "@/components/meetings/MeetingRecordingCard";
import { Skeleton } from "@/components/ui/skeleton";

export function MeetingHistoryTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Use the new hook for real data
  const { recordings, isLoading, error, deleteRecording, refresh } = useMeetingRecordings({
    sourceType: filterType === 'all' ? 'all' : filterType as any,
    limit: 50
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_type: "interview",
  });

  // Filter recordings by search
  const filteredRecordings = recordings.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const title = r.title || r.meeting?.title || '';
    return (
      title.toLowerCase().includes(query) ||
      r.executive_summary?.toLowerCase().includes(query) ||
      r.transcript?.toLowerCase().includes(query)
    );
  });

  const handleFileUpload = async () => {
    if (!user || !uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!uploadForm.title) {
      toast.error('Please enter a title for the recording');
      return;
    }

    try {
      setUploadProgress(10);
      
      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `manual-upload-${Date.now()}.${fileExt}`;
      const filePath = `manual/${user.id}/${fileName}`;
      
      setUploadProgress(30);
      
      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(filePath);

      setUploadProgress(80);

      // Create database record in new table
      const { error: dbError } = await supabase
        .from('meeting_recordings_extended')
        .insert({
          host_id: user.id,
          title: uploadForm.title,
          recording_url: publicUrl,
          storage_path: filePath,
          file_size_bytes: uploadFile.size,
          source_type: 'tqc_meeting',
          processing_status: 'pending',
          recorded_at: new Date(uploadForm.meeting_date).toISOString()
        });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast.success('Recording uploaded successfully!');
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadForm({
        title: "",
        description: "",
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_type: "interview",
      });
      refresh();
    } catch (err) {
      console.error('Error uploading recording:', err);
      toast.error('Failed to upload recording');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleDeleteRecording = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;
    
    const success = await deleteRecording(id);
    if (success) {
      toast.success('Recording deleted');
    } else {
      toast.error('Failed to delete recording');
    }
  };

  const handleDownloadRecording = (recording: any) => {
    if (recording.recording_url) {
      window.open(recording.recording_url, '_blank');
    }
  };

  // Check if calendar is connected
  const hasCalendarConnected = (() => {
    const savedCalendars = localStorage.getItem('connected_calendars');
    if (savedCalendars) {
      try {
        const calendars = JSON.parse(savedCalendars);
        return Array.isArray(calendars) && calendars.length > 0;
      } catch {
        return false;
      }
    }
    return false;
  })();

  return (
    <div className="space-y-6">
      {/* Calendar Integration Notice */}
      {!hasCalendarConnected && (
        <Alert className="border-accent/50 bg-accent/5">
          <AlertCircle className="h-5 w-5 text-accent" />
          <AlertTitle className="text-lg font-bold">Automatic Recording Enabled</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p className="text-muted-foreground">
              All TQC Meetings are automatically recorded and analyzed by Club AI. 
              Connect your calendar to also sync external meeting recordings.
            </p>
            <Button 
              onClick={() => navigate("/profile")}
              variant="outline"
              size="sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              Connect Calendar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <Card className="border-0 bg-card/30 backdrop-blur-md">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recordings by title, transcript, or summary..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="tqc_meeting">TQC Meetings</SelectItem>
                  <SelectItem value="live_hub">Live Hub</SelectItem>
                  <SelectItem value="conversation_call">Calls</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-accent text-background">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Upload Meeting Recording</DialogTitle>
                    <DialogDescription>
                      Add an external recording to your library
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file">Recording File</Label>
                      <Input
                        id="file"
                        type="file"
                        accept="video/*,audio/*"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported: MP4, WebM, MP3, WAV (Max 500MB)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                        placeholder="e.g., Interview with John Doe"
                      />
                    </div>

                    <div>
                      <Label htmlFor="meeting_date">Recording Date</Label>
                      <Input
                        id="meeting_date"
                        type="date"
                        value={uploadForm.meeting_date}
                        onChange={(e) => setUploadForm({ ...uploadForm, meeting_date: e.target.value })}
                      />
                    </div>

                    {uploadProgress > 0 && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-gradient-accent h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleFileUpload}
                      disabled={!uploadFile || uploadProgress > 0}
                      className="w-full"
                    >
                      {uploadProgress > 0 ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload Recording'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recordings List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="w-32 h-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Recordings</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={refresh}>Try Again</Button>
        </Card>
      ) : filteredRecordings.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Recordings Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {searchQuery 
              ? "No recordings match your search. Try different keywords."
              : "Your TQC meeting recordings will appear here automatically. You can also upload external recordings."}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" onClick={() => navigate('/meetings')}>
              <Video className="w-4 h-4 mr-2" />
              Start a Meeting
            </Button>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Recording
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecordings.map((recording) => (
            <MeetingRecordingCard
              key={recording.id}
              recording={recording}
              onDelete={handleDeleteRecording}
              onDownload={handleDownloadRecording}
            />
          ))}
        </div>
      )}
    </div>
  );
}
