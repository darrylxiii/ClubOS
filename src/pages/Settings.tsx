import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { CompensationSettings } from "@/components/settings/CompensationSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { ConnectionsSettings } from "@/components/settings/ConnectionsSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { CalendarIntegrationSettings } from "@/components/settings/CalendarIntegrationSettings";
import { ResumeUploadModal } from "@/components/candidate/ResumeUploadModal";
import { useExchangeRates } from "@/hooks/useExchangeRates";

const Settings = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Profile states
  const [fullName, setFullName] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [bio, setBio] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [preferredWorkLocations, setPreferredWorkLocations] = useState<string[]>([]);
  const [remoteWorkPreference, setRemoteWorkPreference] = useState(false);
  const [cities, setCities] = useState<Array<{ id: string; name: string; country: string }>>([]);

  // Compensation states
  const [employmentType, setEmploymentType] = useState<'fulltime' | 'freelance' | 'both'>('fulltime');
  const [currentSalaryRange, setCurrentSalaryRange] = useState<[number, number]>([150000, 180000]);
  const [desiredSalaryRange, setDesiredSalaryRange] = useState<[number, number]>([200000, 250000]);
  const [freelanceHourlyRate, setFreelanceHourlyRate] = useState<[number, number]>([100, 200]);
  const [fulltimeHoursPerWeek, setFulltimeHoursPerWeek] = useState<[number, number]>([35, 45]);
  const [freelanceHoursPerWeek, setFreelanceHoursPerWeek] = useState<[number, number]>([15, 25]);
  const [noticePeriod, setNoticePeriod] = useState("2_weeks");
  const [contractEndDate, setContractEndDate] = useState<Date | null>(null);
  const [hasIndefiniteContract, setHasIndefiniteContract] = useState(false);

  // Privacy states
  const [blockedCompanies, setBlockedCompanies] = useState<string[]>([]);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [stealthModeEnabled, setStealthModeEnabled] = useState(false);
  const [stealthModeLevel, setStealthModeLevel] = useState(1);
  const [allowStealthColdOutreach, setAllowStealthColdOutreach] = useState(true);
  const [privacySettings, setPrivacySettings] = useState({
    share_full_name: true,
    share_email: true,
    share_phone: true,
    share_location: true,
    share_current_title: true,
    share_linkedin_url: true,
    share_career_preferences: true,
    share_resume: true,
    share_salary_expectations: true,
    share_notice_period: true,
  });

  // Social connections
  const [socialConnections, setSocialConnections] = useState({
    linkedin: false,
    instagram: false,
    twitter: false,
    github: false,
    instagramUsername: '',
    twitterUsername: '',
    githubUsername: '',
  });

  const [musicConnections, setMusicConnections] = useState({
    spotifyConnected: false,
    appleMusicConnected: false,
    spotifyPlaylists: [] as any[],
    appleMusicPlaylists: [] as any[],
  });

  // Preferences
  const [preferredCurrency, setPreferredCurrency] = useState<'EUR' | 'USD' | 'GBP' | 'AED' | 'BTC' | 'ETH'>('EUR');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [jobAlertFrequency, setJobAlertFrequency] = useState('daily');
  const [companySizePreference, setCompanySizePreference] = useState('any');
  const [industryPreference, setIndustryPreference] = useState('any');
  const [workTimezone, setWorkTimezone] = useState('Europe/Amsterdam');
  const [availableHoursPerWeek, setAvailableHoursPerWeek] = useState(40);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  // Initialize exchange rate tracking
  useExchangeRates();

  // Get active tab from URL (query param or hash) or default to 'profile'
  const getActiveTab = () => {
    // Check if returning from OAuth with a code
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('code')) {
      return 'connections';
    }
    
    // Check if OAuth set a return tab
    const oauthReturnTab = localStorage.getItem('oauth_return_tab');
    if (oauthReturnTab) {
      return oauthReturnTab;
    }
    
    const tabParam = urlParams.get('tab');
    if (tabParam && ['profile', 'compensation', 'connections', 'notifications', 'privacy', 'security', 'preferences'].includes(tabParam)) {
      return tabParam;
    }
    const hash = location.hash.replace('#', '');
    return hash || 'profile';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.search, location.hash]);

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/settings?tab=${value}`, { replace: true });
  };

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveProfile();
    }, 1000);
  }, []);

  // Load profile data
  useEffect(() => {
    loadProfile();
    loadCities();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || '');
        setCurrentTitle(data.current_title || '');
        setBio(data.career_preferences || '');
        setLocationCity(data.location || '');
        setPhoneNumber(data.phone || '');
        setPhoneVerified(data.phone_verified || false);
        setEmailVerified(data.email_verified || false);
        setLinkedinUrl(data.linkedin_url || '');
        setPreferredWorkLocations((data.preferred_work_locations as string[]) || []);
        setRemoteWorkPreference(data.remote_work_preference || false);
        
        // Compensation
        setEmploymentType((data.employment_type_preference as 'fulltime' | 'freelance' | 'both') || 'fulltime');
        setCurrentSalaryRange([
          data.current_salary_min || 150000,
          data.current_salary_max || 180000
        ]);
        setDesiredSalaryRange([
          data.desired_salary_min || 200000,
          data.desired_salary_max || 250000
        ]);
        setFreelanceHourlyRate([
          data.freelance_hourly_rate_min || 100,
          data.freelance_hourly_rate_max || 200
        ]);
        setFulltimeHoursPerWeek([
          data.fulltime_hours_per_week_min || 35,
          data.fulltime_hours_per_week_max || 45
        ]);
        setFreelanceHoursPerWeek([
          data.freelance_hours_per_week_min || 15,
          data.freelance_hours_per_week_max || 25
        ]);
        setNoticePeriod(data.notice_period || '2_weeks');
        setContractEndDate((data as any).contract_end_date ? new Date((data as any).contract_end_date) : null);
        setHasIndefiniteContract((data as any).has_indefinite_contract || false);

        // Privacy
        setBlockedCompanies((data.blocked_companies as string[]) || []);
        setStealthModeEnabled(data.stealth_mode_enabled || false);
        setStealthModeLevel(data.stealth_mode_level || 1);
        setAllowStealthColdOutreach(data.allow_stealth_cold_outreach !== false);
        if (data.privacy_settings) {
          setPrivacySettings(data.privacy_settings as any);
        }

        // Currency
        setPreferredCurrency((data.preferred_currency as 'EUR' | 'USD' | 'GBP' | 'AED' | 'BTC' | 'ETH') || 'EUR');
        
        // New preferences
        setPreferredLanguage(data.preferred_language || 'en');
        setJobAlertFrequency(data.job_alert_frequency || 'daily');
        setCompanySizePreference(data.company_size_preference || 'any');
        setIndustryPreference(data.industry_preference || 'any');
        setWorkTimezone(data.work_timezone || 'Europe/Amsterdam');
        setAvailableHoursPerWeek(data.available_hours_per_week || 40);

        // Social connections
        if (data.linkedin_connected) {
          setSocialConnections(prev => ({ ...prev, linkedin: true }));
        }
        if (data.instagram_connected && data.instagram_username) {
          setSocialConnections(prev => ({ 
            ...prev, 
            instagram: true,
            instagramUsername: data.instagram_username 
          }));
        }
        if (data.twitter_connected && data.twitter_username) {
          setSocialConnections(prev => ({ 
            ...prev, 
            twitter: true,
            twitterUsername: data.twitter_username 
          }));
        }
        if (data.github_connected && data.github_username) {
          setSocialConnections(prev => ({ 
            ...prev, 
            github: true,
            githubUsername: data.github_username 
          }));
        }

        setMusicConnections({
          spotifyConnected: (data as any).spotify_connected || false,
          appleMusicConnected: (data as any).apple_music_connected || false,
          spotifyPlaylists: (data as any).spotify_playlists || [],
          appleMusicPlaylists: (data as any).apple_music_playlists || [],
        });
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, country')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (data) {
        setCities(data);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          current_title: currentTitle,
          career_preferences: bio,
          location: locationCity,
          phone: phoneNumber,
          phone_verified: phoneVerified,
          email_verified: emailVerified,
          linkedin_url: linkedinUrl,
          preferred_work_locations: preferredWorkLocations,
          remote_work_preference: remoteWorkPreference,
          employment_type_preference: employmentType,
          current_salary_min: currentSalaryRange[0],
          current_salary_max: currentSalaryRange[1],
          desired_salary_min: desiredSalaryRange[0],
          desired_salary_max: desiredSalaryRange[1],
          freelance_hourly_rate_min: freelanceHourlyRate[0],
          freelance_hourly_rate_max: freelanceHourlyRate[1],
          fulltime_hours_per_week_min: fulltimeHoursPerWeek[0],
          fulltime_hours_per_week_max: fulltimeHoursPerWeek[1],
          freelance_hours_per_week_min: freelanceHoursPerWeek[0],
          freelance_hours_per_week_max: freelanceHoursPerWeek[1],
          notice_period: noticePeriod,
          contract_end_date: contractEndDate?.toISOString(),
          has_indefinite_contract: hasIndefiniteContract,
          blocked_companies: blockedCompanies,
          stealth_mode_enabled: stealthModeEnabled,
          stealth_mode_level: stealthModeLevel,
          allow_stealth_cold_outreach: allowStealthColdOutreach,
          privacy_settings: privacySettings,
          preferred_currency: preferredCurrency,
          preferred_language: preferredLanguage,
          job_alert_frequency: jobAlertFrequency,
          company_size_preference: companySizePreference,
          industry_preference: industryPreference,
          work_timezone: workTimezone,
          available_hours_per_week: availableHoursPerWeek,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    await saveProfile();
  };

  const handleExportData = async () => {
    if (!user) return;
    
    toast.success('Preparing your data export...');
    
    try {
      const { error } = await supabase
        .from('profile_data_exports')
        .insert({
          user_id: user.id,
          export_status: 'pending'
        });

      if (error) throw error;
      
      toast.success("Data export requested. You'll receive an email when ready.");
    } catch (error: any) {
      console.error('Error requesting export:', error);
      toast.error('Failed to request data export');
    }
  };

  const handlePrivacyToggle = (setting: string) => {
    setPrivacySettings({
      ...privacySettings,
      [setting]: !(privacySettings as any)[setting],
    });
    debouncedSave();
  };

  const handleStealthModeChange = (enabled: boolean) => {
    setStealthModeEnabled(enabled);
    debouncedSave();
  };

  const handleStealthLevelChange = (level: number) => {
    setStealthModeLevel(level);
    debouncedSave();
  };

  const handleColdOutreachChange = (allowed: boolean) => {
    setAllowStealthColdOutreach(allowed);
    debouncedSave();
  };

  const handleConnectSocial = async (provider: 'linkedin_oidc' | 'twitter' | 'instagram' | 'github') => {
    try {
      const redirectTo = `${window.location.origin}/settings`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo,
          scopes: provider === 'linkedin_oidc' ? 'openid profile email' : 
                  provider === 'github' ? 'read:user user:email' : undefined,
        }
      });

      if (error) throw error;
      
      toast.success(`Redirecting to ${provider} login...`);
    } catch (error) {
      console.error(`${provider} connection error:`, error);
      toast.error(`Failed to connect ${provider}`);
    }
  };

  const handleDisconnectSocial = async (platform: 'linkedin' | 'instagram' | 'twitter' | 'github') => {
    try {
      const updates: any = {};
      
      if (platform === 'linkedin') {
        updates.linkedin_connected = false;
        updates.linkedin_profile_data = null;
      } else if (platform === 'instagram') {
        updates.instagram_connected = false;
        updates.instagram_username = null;
      } else if (platform === 'twitter') {
        updates.twitter_connected = false;
        updates.twitter_username = null;
      } else if (platform === 'github') {
        updates.github_connected = false;
        updates.github_username = null;
        updates.github_profile_data = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;

      setSocialConnections(prev => ({
        ...prev,
        [platform]: false,
        [`${platform}Username`]: '',
      }));

      toast.success(`${platform} disconnected`);
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
      toast.error(`Failed to disconnect ${platform}`);
    }
  };

  const handleSocialUpdate = async () => {
    await loadProfile();
  };

  const handleCurrencyChange = async (currency: 'EUR' | 'USD' | 'GBP' | 'AED' | 'BTC' | 'ETH') => {
    setPreferredCurrency(currency);
    
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_currency: currency })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success(`Currency preference updated to ${currency}`);
    } catch (error) {
      console.error('Error updating currency:', error);
      toast.error('Failed to update currency preference');
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-foreground" />
          <div>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your profile and preferences</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileSettings
              user={user}
              profile={profile}
              fullName={fullName}
              setFullName={setFullName}
              currentTitle={currentTitle}
              setCurrentTitle={setCurrentTitle}
              bio={bio}
              setBio={setBio}
              locationCity={locationCity}
              setLocationCity={setLocationCity}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              phoneVerified={phoneVerified}
              setPhoneVerified={setPhoneVerified}
              emailVerified={emailVerified}
              setEmailVerified={setEmailVerified}
              linkedinUrl={linkedinUrl}
              setLinkedinUrl={setLinkedinUrl}
              preferredWorkLocations={preferredWorkLocations}
              setPreferredWorkLocations={setPreferredWorkLocations}
              remoteWorkPreference={remoteWorkPreference}
              setRemoteWorkPreference={setRemoteWorkPreference}
              cities={cities}
              onSave={saveProfile}
              onAvatarChange={(url) => setProfile({ ...profile, avatar_url: url })}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="compensation" className="space-y-4">
            <CompensationSettings
              employmentType={employmentType}
              setEmploymentType={setEmploymentType}
              currentSalaryRange={currentSalaryRange}
              setCurrentSalaryRange={setCurrentSalaryRange}
              desiredSalaryRange={desiredSalaryRange}
              setDesiredSalaryRange={setDesiredSalaryRange}
              freelanceHourlyRate={freelanceHourlyRate}
              setFreelanceHourlyRate={setFreelanceHourlyRate}
              fulltimeHoursPerWeek={fulltimeHoursPerWeek}
              setFulltimeHoursPerWeek={setFulltimeHoursPerWeek}
              freelanceHoursPerWeek={freelanceHoursPerWeek}
              setFreelanceHoursPerWeek={setFreelanceHoursPerWeek}
              noticePeriod={noticePeriod}
              setNoticePeriod={setNoticePeriod}
              contractEndDate={contractEndDate}
              setContractEndDate={setContractEndDate}
              hasIndefiniteContract={hasIndefiniteContract}
              setHasIndefiniteContract={setHasIndefiniteContract}
              onSave={saveProfile}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <ConnectionsSettings
              socialConnections={socialConnections}
              musicConnections={musicConnections}
              onConnectSocial={handleConnectSocial}
              onDisconnectSocial={handleDisconnectSocial}
              onUpdate={handleSocialUpdate}
            />
            <CalendarIntegrationSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <PrivacySettings
              blockedCompanies={blockedCompanies}
              setBlockedCompanies={setBlockedCompanies}
              companySearchQuery={companySearchQuery}
              setCompanySearchQuery={setCompanySearchQuery}
              stealthModeEnabled={stealthModeEnabled}
              stealthModeLevel={stealthModeLevel}
              allowStealthColdOutreach={allowStealthColdOutreach}
              onStealthModeChange={handleStealthModeChange}
              onStealthLevelChange={handleStealthLevelChange}
              onColdOutreachChange={handleColdOutreachChange}
              privacySettings={privacySettings}
              onPrivacyToggle={handlePrivacyToggle}
              onSave={handleSavePrivacy}
              onExportData={handleExportData}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecuritySettings />
            
            {/* Documents Section */}
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Upload and manage your resumes, cover letters, and certificates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setResumeModalOpen(true)}>
                  Upload Document
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <PreferencesSettings
              preferredCurrency={preferredCurrency}
              onCurrencyChange={handleCurrencyChange}
              preferredLanguage={preferredLanguage}
              onLanguageChange={(lang) => { setPreferredLanguage(lang); debouncedSave(); }}
              jobAlertFrequency={jobAlertFrequency}
              onJobAlertFrequencyChange={(freq) => { setJobAlertFrequency(freq); debouncedSave(); }}
              companySizePreference={companySizePreference}
              onCompanySizeChange={(size) => { setCompanySizePreference(size); debouncedSave(); }}
              industryPreference={industryPreference}
              onIndustryChange={(industry) => { setIndustryPreference(industry); debouncedSave(); }}
              workTimezone={workTimezone}
              onTimezoneChange={(tz) => { setWorkTimezone(tz); debouncedSave(); }}
              availableHoursPerWeek={availableHoursPerWeek}
              onAvailableHoursChange={(hours) => { setAvailableHoursPerWeek(hours); debouncedSave(); }}
              onSave={saveProfile}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      </div>
      
      <ResumeUploadModal 
        open={resumeModalOpen} 
        onOpenChange={setResumeModalOpen}
        onUploadComplete={() => {
          toast.success('Document uploaded successfully');
          setResumeModalOpen(false);
        }}
      />
    </AppLayout>
  );
};

export default Settings;
