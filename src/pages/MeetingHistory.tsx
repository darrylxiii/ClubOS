import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Video, Calendar, Clock, Building2, Upload, Search, Filter, Play, Download, Trash2, Plus, AlertCircle, Settings, Sparkles, Eye } from "lucide-react";
import { InlineLoader } from "@/components/ui/unified-loader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MeetingAnalysisCard } from "@/components/MeetingAnalysisCard";
import { formatDate } from "@/lib/format";

interface MeetingRecording {
  id: string;
  title: string;
  description: string | null;
  company_name: string | null;
  position: string | null;
  meeting_date: string;
  duration_minutes: number | null;
  recording_url: string | null;
  thumbnail_url: string | null;
  meeting_type: string | null;
  participants: any;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  transcript: string | null;
  ai_analysis: any;
  follow_up_draft: string | null;
  analyzed_at: string | null;
  analysis_status: string;
}

const MeetingHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<MeetingRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasCalendarConnected, setHasCalendarConnected] = useState(false);
  const [analyzingRecording, setAnalyzingRecording] = useState<string | null>(null);
  const [selectedRecordingAnalysis, setSelectedRecordingAnalysis] = useState<MeetingRecording | null>(null);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    company_name: "",
    position: "",
    meeting_date: new Date().toISOString().split('T')[0],
    meeting_type: "technical",
    notes: "",
  });

  useEffect(() => {
    loadRecordings();

    // Check if calendar is connected
    const savedCalendars = localStorage.getItem('connected_calendars');
    if (savedCalendars) {
      try {
        const calendars = JSON.parse(savedCalendars);
        setHasCalendarConnected(Array.isArray(calendars) && calendars.length > 0);
      } catch (error) {
        console.error('Error parsing calendars:', error);
        setHasCalendarConnected(false);
      }
    }
  }, [user]);

  useEffect(() => {
    filterRecordings();
  }, [recordings, searchQuery, filterType]);

  const loadRecordings = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('meeting_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast.error('Failed to load meeting recordings');
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecordings = () => {
    let filtered = recordings;

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(r => r.meeting_type === filterType);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.company_name?.toLowerCase().includes(query) ||
        r.position?.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query)
      );
    }

    setFilteredRecordings(filtered);
  };

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
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-recordings')
        .getPublicUrl(fileName);

      setUploadProgress(80);

      // Create database record
      const { error: dbError } = await supabase
        .from('meeting_recordings')
        .insert({
          user_id: user.id,
          title: uploadForm.title,
          description: uploadForm.description,
          company_name: uploadForm.company_name,
          position: uploadForm.position,
          meeting_date: new Date(uploadForm.meeting_date).toISOString(),
          meeting_type: uploadForm.meeting_type,
          recording_url: publicUrl,
          notes: uploadForm.notes,
        });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast.success('Recording uploaded successfully!');
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadForm({
        title: "",
        description: "",
        company_name: "",
        position: "",
        meeting_date: new Date().toISOString().split('T')[0],
        meeting_type: "technical",
        notes: "",
      });
      loadRecordings();
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast.error('Failed to upload recording');
    } finally {
      setUploadProgress(0);
    }
  };

  const analyzeRecording = async (recordingId: string) => {
    try {
      setAnalyzingRecording(recordingId);
      toast.info('Starting AI analysis... This may take a few minutes.');

      const { error } = await supabase.functions.invoke('meeting-debrief', {
        body: { recordingId }
      });

      if (error) throw error;

      toast.success('Analysis completed successfully!');
      loadRecordings();
    } catch (error) {
      console.error('Error analyzing recording:', error);
      toast.error('Failed to analyze recording. Please try again.');
    } finally {
      setAnalyzingRecording(null);
    }
  };

  const viewAnalysis = (recording: MeetingRecording) => {
    setSelectedRecordingAnalysis(recording);
    setIsAnalysisDialogOpen(true);
  };

  const deleteRecording = async (id: string, recordingUrl: string | null) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      // Delete from storage if URL exists
      if (recordingUrl) {
        const path = recordingUrl.split('/meeting-recordings/')[1];
        if (path) {
          await supabase.storage
            .from('meeting-recordings')
            .remove([path]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('meeting_recordings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Recording deleted successfully');
      loadRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };

  // WS-5: Using centralized formatDate from @/lib/format

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getMeetingTypeColor = (type: string | null) => {
    switch (type) {
      case 'screening': return 'bg-blue-500';
      case 'technical': return 'bg-purple-500';
      case 'behavioral': return 'bg-green-500';
      case 'final': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Meeting Recordings</h1>
          <p className="text-muted-foreground">
            Access and review all your interview recordings in one place
          </p>
        </div>

        {/* Calendar Integration Warning */}
        {!hasCalendarConnected && (
          <Alert className="mb-6 border-accent/50 bg-accent/5">
            <AlertCircle className="h-5 w-5 text-accent" />
            <AlertTitle className="text-lg font-bold">Calendar Integration Not Connected</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p className="text-muted-foreground">
                Connect your calendar to automatically capture all online meetings here.
                Once linked, all interview meetings will be automatically recorded and saved to this repository.
              </p>
              <Button
                onClick={() => navigate("/profile")}
                variant="default"
                size="sm"
                className="mt-2"
              >
                <Settings className="w-4 h-4 mr-2" />
                Connect Calendar in Profile
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters and Search */}
        <Card className="border-0 bg-card/30 backdrop-blur-md mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, company, or position..."
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
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="final">Final Round</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-accent text-background">
                      <Plus className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Upload Meeting Recording</DialogTitle>
                      <DialogDescription>
                        Add a new interview recording to your library
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
                          Supported formats: MP4, WebM, QuickTime, MP3, WAV (Max 500MB)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="title">Title *</Label>
                          <Input
                            id="title"
                            value={uploadForm.title}
                            onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                            placeholder="e.g., Technical Interview with Google"
                          />
                        </div>
                        <div>
                          <Label htmlFor="meeting_date">Meeting Date</Label>
                          <Input
                            id="meeting_date"
                            type="date"
                            value={uploadForm.meeting_date}
                            onChange={(e) => setUploadForm({ ...uploadForm, meeting_date: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="company_name">Company</Label>
                          <Input
                            id="company_name"
                            value={uploadForm.company_name}
                            onChange={(e) => setUploadForm({ ...uploadForm, company_name: e.target.value })}
                            placeholder="e.g., Google"
                          />
                        </div>
                        <div>
                          <Label htmlFor="position">Position</Label>
                          <Input
                            id="position"
                            value={uploadForm.position}
                            onChange={(e) => setUploadForm({ ...uploadForm, position: e.target.value })}
                            placeholder="e.g., Senior Software Engineer"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="meeting_type">Interview Type</Label>
                        <Select
                          value={uploadForm.meeting_type}
                          onValueChange={(value) => setUploadForm({ ...uploadForm, meeting_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="screening">Screening</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="behavioral">Behavioral</SelectItem>
                            <SelectItem value="final">Final Round</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={uploadForm.description}
                          onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                          placeholder="Brief description of the interview..."
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={uploadForm.notes}
                          onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                          placeholder="Any additional notes or observations..."
                          rows={3}
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
                              className="bg-accent h-2 rounded-full transition-all"
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
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Recording
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recordings Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading recordings...</p>
          </div>
        ) : filteredRecordings.length === 0 ? (
          <Card className="border-0 bg-card/30 backdrop-blur-md">
            <CardContent className="text-center py-12">
              <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Recordings Yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterType !== "all"
                  ? "No recordings match your search criteria"
                  : "Upload your first interview recording to get started"}
              </p>
              <Button onClick={() => setIsUploadOpen(true)} className="bg-gradient-accent text-background">
                <Plus className="w-4 h-4 mr-2" />
                Upload Recording
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecordings.map((recording) => (
              <Card key={recording.id} className="border-0 bg-card/30 backdrop-blur-md overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  {recording.thumbnail_url ? (
                    <img src={recording.thumbnail_url} alt={recording.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  {recording.meeting_type && (
                    <Badge className={`absolute top-2 right-2 ${getMeetingTypeColor(recording.meeting_type)}`}>
                      {recording.meeting_type}
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{recording.title}</CardTitle>
                  {recording.company_name && (
                    <CardDescription className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {recording.company_name}
                      {recording.position && ` - ${recording.position}`}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {recording.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {recording.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(recording.meeting_date)}
                    </div>
                    {recording.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.duration_minutes)}
                      </div>
                    )}
                  </div>

                  {recording.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold mb-1">Notes:</p>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {recording.notes}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2">
                    {recording.recording_url && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(recording.recording_url!, '_blank')}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = recording.recording_url!;
                            link.download = recording.title;
                            link.click();
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Analysis Section */}
                  <div className="space-y-2">
                    {recording.analysis_status === 'completed' && recording.ai_analysis ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full"
                        onClick={() => viewAnalysis(recording)}
                      >
                        <Eye className="w-3 h-3 mr-2" />
                        View AI Analysis
                      </Button>
                    ) : recording.analysis_status === 'processing' || analyzingRecording === recording.id ? (
                      <Button size="sm" variant="secondary" className="w-full" disabled>
                        <InlineLoader />
                        Analyzing...
                      </Button>
                    ) : recording.analysis_status === 'failed' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-orange-500 border-orange-500/50"
                        onClick={() => analyzeRecording(recording.id)}
                      >
                        <Sparkles className="w-3 h-3 mr-2" />
                        Retry Analysis
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => analyzeRecording(recording.id)}
                        disabled={!recording.recording_url}
                      >
                        <Sparkles className="w-3 h-3 mr-2" />
                        Analyze with AI
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-destructive"
                      onClick={() => deleteRecording(recording.id, recording.recording_url)}
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Analysis Dialog */}
        <Dialog open={isAnalysisDialogOpen} onOpenChange={setIsAnalysisDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedRecordingAnalysis?.title}</DialogTitle>
              <DialogDescription>
                AI-powered interview debrief and analysis
              </DialogDescription>
            </DialogHeader>
            {selectedRecordingAnalysis?.ai_analysis && (
              <MeetingAnalysisCard
                analysis={selectedRecordingAnalysis.ai_analysis}
                transcript={selectedRecordingAnalysis.transcript || undefined}
                analyzedAt={selectedRecordingAnalysis.analyzed_at || new Date().toISOString()}
                tasksCreated={selectedRecordingAnalysis.ai_analysis.actionItems?.length}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default MeetingHistory;
