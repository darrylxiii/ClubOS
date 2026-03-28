import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";
import { SoundSettings } from "@/components/settings/SoundSettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { CompensationSettings } from "@/components/settings/CompensationSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { ConnectionsSettings } from "@/components/settings/ConnectionsSettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { CalendarIntegrationSettings } from "@/components/settings/CalendarIntegrationSettings";
import { ResumeUploadModal } from "@/components/candidate/ResumeUploadModal";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { EnhancedFreelanceSettings } from "@/components/settings/freelance";
import { TimeTrackingSettings } from "@/components/settings/TimeTrackingSettings";
import { APIIntegrationSettings } from "@/components/settings/APIIntegrationSettings";
import { CommunicationSettings } from "@/components/settings/CommunicationSettings";
import { EntityKnowledgeProfile } from "@/components/intelligence/EntityKnowledgeProfile";
import { signInWithOAuthCustomDomain } from "@/lib/oauth-helpers";
import { useSettingsData } from "@/hooks/useSettingsData";
import { logger } from "@/lib/logger";

const Settings = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const [resumeModalOpen, setResumeModalOpen] = useState(false);

  const {
    state,
    updateField,
    updateFields,
    saveProfile,
    debouncedSave,
    loadProfile,
    handlePrivacyToggle,
    handleExportData,
    handleCurrencyChange,
    handleDisconnectSocial,
  } = useSettingsData(user ?? null, i18n);

  // Listen for language changes from banner switcher
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent<string>) => {
      updateField('preferredLanguage', event.detail);
    };
    window.addEventListener('languageChange', handleLanguageChange as EventListener);
    return () => window.removeEventListener('languageChange', handleLanguageChange as EventListener);
  }, [updateField]);

  // Initialize exchange rate tracking
  useExchangeRates();

  // Get active tab from URL
  const getActiveTab = () => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('code')) return 'connections';
    const oauthReturnTab = localStorage.getItem('oauth_return_tab');
    if (oauthReturnTab) return oauthReturnTab;
    const tabParam = urlParams.get('tab');
    if (tabParam && ['profile', 'ai-persona', 'compensation', 'freelance', 'connections', 'calendar', 'notifications', 'privacy', 'security', 'preferences', 'time-tracking', 'api', 'communication', 'company'].includes(tabParam)) {
      return tabParam;
    }
    return location.hash.replace('#', '') || 'profile';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.search, location.hash]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/settings?tab=${value}`, { replace: true });
  };

  const handleConnectSocial = async (provider: string) => {
    try {
      const redirectTo = `${window.location.origin}/settings`;
      await signInWithOAuthCustomDomain({
        provider: provider as Parameters<typeof signInWithOAuthCustomDomain>[0]['provider'],
        redirectTo,
        scopes: provider === 'linkedin_oidc' ? 'openid profile email' :
          provider === 'github' ? 'read:user user:email' : undefined,
      });
      toast.success(`Redirecting to ${provider} login...`);
    } catch (error) {
      logger.error(`${provider} connection error:`, { error });
      toast.error(`Failed to connect ${provider}`);
    }
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-foreground" />
          <div>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-foreground">{t('text.settings.settings', 'Settings')}</h1>
            <p className="text-muted-foreground">{t('text.settings.manageYourProfileAndPreferences', 'Manage your profile and preferences')}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto sm:scrollbar-hide gap-1 h-auto p-1">
            <TabsTrigger value="profile">{t('text.settings.profile', 'Profile')}</TabsTrigger>
            <TabsTrigger value="ai-persona">{t('text.settings.aiPersona', 'AI Persona')}</TabsTrigger>
            <TabsTrigger value="compensation">{t('text.settings.compensation', 'Compensation')}</TabsTrigger>
            <TabsTrigger value="freelance">{t('text.settings.freelance', 'Freelance')}</TabsTrigger>
            <TabsTrigger value="time-tracking">{t('text.settings.time', 'Time')}</TabsTrigger>
            <TabsTrigger value="connections">{t('text.settings.connections', 'Connections')}</TabsTrigger>
            <TabsTrigger value="calendar">{t('text.settings.calendar', 'Calendar')}</TabsTrigger>
            <TabsTrigger value="communication">{t('text.settings.comms', 'Comms')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('text.settings.alerts', 'Alerts')}</TabsTrigger>
            <TabsTrigger value="sound">{t('text.settings.sound', 'Sound')}</TabsTrigger>
            <TabsTrigger value="privacy">{t('text.settings.privacy', 'Privacy')}</TabsTrigger>
            <TabsTrigger value="security">{t('text.settings.security', 'Security')}</TabsTrigger>
            <TabsTrigger value="api">{t('text.settings.api', 'API')}</TabsTrigger>
            <TabsTrigger value="preferences">{t('text.settings.preferences', 'Preferences')}</TabsTrigger>
            <TabsTrigger value="company">{t('text.settings.company', 'Company')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileSettings
              user={user}
              profile={state.profile}
              fullName={state.fullName}
              setFullName={(v) => updateField('fullName', v)}
              currentTitle={state.currentTitle}
              setCurrentTitle={(v) => updateField('currentTitle', v)}
              bio={state.bio}
              setBio={(v) => updateField('bio', v)}
              locationCity={state.locationCity}
              setLocationCity={(v) => updateField('locationCity', v)}
              phoneNumber={state.phoneNumber}
              setPhoneNumber={(v) => updateField('phoneNumber', v)}
              phoneVerified={state.phoneVerified}
              setPhoneVerified={(v) => updateField('phoneVerified', v)}
              emailVerified={state.emailVerified}
              setEmailVerified={(v) => updateField('emailVerified', v)}
              linkedinUrl={state.linkedinUrl}
              setLinkedinUrl={(v) => updateField('linkedinUrl', v)}
              preferredWorkLocations={state.preferredWorkLocations}
              setPreferredWorkLocations={(v) => updateField('preferredWorkLocations', v)}
              remoteWorkPreference={state.remoteWorkPreference}
              setRemoteWorkPreference={(v) => updateField('remoteWorkPreference', v)}
              cities={state.cities}
              onSave={saveProfile}
              onAvatarChange={(url) => updateField('profile', { ...state.profile, avatar_url: url } as typeof state.profile)}
              saving={state.saving}
            />
          </TabsContent>

          <TabsContent value="ai-persona" className="space-y-4">
            {state.profile && (
              <EntityKnowledgeProfile
                entityId={state.profile.id}
                entityType="user"
                title={t('text.settings.myAiPersona', 'My AI Persona')}
                description={t('text.settings.teachTheAiYourPersonalCommunication', 'Teach the AI your personal communication style and preferences.')}
              />
            )}
          </TabsContent>

          <TabsContent value="compensation" className="space-y-4">
            <CompensationSettings
              employmentType={state.employmentType}
              setEmploymentType={(v) => updateField('employmentType', v)}
              currentSalaryRange={state.currentSalaryRange}
              setCurrentSalaryRange={(v) => updateField('currentSalaryRange', v)}
              desiredSalaryRange={state.desiredSalaryRange}
              setDesiredSalaryRange={(v) => updateField('desiredSalaryRange', v)}
              freelanceHourlyRate={state.freelanceHourlyRate}
              setFreelanceHourlyRate={(v) => updateField('freelanceHourlyRate', v)}
              fulltimeHoursPerWeek={state.fulltimeHoursPerWeek}
              setFulltimeHoursPerWeek={(v) => updateField('fulltimeHoursPerWeek', v)}
              freelanceHoursPerWeek={state.freelanceHoursPerWeek}
              setFreelanceHoursPerWeek={(v) => updateField('freelanceHoursPerWeek', v)}
              noticePeriod={state.noticePeriod}
              setNoticePeriod={(v) => updateField('noticePeriod', v)}
              contractEndDate={state.contractEndDate}
              setContractEndDate={(v) => updateField('contractEndDate', v)}
              hasIndefiniteContract={state.hasIndefiniteContract}
              setHasIndefiniteContract={(v) => updateField('hasIndefiniteContract', v)}
              onSave={saveProfile}
              saving={state.saving}
            />
          </TabsContent>

          <TabsContent value="freelance" className="space-y-4">
            <EnhancedFreelanceSettings />
          </TabsContent>

          <TabsContent value="time-tracking" className="space-y-4">
            <TimeTrackingSettings />
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <ConnectionsSettings
              socialConnections={state.socialConnections}
              musicConnections={state.musicConnections}
              onConnectSocial={handleConnectSocial}
              onDisconnectSocial={handleDisconnectSocial}
              onUpdate={loadProfile}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <CalendarIntegrationSettings />
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <CommunicationSettings />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="sound" className="space-y-4">
            <SoundSettings />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <PrivacySettings
              blockedCompanies={state.blockedCompanies}
              setBlockedCompanies={(v) => updateField('blockedCompanies', v)}
              companySearchQuery={state.companySearchQuery}
              setCompanySearchQuery={(v) => updateField('companySearchQuery', v)}
              stealthModeEnabled={state.stealthModeEnabled}
              stealthModeLevel={state.stealthModeLevel}
              allowStealthColdOutreach={state.allowStealthColdOutreach}
              onStealthModeChange={(v) => { updateField('stealthModeEnabled', v); debouncedSave(); }}
              onStealthLevelChange={(v) => { updateField('stealthModeLevel', v); debouncedSave(); }}
              onColdOutreachChange={(v) => { updateField('allowStealthColdOutreach', v); debouncedSave(); }}
              privacySettings={state.privacySettings}
              onPrivacyToggle={handlePrivacyToggle}
              onSave={saveProfile}
              onExportData={handleExportData}
              saving={state.saving}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecuritySettings />
            <Card>
              <CardHeader>
                <CardTitle>{t('text.settings.documents', 'Documents')}</CardTitle>
                <CardDescription>{t('text.settings.uploadAndManageYourResumesCover', 'Upload and manage your resumes, cover letters, and certificates')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setResumeModalOpen(true)}>
                  {t('text.settings.uploadDocument', 'Upload Document')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-4">
            <APIIntegrationSettings />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <PreferencesSettings
              preferredCurrency={state.preferredCurrency}
              onCurrencyChange={handleCurrencyChange}
              preferredLanguage={state.preferredLanguage}
              onLanguageChange={async (lang) => {
                updateField('preferredLanguage', lang);
                await i18n.changeLanguage(lang);
                debouncedSave();
              }}
              jobAlertFrequency={state.jobAlertFrequency}
              onJobAlertFrequencyChange={(freq) => { updateField('jobAlertFrequency', freq); debouncedSave(); }}
              companySizePreference={state.companySizePreference}
              onCompanySizeChange={(size) => { updateField('companySizePreference', size); debouncedSave(); }}
              industryPreference={state.industryPreference}
              onIndustryChange={(industry) => { updateField('industryPreference', industry); debouncedSave(); }}
              workTimezone={state.workTimezone}
              onTimezoneChange={(tz) => { updateField('workTimezone', tz); debouncedSave(); }}
              availableHoursPerWeek={state.availableHoursPerWeek}
              onAvailableHoursChange={(hours) => { updateField('availableHoursPerWeek', hours); debouncedSave(); }}
              onSave={saveProfile}
              saving={state.saving}
            />
          </TabsContent>

          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('text.settings.companySettings', 'Company Settings')}</CardTitle>
                <CardDescription>{t('text.settings.manageYourCompanyProfileBrandingAnd', 'Manage your company profile, branding, and team members')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Company settings have been consolidated here. If you're a company admin, you can manage your company profile, team members, and branding from this section.
                </p>
                <Button variant="outline" onClick={() => navigate('/companies')}>
                  {t('text.settings.goToCompanyManagement', 'Go to Company Management')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ResumeUploadModal
        open={resumeModalOpen}
        onOpenChange={setResumeModalOpen}
        onUploadComplete={() => {
          toast.success(t('text.settings.documentUploadedSuccessfully', 'Document uploaded successfully'));
          setResumeModalOpen(false);
        }}
      />
    </>
  );
};

export default Settings;
