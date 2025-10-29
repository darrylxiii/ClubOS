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

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    // Handle OAuth errors
    if (error) {
      const pendingConnection = localStorage.getItem('pending_calendar_connection');
      if (pendingConnection) {
        const { provider } = JSON.parse(pendingConnection);
        const providerName = provider === 'google' ? 'Google' : 'Microsoft';
        
        let errorMessage = `${providerName} Calendar connection failed`;
        if (error === 'access_denied') {
          errorMessage = `You denied access to ${providerName} Calendar`;
        } else if (errorDescription) {
          errorMessage = `${providerName} Calendar: ${errorDescription}`;
        }
        
        toast.error(errorMessage);
        localStorage.removeItem('pending_calendar_connection');
        window.history.replaceState({}, document.title, '/settings');
      }
      return;
    }
    
    if (code) {
      (async () => {
        try {
          const pendingConnection = localStorage.getItem('pending_calendar_connection');
          if (pendingConnection) {
            const { provider, label } = JSON.parse(pendingConnection);
            const redirectUri = `${window.location.origin}/settings`;
            
            let token: string;
            let email: string = 'Calendar Account';

            if (provider === 'google') {
              // Get current session token
              const { data: { session } } = await supabase.auth.getSession();
              
              const { data, error: invocationError } = await supabase.functions.invoke('google-calendar-auth', {
                body: { action: 'exchangeCode', code, redirectUri },
                headers: {
                  Authorization: `Bearer ${session?.access_token}`
                }
              });

              if (invocationError) {
                console.error('Google Calendar auth error:', invocationError);
                
                let errorMsg = invocationError.message || 'Failed to authenticate with Google Calendar';
                
                // Provide specific guidance for common errors
                if (errorMsg.includes('403') || errorMsg.includes('access_denied')) {
                  errorMsg = `Access denied by Google. Common causes:\n\n` +
                    `1. Your email is not added as a test user in Google Cloud Console\n` +
                    `2. OAuth consent screen is not configured\n` +
                    `3. App is not published or in testing mode\n\n` +
                    `Fix: Go to Google Cloud Console → OAuth consent screen → Add your email as test user`;
                } else if (errorMsg.includes('redirect_uri')) {
                  errorMsg = `Redirect URI mismatch.\n\n` +
                    `Required URI: ${window.location.origin}/settings\n\n` +
                    `Add this to: Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs`;
                }
                
                throw new Error(errorMsg);
              }
              
              if (data?.error) {
                console.error('Google Calendar response error:', data);
                
                // Show detailed error with instructions
                let errorMsg = data.error;
                if (data.redirectUri && errorMsg.includes('redirect URI')) {
                  errorMsg += `\n\nPlease ensure this URL is added to your Google Cloud Console:\n${data.redirectUri}\n\nGo to: APIs & Services → Credentials → Your OAuth 2.0 Client → Authorized redirect URIs`;
                }
                
                throw new Error(errorMsg);
              }
              
              token = data.tokens.access_token;
              
              // Try to get user email from Google
              try {
                const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: { Authorization: `Bearer ${token}` }
                });
                const userInfo = await userInfoResponse.json();
                email = userInfo.email || email;
              } catch (e) {
                console.log('Could not fetch user email');
              }
            } else {
              // Get current session token
              const { data: { session } } = await supabase.auth.getSession();
              
              const { data, error: invocationError } = await supabase.functions.invoke('microsoft-calendar-auth', {
                body: { action: 'exchangeCode', code, redirectUri },
                headers: {
                  Authorization: `Bearer ${session?.access_token}`
                }
              });

              if (invocationError) {
                console.error('Microsoft Calendar auth error:', invocationError);
                throw new Error(invocationError.message || 'Failed to authenticate with Microsoft Calendar');
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              token = data.access_token;
              
              // Try to get user email from Microsoft
              try {
                const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                  headers: { Authorization: `Bearer ${token}` }
                });
                const userInfo = await userInfoResponse.json();
                email = userInfo.mail || userInfo.userPrincipalName || email;
              } catch (e) {
                console.log('Could not fetch user email');
              }
            }

            // Create new calendar connection
            const newConnection: CalendarConnection = {
              id: `${provider}-${Date.now()}`,
              provider,
              email,
              label,
              token,
              connectedAt: new Date().toISOString(),
            };

            const updatedCalendars = [...connectedCalendars, newConnection];
            setConnectedCalendars(updatedCalendars);
            localStorage.setItem('connected_calendars', JSON.stringify(updatedCalendars));
            localStorage.removeItem('pending_calendar_connection');
            
            // Clean up URL
            window.history.replaceState({}, document.title, '/settings');
            
            toast.success(`${provider === 'google' ? 'Google' : 'Microsoft'} Calendar "${label}" connected successfully!`);
          }
        } catch (error) {
          console.error('Calendar OAuth error:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to connect calendar');
          localStorage.removeItem('pending_calendar_connection');
          window.history.replaceState({}, document.title, '/settings');
        }
      })();
    }
  }, [connectedCalendars]);

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

  const handleConnectCalendar = async (provider: 'google' | 'microsoft' | 'apple') => {
    // Apple Calendar support coming soon
    if (provider === 'apple') {
      toast.info('Apple Calendar integration coming soon', {
        description: 'We\'re working on adding Apple Calendar support. Use Google or Microsoft Calendar for now.'
      });
      return;
    }

    // Show setup instructions for Google Calendar
    if (provider === 'google') {
      const showInstructions = await new Promise<boolean>((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
          <div class="bg-background border rounded-lg p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-semibold mb-3">Google Calendar Setup Required</h3>
            <div class="text-sm space-y-3 mb-4">
              <p class="text-muted-foreground">Before connecting, ensure your Google Cloud Console is configured:</p>
              
              <div class="bg-accent/50 p-4 rounded-md space-y-2">
                <p class="font-medium">1. OAuth Consent Screen</p>
                <ul class="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-xs">
                  <li><strong>User Type:</strong> External (for testing) or Internal (for organization)</li>
                  <li><strong>Test Users:</strong> Add your email if app is in testing mode</li>
                  <li><strong>Publishing Status:</strong> Must be "Testing" or "Published"</li>
                </ul>
              </div>

              <div class="bg-accent/50 p-4 rounded-md space-y-2">
                <p class="font-medium">2. Authorized Redirect URI</p>
                <p class="text-muted-foreground text-xs">Add this exact URL to your OAuth 2.0 Client:</p>
                <code class="block bg-background p-2 rounded text-xs mt-2 break-all font-mono">${window.location.origin}/settings</code>
              </div>

              <div class="bg-accent/50 p-4 rounded-md space-y-2">
                <p class="font-medium">3. Required Scopes</p>
                <ul class="list-disc list-inside space-y-1 text-muted-foreground ml-2 text-xs">
                  <li>https://www.googleapis.com/auth/calendar</li>
                  <li>https://www.googleapis.com/auth/calendar.events</li>
                </ul>
              </div>

              <div class="bg-amber-500/10 border border-amber-500/20 p-3 rounded-md">
                <p class="text-sm font-medium text-amber-600 dark:text-amber-400">⚠️ Common 403 Errors:</p>
                <ul class="list-disc list-inside text-xs text-muted-foreground ml-2 mt-1 space-y-1">
                  <li>App in testing mode but your email not added to test users</li>
                  <li>Redirect URI not added to authorized URIs list</li>
                  <li>OAuth consent screen not configured properly</li>
                </ul>
              </div>
            </div>
            
            <div class="flex gap-2 justify-end">
              <button id="cancel-setup-btn" class="px-4 py-2 rounded-md border hover:bg-accent text-sm">Cancel</button>
              <button id="continue-setup-btn" class="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm">I've Configured This</button>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        const cancelBtn = modal.querySelector('#cancel-setup-btn') as HTMLButtonElement;
        const continueBtn = modal.querySelector('#continue-setup-btn') as HTMLButtonElement;

        const cleanup = () => {
          document.body.removeChild(modal);
        };

        cancelBtn.onclick = () => {
          cleanup();
          resolve(false);
        };

        continueBtn.onclick = () => {
          cleanup();
          resolve(true);
        };
      });

      if (!showInstructions) {
        return;
      }
    }
    
    // Use a custom input dialog
    const label = await new Promise<string | null>((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      dialog.innerHTML = `
        <div class="bg-background border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold mb-2">Name Your Calendar</h3>
          <p class="text-sm text-muted-foreground mb-4">Choose a name for this ${provider === 'google' ? 'Google' : 'Microsoft'} Calendar connection</p>
          <input 
            type="text" 
            id="calendar-label-input"
            placeholder="e.g., Personal Calendar, Work Calendar"
            class="w-full px-3 py-2 border rounded-md mb-4"
          />
          <div class="flex gap-2 justify-end">
            <button id="cancel-btn" class="px-4 py-2 border rounded-md hover:bg-accent">Cancel</button>
            <button id="connect-btn" class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Connect</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      const input = dialog.querySelector('#calendar-label-input') as HTMLInputElement;
      const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
      const connectBtn = dialog.querySelector('#connect-btn') as HTMLButtonElement;
      
      input.focus();
      
      const cleanup = () => document.body.removeChild(dialog);
      
      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };
      
      connectBtn.onclick = () => {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      };
      
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          const value = input.value.trim();
          cleanup();
          resolve(value || null);
        } else if (e.key === 'Escape') {
          cleanup();
          resolve(null);
        }
      };
    });
    
    if (!label) {
      toast.error('Calendar connection cancelled');
      return;
    }

    try {
      setCalendarLoading(true);
      
      const redirectUri = `${window.location.origin}/settings`;
      console.log(`[Calendar] Connecting ${provider} with redirect URI:`, redirectUri);
      
      const functionName = provider === 'google' ? 'google-calendar-auth' : 'microsoft-calendar-auth';
      
      // Store the label and provider for after OAuth redirect
      localStorage.setItem('pending_calendar_connection', JSON.stringify({ 
        provider, 
        label: label.trim() 
      }));
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'getAuthUrl', redirectUri }
      });

      if (error) {
        console.error(`[Calendar] ${provider} auth error:`, error);
        throw error;
      }
      
      if (!data || !data.authUrl) {
        console.error(`[Calendar] No auth URL returned from ${provider}`);
        throw new Error('No authentication URL received');
      }

      console.log(`[Calendar] Redirecting to ${provider} OAuth...`);
      // Redirect to OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error(`[Calendar] ${provider} Calendar connection error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Show detailed error with better formatting
      const isRedirectError = errorMessage.includes('redirect URI');
      toast.error(
        `Failed to connect ${provider === 'google' ? 'Google' : 'Microsoft'} Calendar`,
        {
          description: errorMessage,
          duration: isRedirectError ? 10000 : 5000
        }
      );
      localStorage.removeItem('pending_calendar_connection');
    } finally {
      setCalendarLoading(false);
    }
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
