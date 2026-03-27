import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Calendar, CheckCircle2, FileText, Download, Eye, X, Sparkles } from 'lucide-react';
import { SocialConnections } from '@/components/SocialConnections';
import { EmailConnections } from '@/components/settings/EmailConnections';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useResumeUpload } from '@/hooks/useResumeUpload';

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

interface EmailConnection {
  id: string;
  provider: 'gmail' | 'outlook' | 'private';
  email: string;
  label: string;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  scopes?: string[];
}

export const ConnectionsSettings = ({
  socialConnections,
  musicConnections,
  onConnectSocial,
  onDisconnectSocial,
  onUpdate
}: ConnectionsSettingsProps) => {
  const { t } = useTranslation('settings');
  const { user } = useAuth();
  const location = useLocation();
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
  const [oauthProcessing, setOauthProcessing] = useState(false);
  const [emailConnections, setEmailConnections] = useState<EmailConnection[]>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailLabelDialog, setShowEmailLabelDialog] = useState(false);
  const [pendingEmailProvider, setPendingEmailProvider] = useState<'gmail' | 'outlook' | null>(null);
  const [emailLabel, setEmailLabel] = useState('');
  
  const { uploadResume, isUploading: isUploadingResumeHook, validateFile } = useResumeUpload();

  useEffect(() => {
    loadUserResumes();
    loadConnectedCalendars();
    loadConnectedEmails();
    
    // Handle OAuth callback immediately on mount if code is present
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (code || error) {
      handleOAuthCallback(code, error, urlParams.get('error_description'));
    }
  }, [user]);

  const handleOAuthCallback = async (code: string | null, error: string | null, errorDescription: string | null) => {
    // Check which type of connection is pending
    const pendingCalendar = localStorage.getItem('pending_calendar_connection');
    const pendingEmail = localStorage.getItem('pending_email_connection');
    
    // Handle OAuth errors
    if (error) {
      if (pendingCalendar) {
        const { provider } = JSON.parse(pendingCalendar);
        const providerName = provider === 'google' ? t('settings.connectionssettings.google', 'Google') : t('settings.connectionssettings.microsoft', 'Microsoft');
        
        let errorMessage = `${providerName} Calendar connection failed`;
        if (error === 'access_denied') {
          errorMessage = `You denied access to ${providerName} Calendar`;
        } else if (errorDescription) {
          errorMessage = `${providerName} Calendar: ${errorDescription}`;
        }
        
        toast.error(errorMessage);
        localStorage.removeItem('pending_calendar_connection');
      } else if (pendingEmail) {
        const { provider } = JSON.parse(pendingEmail);
        const providerName = provider === 'gmail' ? t('settings.connectionssettings.gmail', 'Gmail') : t('settings.connectionssettings.outlook', 'Outlook');
        
        let errorMessage = `${providerName} connection failed`;
        if (error === 'access_denied') {
          errorMessage = `You denied access to ${providerName}`;
        } else if (errorDescription) {
          errorMessage = `${providerName}: ${errorDescription}`;
        }
        
        toast.error(errorMessage);
        localStorage.removeItem('pending_email_connection');
      }
      
      localStorage.removeItem('oauth_return_tab');
      window.history.replaceState({}, document.title, '/settings');
      return;
    }
    
    // Process OAuth success
    if (!code || !user) {
      return;
    }

    setOauthProcessing(true);
    
    try {
      const redirectUri = `${window.location.origin}/settings`;
      
      // Handle Calendar OAuth
      if (pendingCalendar) {
        const { provider, label } = JSON.parse(pendingCalendar);
        
        
        if (provider === 'google') {
          
          
          const { data, error: funcError } = await supabase.functions.invoke('google-calendar-auth', {
            body: { action: 'exchangeCode', code, redirectUri },
          });

          if (funcError || !data?.tokens) {
            throw new Error('Failed to receive authentication tokens from Google');
          }

          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${data.tokens.access_token}` },
          });

          if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info from Google');
          }

          const userInfo = await userInfoResponse.json();

          const { error: dbError } = await supabase
            .from('calendar_connections')
            .upsert({
              user_id: user.id,
              provider: 'google',
              email: userInfo.email,
              label: label.trim(),
              access_token: data.tokens.access_token,
              refresh_token: data.tokens.refresh_token || null,
              token_expires_at: data.tokens.expires_at,
              is_active: true,
            }, { onConflict: 'user_id,provider,email' });

          if (dbError) throw new Error(`Failed to save connection: ${dbError.message}`);

          await loadConnectedCalendars();
          toast.success(`Google Calendar "${label}" connected!`);
        }
        
        localStorage.removeItem('pending_calendar_connection');
      }
      
      // Handle Email OAuth
      else if (pendingEmail) {
        const { provider, label } = JSON.parse(pendingEmail);
        
        
        if (provider === 'gmail') {
          
          
          const { data, error: funcError } = await supabase.functions.invoke('gmail-oauth', {
            body: { action: 'exchangeCode', code, redirectUri },
          });

          

          if (funcError || !data?.access_token) {
            console.error('❌ Gmail OAuth error:', funcError);
            throw new Error('Failed to receive authentication tokens from Gmail');
          }

          // Get user email from Google
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });

          if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info from Gmail');
          }

          const userInfo = await userInfoResponse.json();
          

          // Calculate token expiry
          const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();

          const { error: dbError } = await supabase
            .from('email_connections')
            .insert({
              user_id: user.id,
              provider: 'gmail',
              email: userInfo.email,
              label: label.trim(),
              access_token: data.access_token,
              refresh_token: data.refresh_token || null,
              token_expires_at: expiresAt,
              scopes: data.scope ? data.scope.split(' ') : [],
              is_active: true,
              sync_enabled: true,
            });

          if (dbError) {
            console.error('❌ Database error:', dbError);
            throw new Error(`Failed to save Gmail connection: ${dbError.message}`);
          }

          await loadConnectedEmails();
          toast.success(`Gmail "${label}" connected!`);
        }
        
        else if (provider === 'outlook') {
          
          
          const { data, error: funcError } = await supabase.functions.invoke('outlook-oauth', {
            body: { action: 'exchangeCode', code, redirectUri },
          });

          

          if (funcError || !data?.access_token) {
            console.error('❌ Outlook OAuth error:', funcError);
            throw new Error('Failed to receive authentication tokens from Outlook');
          }

          // Get user email from Microsoft Graph
          const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });

          if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info from Outlook');
          }

          const userInfo = await userInfoResponse.json();
          

          // Calculate token expiry
          const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();

          const { error: dbError } = await supabase
            .from('email_connections')
            .insert({
              user_id: user.id,
              provider: 'outlook',
              email: userInfo.mail || userInfo.userPrincipalName,
              label: label.trim(),
              access_token: data.access_token,
              refresh_token: data.refresh_token || null,
              token_expires_at: expiresAt,
              scopes: data.scope ? data.scope.split(' ') : [],
              is_active: true,
              sync_enabled: true,
            });

          if (dbError) {
            console.error('❌ Database error:', dbError);
            throw new Error(`Failed to save Outlook connection: ${dbError.message}`);
          }

          await loadConnectedEmails();
          toast.success(`Outlook "${label}" connected!`);
        }
        
        localStorage.removeItem('pending_email_connection');
      }
      
      // Clean up
      localStorage.removeItem('oauth_return_tab');
      window.history.replaceState({}, document.title, '/settings');
      
      
    } catch (error) {
      console.error('❌ OAuth error:', error);
      toast.error(error instanceof Error ? error.message : t('settings.connectionssettings.failedToCompleteConnection', 'Failed to complete connection'));
      
      localStorage.removeItem('pending_calendar_connection');
      localStorage.removeItem('pending_email_connection');
      localStorage.removeItem('oauth_return_tab');
      window.history.replaceState({}, document.title, '/settings');
    } finally {
      setOauthProcessing(false);
    }
  };

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

  const loadConnectedCalendars = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading calendars:', error);
      return;
    }
    
    const calendars: CalendarConnection[] = (data || []).map((conn: any) => ({
      id: conn.id,
      provider: conn.provider as 'google' | 'microsoft',
      email: conn.email,
      label: conn.label,
      token: conn.access_token,
      connectedAt: conn.created_at
    }));
    
    setConnectedCalendars(calendars);
  };

  const loadConnectedEmails = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading email connections:', error);
      return;
    }
    
    const emails: EmailConnection[] = (data || []).map((conn: any) => ({
      id: conn.id,
      provider: conn.provider,
      email: conn.email,
      label: conn.label,
      is_active: conn.is_active,
      sync_enabled: conn.sync_enabled,
      last_sync_at: conn.last_sync_at,
      created_at: conn.created_at,
      scopes: conn.scopes
    }));
    
    setEmailConnections(emails);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setResumeFile(file);
        setResumeDisplayName(file.name.replace(/\.[^/.]+$/, ''));
        setShowResumeDialog(true);
      }
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile || !user || !resumeDisplayName.trim()) {
      toast.error(t('connections.provideResumeName'));
      return;
    }

    try {
      const result = await uploadResume(resumeFile, user.id, 'candidate');
      
      if (!result) return; // Hook handles errors

      const { error: dbError } = await supabase
        .from('user_resumes')
        .insert({
          user_id: user.id,
          file_name: resumeFile.name,
          display_name: resumeDisplayName.trim(),
          file_path: result.path,
          file_size: resumeFile.size,
          mime_type: resumeFile.type,
          is_primary: userResumes.length === 0
        });

      if (dbError) throw dbError;

      toast.success(t('connections.resumeUploaded'));
      setShowResumeDialog(false);
      setResumeFile(null);
      setResumeDisplayName('');
      await loadUserResumes();
    } catch (error) {
      console.error('Error uploading resume:', error);
      // Hook handles upload errors, we catch DB errors here
      if ((error as any).message !== 'Upload failed') { // Simple check
         toast.error(t('connections.failedSaveResume'));
      }
    }
  };

  const handleDeleteResume = async (resumeId: string, filePath: string) => {
    if (!confirm(t('connections.confirmDeleteResume'))) return;

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

      toast.success(t('connections.resumeDeleted'));
      await loadUserResumes();
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error(t('connections.failedDeleteResume'));
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
      toast.error(t('connections.failedDownloadResume'));
    }
  };

  const handlePreviewResume = async (filePath: string, fileName: string, mimeType: string) => {
    try {
      if (!mimeType.includes('pdf')) {
        toast.error(t('connections.pdfOnlyPreview'));
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
      toast.error(t('connections.failedPreviewResume'));
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

      toast.success(t('connections.primaryResumeUpdated'));
      await loadUserResumes();
    } catch (error) {
      console.error('Error setting primary resume:', error);
      toast.error(t('connections.failedSetPrimary'));
    }
  };

  const handleConnectCalendar = async (provider: 'google' | 'microsoft' | 'apple') => {
    // Apple Calendar support coming soon
    if (provider === 'apple') {
      toast.info("Apple Calendar integration coming soon", {
        description: t('settings.connectionssettings.workingOnAppleCalendar', "We're working on adding Apple Calendar support. Use Google or Microsoft Calendar for now.")
      });
      return;
    }
    
    // Use a custom input dialog
    const label = await new Promise<string | null>((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      dialog.innerHTML = `
        <div class="bg-background border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <h3 class="text-lg font-semibold mb-2">{t('settings.connectionssettings.nameYourCalendar', 'Name Your Calendar')}</h3>
          <p class="text-sm text-muted-foreground mb-4">Choose a name for this ${provider === 'google' ? t('settings.connectionssettings.google', 'Google') : t('settings.connectionssettings.microsoft', 'Microsoft')} Calendar connection</p>
          <input 
            type="text" 
            id="calendar-label-input"
            placeholder="e.g., Personal Calendar, Work Calendar"
            class="w-full px-3 py-2 border rounded-md mb-4"
          />
          <div class="flex gap-2 justify-end">
            <button id="cancel-btn" class="px-4 py-2 border rounded-md hover:bg-accent">{t('settings.connectionssettings.cancel', 'Cancel')}</button>
            <button id="connect-btn" class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">{t('settings.connectionssettings.connect', 'Connect')}</button>
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
      toast.error(t('connections.calendarCancelled'));
      return;
    }

    try {
      setCalendarLoading(true);
      
      const redirectUri = `${window.location.origin}/settings`;
      
      
      // Store that we want to return to connections tab after OAuth
      localStorage.setItem('oauth_return_tab', 'connections');
      
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

      
      // Redirect to OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error(`[Calendar] ${provider} Calendar connection error:`, error);
      const errorMessage = error instanceof Error ? error.message : t('settings.connectionssettings.unknownError', 'Unknown error');
      
      // Show detailed error with better formatting
      const isRedirectError = errorMessage.includes('redirect URI');
      toast.error(
        `Failed to connect ${provider === 'google' ? t('settings.connectionssettings.google', 'Google') : t('settings.connectionssettings.microsoft', 'Microsoft')} Calendar`,
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

  const handleDisconnectCalendar = async (calendarId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_connections' as any)
        .update({ is_active: false })
        .eq('id', calendarId);
      
      if (error) throw error;
      
      await loadConnectedCalendars();
      toast.success(t('connections.calendarDisconnected'));
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error(t('connections.failedDisconnectCalendar'));
    }
  };

  const handleConnectEmail = async (provider: 'gmail' | 'outlook') => {
    if (!user) {
      toast.error(t('connections.signInToConnect'));
      return;
    }

    setPendingEmailProvider(provider);
    setEmailLabel('');
    setShowEmailLabelDialog(true);
  };

  const handleEmailLabelSubmit = async () => {
    if (!pendingEmailProvider || !emailLabel.trim()) {
      toast.error(t('connections.enterEmailLabel'));
      return;
    }

    setEmailLoading(true);
    setShowEmailLabelDialog(false);

    try {
      const redirectUri = `${window.location.origin}/settings`;
      const functionName = pendingEmailProvider === 'gmail' ? 'gmail-oauth' : 'outlook-oauth';

      // Store pending connection
      localStorage.setItem('oauth_return_tab', 'connections');
      localStorage.setItem('pending_email_connection', JSON.stringify({ 
        provider: pendingEmailProvider, 
        label: emailLabel.trim() 
      }));

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'getAuthUrl', redirectUri }
      });

      if (error || !data?.authUrl) {
        throw new Error('Failed to get authentication URL');
      }

      
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Email connection error:', error);
      toast.error(error instanceof Error ? error.message : t('settings.connectionssettings.failedToConnectEmail', 'Failed to connect email'));
      localStorage.removeItem('pending_email_connection');
      setEmailLoading(false);
    }
  };

  const handleToggleEmailSync = async (emailId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('email_connections')
        .update({ sync_enabled: enabled })
        .eq('id', emailId);

      if (error) throw error;

      await loadConnectedEmails();
      toast.success(`Email sync ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling email sync:', error);
      toast.error(t('connections.failedUpdateSync'));
    }
  };

  const handleDisconnectEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_connections')
        .update({ is_active: false })
        .eq('id', emailId);

      if (error) throw error;

      await loadConnectedEmails();
      toast.success(t('connections.emailDisconnected'));
    } catch (error) {
      console.error('Error disconnecting email:', error);
      toast.error(t('connections.failedDisconnectEmail'));
    }
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

      {/* Email Connections */}
      <EmailConnections
        emailConnections={emailConnections}
        onConnectGmail={() => handleConnectEmail('gmail')}
        onConnectOutlook={() => handleConnectEmail('outlook')}
        onToggleSync={handleToggleEmailSync}
        onDisconnect={handleDisconnectEmail}
        loading={emailLoading || oauthProcessing}
      />

      {/* Resume/CV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {t('connections.resumeCV')}
          </CardTitle>
          <CardDescription>{t('connections.uploadManageResumes')}</CardDescription>
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
                {t('connections.clickToUpload')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('connections.fileFormats')}
              </p>
            </label>
          </div>

          {userResumes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('connections.yourResumes')}</h4>
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
                        title={t('settings.connectionssettings.setAsPrimary', 'Set as primary')}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePreviewResume(resume.file_path, resume.file_name, resume.mime_type)}
                      title={t('settings.connectionssettings.preview', 'Preview')}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadResume(resume.file_path, resume.file_name)}
                      title={t('settings.connectionssettings.download', 'Download')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteResume(resume.id, resume.file_path)}
                      title={t('settings.connectionssettings.delete', 'Delete')}
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
            {t('connections.tqcResume')}
          </CardTitle>
          <CardDescription>
            {t('connections.tqcResumeDesc')}
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
                  <h4 className="font-semibold mb-2">{t('connections.premiumResumeBuilder')}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('connections.premiumResumeDesc')}
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
                    {t('connections.comingSoonTQCResume')}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('connections.featureComingSoon')}
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
            {t('connections.connectCalendars')}
          </CardTitle>
          <CardDescription>
            {t('connections.connectCalendarsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm mb-3">{t('connections.currentlyConnected')}</h4>
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
                          {calendar.provider === 'google' ? t('settings.connectionssettings.google', 'Google') : t('settings.connectionssettings.microsoft', 'Microsoft')} - {calendar.label}
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
                      {t('common:actions.remove')}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">{t('connections.noCalendarsYet')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('connections.connectCalendarsHint')}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm mb-3">
              {connectedCalendars.length > 0 ? t('connections.addAnotherCalendar') : t('connections.connectACalendar')}
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
                {t('connections.addGoogleCalendar')}
              </Button>
              <Button
                type="button"
                onClick={() => handleConnectCalendar('microsoft')}
                disabled={calendarLoading}
                variant="outline"
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('connections.addMicrosoftCalendar')}
              </Button>
              <Button
                type="button"
                onClick={() => handleConnectCalendar('apple')}
                disabled={calendarLoading}
                variant="outline"
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {t('connections.addAppleCalendar')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={showEmailLabelDialog} onOpenChange={setShowEmailLabelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('connections.nameEmailConnection')}</DialogTitle>
            <DialogDescription>
              {t('connections.nameEmailConnectionDesc', { provider: pendingEmailProvider === 'gmail' ? t('settings.connectionssettings.gmail', 'Gmail') : t('settings.connectionssettings.outlook', 'Outlook') })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-label">{t('connections.connectionName')}</Label>
              <Input
                id="email-label"
                value={emailLabel}
                onChange={(e) => setEmailLabel(e.target.value)}
                placeholder={t('connections.emailLabelPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailLabelDialog(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleEmailLabelSubmit} disabled={!emailLabel.trim()}>
              {t('common:actions.connect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('connections.nameResume')}</DialogTitle>
            <DialogDescription>
              {t('connections.nameResumeDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="resume-name">{t('connections.resumeName')}</Label>
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
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleUploadResume} disabled={isUploadingResume || !resumeDisplayName.trim()}>
              {isUploadingResume ? t('common:status.uploading') : t('common:actions.upload')}
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
              title={t('settings.connectionssettings.resumePreview', 'Resume Preview')}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
