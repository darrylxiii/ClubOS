import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Calendar, CheckCircle2, FileText, Download, Eye, X, Sparkles } from 'lucide-react';
import { SocialConnections } from '@/components/SocialConnections';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ConnectionsSettingsProps {
  socialConnections: any;
  musicConnections: any;
  onConnectSocial: (provider: string) => void;
  onDisconnectSocial: (platform: string) => void;
  onUpdate: () => void;
}

interface CalendarConnection {
  id: string;
  provider: 'google' | 'microsoft';
  email: string;
  label: string;
  token: string;
  connectedAt: string;
}

export const ConnectionsSettings = ({
  socialConnections,
  musicConnections,
  onConnectSocial,
  onDisconnectSocial,
  onUpdate
}: ConnectionsSettingsProps) => {
  const { user } = useAuth();
  const [userResumes, setUserResumes] = useState<Array<any>>([]);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeDisplayName, setResumeDisplayName] = useState('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewResumeUrl, setPreviewResumeUrl] = useState<string | null>(null);
  const [previewResumeName, setPreviewResumeName] = useState('');
  const [connectedCalendars, setConnectedCalendars] = useState<CalendarConnection[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    loadUserResumes();
    loadConnectedCalendars();
  }, [user]);

  const loadUserResumes = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_resumes')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error loading resumes:', error);
      return;
    }
    
    setUserResumes(data || []);
  };

  const loadConnectedCalendars = () => {
    const savedCalendars = localStorage.getItem('connected_calendars');
    if (savedCalendars) {
      try {
        const calendars = JSON.parse(savedCalendars) as CalendarConnection[];
        setConnectedCalendars(calendars);
      } catch (error) {
        console.error('Error parsing saved calendars:', error);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResumeFile(file);
      setResumeDisplayName(file.name.replace(/\.[^/.]+$/, ''));
      setShowResumeDialog(true);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile || !user || !resumeDisplayName.trim()) {
      toast.error('Please provide a name for your resume');
      return;
    }

    setIsUploadingResume(true);
    try {
      const fileExt = resumeFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, resumeFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('user_resumes')
        .insert({
          user_id: user.id,
          file_name: resumeFile.name,
          display_name: resumeDisplayName.trim(),
          file_path: fileName,
          file_size: resumeFile.size,
          mime_type: resumeFile.type,
          is_primary: userResumes.length === 0
        });

      if (dbError) throw dbError;

      toast.success('Resume uploaded successfully!');
      setShowResumeDialog(false);
      setResumeFile(null);
      setResumeDisplayName('');
      await loadUserResumes();
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleDeleteResume = async (resumeId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('user_resumes')
        .delete()
        .eq('id', resumeId);

      if (dbError) throw dbError;

      toast.success('Resume deleted successfully');
      await loadUserResumes();
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    }
  };

  const handleDownloadResume = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('resumes')
        .download(filePath);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download resume');
    }
  };

  const handlePreviewResume = async (filePath: string, fileName: string, mimeType: string) => {
    try {
      if (!mimeType.includes('pdf')) {
        toast.error('Only PDF files can be previewed. Please download to view.');
        return;
      }

      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      setPreviewResumeUrl(data.signedUrl);
      setPreviewResumeName(fileName);
      setShowPreviewDialog(true);
    } catch (error) {
      console.error('Error previewing resume:', error);
      toast.error('Failed to preview resume');
    }
  };

  const handleSetPrimaryResume = async (resumeId: string) => {
    try {
      await supabase
        .from('user_resumes')
        .update({ is_primary: false })
        .eq('user_id', user?.id);

      const { error } = await supabase
        .from('user_resumes')
        .update({ is_primary: true })
        .eq('id', resumeId);

      if (error) throw error;

      toast.success('Primary resume updated');
      await loadUserResumes();
    } catch (error) {
      console.error('Error setting primary resume:', error);
      toast.error('Failed to set primary resume');
    }
  };

  const handleConnectCalendar = (provider: 'google' | 'microsoft' | 'apple') => {
    if (provider === 'apple') {
      toast.info('Apple Calendar integration coming soon');
      return;
    }
    toast.info(`${provider} Calendar connection coming soon`);
  };

  const handleDisconnectCalendar = (calendarId: string) => {
    const updatedCalendars = connectedCalendars.filter(cal => cal.id !== calendarId);
    setConnectedCalendars(updatedCalendars);
    localStorage.setItem('connected_calendars', JSON.stringify(updatedCalendars));
    toast.success('Calendar disconnected');
  };

  return (
    <div className="space-y-4">
      <SocialConnections
        socialConnections={socialConnections}
        musicConnections={musicConnections}
        onUpdate={onUpdate}
        onConnectSocial={onConnectSocial}
        onDisconnectSocial={onDisconnectSocial}
      />

      {/* Resume/CV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Resume/CV
          </CardTitle>
          <CardDescription>Upload and manage your resumes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="resume-upload"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="resume-upload" className="cursor-pointer block p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
              <p className="text-sm font-medium mb-1">
                Click to upload new resume
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, or DOCX (Max 10MB)
              </p>
            </label>
          </div>

          {userResumes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Your Resumes</h4>
              {userResumes.map((resume) => (
                <div key={resume.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/30">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{resume.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(resume.file_size / 1024 / 1024).toFixed(2)} MB • 
                        {new Date(resume.uploaded_at).toLocaleDateString()}
                        {resume.is_primary && <span className="ml-2 text-primary">• Primary</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!resume.is_primary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSetPrimaryResume(resume.id)}
                        title="Set as primary"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePreviewResume(resume.file_path, resume.file_name, resume.mime_type)}
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadResume(resume.file_path, resume.file_name)}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteResume(resume.id, resume.file_path)}
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* The Quantum Club Resume */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            The Quantum Club Resume
          </CardTitle>
          <CardDescription>
            Create an AI-powered executive resume optimized for elite opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-6 border-2 border-primary/30 rounded-lg bg-primary/5">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Premium Resume Builder</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Our AI analyzes your experience and creates a tailored resume that highlights your executive presence and achievements for premium positions.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                    <li>✓ Executive-level formatting and tone</li>
                    <li>✓ ATS-optimized for top-tier recruiters</li>
                    <li>✓ Highlights leadership and strategic impact</li>
                    <li>✓ Multiple versions for different roles</li>
                  </ul>
                  <Button 
                    type="button"
                    disabled
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Coming Soon - Create TQC Resume
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This feature will be available soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Connect Your Calendars
          </CardTitle>
          <CardDescription>
            Link multiple calendars (personal + work accounts) to sync your availability and prevent scheduling conflicts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm mb-3">Currently Connected Calendars</h4>
            {connectedCalendars.length > 0 ? (
              <div className="space-y-2">
                {connectedCalendars.map((calendar) => (
                  <div
                    key={calendar.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">
                          {calendar.provider === 'google' ? 'Google' : 'Microsoft'} - {calendar.label}
                        </p>
                        <p className="text-sm text-muted-foreground">{calendar.email}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnectCalendar(calendar.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">No calendars connected yet</p>
                <p className="text-xs text-muted-foreground">
                  Connect your calendars to enable automatic scheduling and prevent conflicts
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm mb-3">
              {connectedCalendars.length > 0 ? 'Add Another Calendar' : 'Connect a Calendar'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                type="button"
                onClick={() => handleConnectCalendar('google')}
                disabled={calendarLoading}
                variant="outline"
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add Google Calendar
              </Button>
              <Button
                type="button"
                onClick={() => handleConnectCalendar('microsoft')}
                disabled={calendarLoading}
                variant="outline"
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add Microsoft Calendar
              </Button>
              <Button
                type="button"
                onClick={() => handleConnectCalendar('apple')}
                disabled={calendarLoading}
                variant="outline"
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add Apple Calendar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Resume</DialogTitle>
            <DialogDescription>
              Choose a descriptive name for your resume
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resume-name">Resume Name</Label>
              <Input
                id="resume-name"
                value={resumeDisplayName}
                onChange={(e) => setResumeDisplayName(e.target.value)}
                placeholder="e.g., Software Engineer Resume 2025"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResumeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadResume} disabled={isUploadingResume || !resumeDisplayName.trim()}>
              {isUploadingResume ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewResumeName}</DialogTitle>
          </DialogHeader>
          {previewResumeUrl && (
            <iframe
              src={previewResumeUrl}
              className="w-full h-full border-0"
              title="Resume Preview"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
