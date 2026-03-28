import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Trash2, Shield, AlertTriangle, PauseCircle, FileDown, Mail, Info, FileText, Cookie } from 'lucide-react';
import { ConsentReceiptsViewer } from './ConsentReceiptsViewer';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface MarketingPrefs {
  career_opportunity_emails: boolean;
  platform_updates: boolean;
  partner_communications: boolean;
}

export const GDPRControls = () => {
  const { t } = useTranslation('settings');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [pendingDeletion, setPendingDeletion] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [marketingPrefs, setMarketingPrefs] = useState<MarketingPrefs>({
    career_opportunity_emails: false,
    platform_updates: false,
    partner_communications: false,
  });
  const [savingMarketing, setSavingMarketing] = useState(false);

  useEffect(() => {
    const loadMarketingPrefs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('marketing_preferences')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.marketing_preferences) {
        setMarketingPrefs(data.marketing_preferences as unknown as MarketingPrefs);
      }
    };
    loadMarketingPrefs();
  }, []);

  const handleMarketingToggle = async (key: keyof MarketingPrefs, value: boolean) => {
    const updated = { ...marketingPrefs, [key]: value };
    setMarketingPrefs(updated);
    setSavingMarketing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('profiles')
        .update({ marketing_preferences: updated as unknown as Record<string, unknown> })
        .eq('id', user.id);
      if (error) throw error;
      notify.success(t('gdpr.marketingPrefsSaved'));
    } catch {
      notify.error(t('gdpr.marketingPrefsFailed'));
    } finally {
      setSavingMarketing(false);
    }
  };

  // Restriction of processing state
  const [restrictAll, setRestrictAll] = useState(false);
  const [restrictions, setRestrictions] = useState({
    aiAnalysis: true,
    profileSharing: true,
    analytics: true,
    marketing: true,
  });
  const [restrictionRequested, setRestrictionRequested] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-export');
      
      if (error) throw error;

      if (data.export_url) {
        window.open(data.export_url, '_blank');
        notify.success(t('gdpr.dataExportReady', 'Data Export Ready'), { 
          description: t('gdpr.dataExportReadyDesc', 'Your data has been exported. The download will start shortly.') 
        });
      }
    } catch (error: unknown) {
      notify.error(t('gdpr.exportFailed', 'Export Failed'), { description: error instanceof Error ? error.message : t('gdpr.exportFailedDesc', 'Failed to export data') });
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDeletion = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-delete', {
        body: { action: 'request', reason: deletionReason },
      });
      
      if (error) throw error;

      setPendingDeletion(data);
      notify.success(t('gdpr.deletionScheduled', 'Deletion Scheduled'), { 
        description: t('gdpr.deletionScheduledDesc', 'Your account will be deleted on {{date}}. You can cancel this anytime before then.', { date: new Date(data.scheduled_for).toLocaleDateString() })
      });
      setDeletionReason('');
    } catch (error: unknown) {
      notify.error(t('gdpr.deletionRequestFailed', 'Deletion Request Failed'), { 
        description: error instanceof Error ? error.message : t('gdpr.deletionRequestFailedDesc', 'Failed to schedule account deletion') 
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const { error } = await supabase.functions.invoke('gdpr-delete', {
        body: { action: 'cancel' },
      });

      if (error) throw error;

      setPendingDeletion(null);
      notify.success(t('gdpr.deletionCancelled', 'Deletion Cancelled'), { description: t('gdpr.deletionCancelledDesc', 'Your account deletion has been cancelled.') });
    } catch (error: unknown) {
      notify.error(t('gdpr.cancellationFailed', 'Cancellation Failed'), { description: error instanceof Error ? error.message : t('gdpr.cancellationFailedDesc', 'Failed to cancel deletion') });
    }
  };

  const handleRestrictAllToggle = (checked: boolean) => {
    setRestrictAll(checked);
    if (checked) {
      setRestrictions({
        aiAnalysis: true,
        profileSharing: true,
        analytics: true,
        marketing: true,
      });
    }
  };

  const handleRestrictionChange = (key: keyof typeof restrictions, checked: boolean) => {
    const updated = { ...restrictions, [key]: checked };
    setRestrictions(updated);
    const allRestricted = Object.values(updated).every(Boolean);
    setRestrictAll(allRestricted);
  };

  const handleRequestFullRestriction = async () => {
    try {
      const { error } = await supabase.functions.invoke('gdpr-restrict', {
        body: { action: 'full-restriction', restrictions },
      });

      if (error) throw error;

      setRestrictionRequested(true);
      setRestrictAll(true);
      setRestrictions({
        aiAnalysis: true,
        profileSharing: true,
        analytics: true,
        marketing: true,
      });
      notify.success(
        t('gdpr.restrictionApplied', 'Processing Restricted'),
        { description: t('gdpr.restrictionAppliedDesc', 'Your data processing has been restricted. Essential processing will continue.') }
      );
    } catch (error: unknown) {
      notify.error(
        t('gdpr.restrictionFailed', 'Restriction Failed'),
        { description: error instanceof Error ? error.message : t('gdpr.restrictionFailedDesc', 'Failed to apply processing restriction') }
      );
    }
  };

  const handleExportWithFormat = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-export', {
        body: { format: exportFormat },
      });

      if (error) throw error;

      if (data.export_url) {
        window.open(data.export_url, '_blank');
        notify.success(
          t('gdpr.dataExportReady', 'Data Export Ready'),
          { description: t('gdpr.dataExportReadyDesc', 'Your data has been exported. The download will start shortly.') }
        );
      }
    } catch (error: unknown) {
      notify.error(t('gdpr.exportFailed', 'Export Failed'), { description: error instanceof Error ? error.message : t('gdpr.exportFailedDesc', 'Failed to export data') });
    } finally {
      setExporting(false);
    }
  };

  const restrictionSubOptions = [
    { key: 'aiAnalysis' as const, label: t('gdpr.restrictAiAnalysis', 'AI analysis and matching') },
    { key: 'profileSharing' as const, label: t('gdpr.restrictProfileSharing', 'Profile sharing with partners') },
    { key: 'analytics' as const, label: t('gdpr.restrictAnalytics', 'Analytics and profiling') },
    { key: 'marketing' as const, label: t('gdpr.restrictMarketing', 'Marketing communications') },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('gdpr.privacyDataRights')}
          </CardTitle>
          <CardDescription>
            {t('gdpr.privacyDataRightsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Data */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Label className="text-base">{t('gdpr.exportYourData')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('gdpr.exportDataDesc')}
                </p>
              </div>
              <Button
                onClick={handleExportData}
                disabled={exporting}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? t('gdpr.exporting') : t('gdpr.exportData')}
              </Button>
            </div>
          </div>

          {/* Data Portability - Format Options */}
          <div className="space-y-3 pt-6 border-t">
            <div className="space-y-1">
              <Label className="text-base flex items-center gap-2">
                <FileDown className="w-4 h-4" />
                {t('gdpr.dataPortability', 'Right to Data Portability')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('gdpr.dataPortabilityDesc', 'Your data will be exported in a structured, commonly used, machine-readable format per GDPR Article 20.')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(['json', 'csv', 'pdf'] as const).map((format) => (
                <Button
                  key={format}
                  variant={exportFormat === format ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat(format)}
                >
                  {format.toUpperCase()}
                </Button>
              ))}
            </div>
            <Button
              onClick={handleExportWithFormat}
              disabled={exporting}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting
                ? t('gdpr.exporting', 'Exporting...')
                : t('gdpr.exportAs', 'Export as {{format}}', { format: exportFormat.toUpperCase() })}
            </Button>
          </div>

          {/* Delete Account */}
          <div className="space-y-3 pt-6 border-t">
            <div className="space-y-1">
              <Label className="text-base text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t('gdpr.deleteAccount')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('gdpr.deleteAccountDesc')}
              </p>
            </div>

            {pendingDeletion ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3">
                <p className="text-sm font-medium text-destructive">
                  {t('gdpr.deletionScheduledFor', 'Account deletion scheduled for {{date}}', { date: new Date(pendingDeletion.scheduled_for).toLocaleDateString() })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('gdpr.canCancelBefore')}
                </p>
                <Button 
                  onClick={handleCancelDeletion}
                  variant="outline"
                  size="sm"
                >
                  {t('gdpr.cancelDeletion')}
                </Button>
              </div>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('gdpr.deleteMyAccount')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('gdpr.areYouSure')}</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        {t('gdpr.deletionWarningIntro', 'This will schedule your account for permanent deletion in 30 days. All of your data including:')}
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>{t('gdpr.deletionDataProfile', 'Profile information')}</li>
                        <li>{t('gdpr.deletionDataApplications', 'Applications and submissions')}</li>
                        <li>{t('gdpr.deletionDataMessages', 'Messages and conversations')}</li>
                        <li>{t('gdpr.deletionDataDocuments', 'Documents and uploads')}</li>
                        <li>{t('gdpr.deletionDataActivity', 'Activity history')}</li>
                      </ul>
                      <p className="font-medium">
                        {t('gdpr.deletionWarningOutro', 'will be permanently deleted. You can cancel this request anytime within the 30-day grace period.')}
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2 py-4">
                    <Label htmlFor="reason">{t('gdpr.deletionReason')}</Label>
                    <Textarea
                      id="reason"
                      placeholder={t('gdpr.deletionReasonPlaceholder')}
                      value={deletionReason}
                      onChange={(e) => setDeletionReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRequestDeletion}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? t('common:status.processing') : t('gdpr.scheduleDeletion')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Restrict Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5" />
            {t('gdpr.restrictProcessing', 'Restrict Processing')}
          </CardTitle>
          <CardDescription>
            {t(
              'gdpr.restrictProcessingDesc',
              'You have the right to request restriction of processing of your personal data under GDPR Article 18. When restricted, your data will be stored but not actively processed for matching, AI analysis, or sharing with partners.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="restrict-all" className="text-base">
                {t('gdpr.restrictAllProcessing', 'Restrict all non-essential processing')}
              </Label>
            </div>
            <Switch
              id="restrict-all"
              checked={restrictAll}
              onCheckedChange={handleRestrictAllToggle}
            />
          </div>

          {restrictAll && (
            <div className="ml-6 space-y-4 border-l-2 border-muted pl-4">
              {restrictionSubOptions.map((option) => (
                <div key={option.key} className="flex items-center justify-between">
                  <Label htmlFor={`restrict-${option.key}`} className="text-sm">
                    {option.label}
                  </Label>
                  <Switch
                    id={`restrict-${option.key}`}
                    checked={restrictions[option.key]}
                    onCheckedChange={(checked) => handleRestrictionChange(option.key, checked)}
                  />
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {t('gdpr.essentialProcessingNote', 'Essential processing (account security, legal obligations) cannot be restricted.')}
          </p>

          {restrictionRequested && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('gdpr.restrictionActive', 'Processing restriction is currently active on your account.')}
              </p>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <PauseCircle className="w-4 h-4 mr-2" />
                {t('gdpr.requestFullRestriction', 'Request Full Restriction')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('gdpr.confirmRestrictionTitle', 'Confirm Processing Restriction')}
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    {t(
                      'gdpr.confirmRestrictionDesc',
                      'Requesting full restriction will have the following consequences:'
                    )}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>{t('gdpr.restrictConsequence1', 'Your profile will be hidden from search results')}</li>
                    <li>{t('gdpr.restrictConsequence2', 'You will not receive job matching recommendations')}</li>
                    <li>{t('gdpr.restrictConsequence3', 'AI-powered career insights will be paused')}</li>
                    <li>{t('gdpr.restrictConsequence4', 'Partners will not be able to view your profile')}</li>
                    <li>{t('gdpr.restrictConsequence5', 'Marketing and analytics processing will stop')}</li>
                  </ul>
                  <p className="text-sm font-medium">
                    {t(
                      'gdpr.restrictEssentialContinue',
                      'Essential processing for account security and legal compliance will continue. You can lift the restriction at any time.'
                    )}
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common:actions.cancel', 'Cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleRequestFullRestriction}>
                  {t('gdpr.confirmRestriction', 'Confirm Restriction')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Marketing Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {t('gdpr.marketingPreferences', 'Marketing Preferences')}
          </CardTitle>
          <CardDescription>
            {t('gdpr.marketingPreferencesDesc', 'Control which marketing communications you receive')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="career-emails">
                {t('gdpr.careerOpportunityEmails', 'Receive career opportunity emails')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('gdpr.careerOpportunityEmailsDesc', 'Job matches, recruiter outreach, and career recommendations')}
              </p>
            </div>
            <Switch
              id="career-emails"
              checked={marketingPrefs.career_opportunity_emails}
              disabled={savingMarketing}
              onCheckedChange={(checked) => handleMarketingToggle('career_opportunity_emails', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="platform-updates">
                {t('gdpr.platformUpdates', 'Receive platform updates and newsletters')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('gdpr.platformUpdatesDesc', 'Product updates, feature announcements, and newsletters')}
              </p>
            </div>
            <Switch
              id="platform-updates"
              checked={marketingPrefs.platform_updates}
              disabled={savingMarketing}
              onCheckedChange={(checked) => handleMarketingToggle('platform_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="partner-comms">
                {t('gdpr.partnerCommunications', 'Receive partner communications')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('gdpr.partnerCommunicationsDesc', 'Messages and updates from recruitment partners')}
              </p>
            </div>
            <Switch
              id="partner-comms"
              checked={marketingPrefs.partner_communications}
              disabled={savingMarketing}
              onCheckedChange={(checked) => handleMarketingToggle('partner_communications', checked)}
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t('gdpr.operationalEmailsNote', 'You can change these preferences at any time. Operational emails (security alerts, account notifications) cannot be disabled.')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Consent History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('gdpr.consentHistory', 'Consent History')}
          </CardTitle>
          <CardDescription>
            {t('gdpr.consentHistoryDesc', "Review all consents you've given, including dates, versions, and current status.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConsentReceiptsViewer />
        </CardContent>
      </Card>

      {/* Cookie Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cookie className="w-5 h-5" />
            {t('gdpr.cookiePreferences', 'Cookie Preferences')}
          </CardTitle>
          <CardDescription>
            {t('gdpr.cookiePreferencesDesc', 'Manage your cookie consent settings. You can update your preferences at any time.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem('cookie_consent');
              notify.success(
                t('gdpr.cookieBannerReopened', 'Cookie Preferences Reset'),
                { description: t('gdpr.cookieBannerReopenedDesc', 'The cookie consent banner will reappear. Scroll down or refresh the page to update your preferences.') }
              );
              // Force re-render of cookie banner by dispatching a storage event
              window.dispatchEvent(new StorageEvent('storage', { key: 'cookie_consent' }));
              // Reload to show the banner
              setTimeout(() => window.location.reload(), 1000);
            }}
          >
            <Cookie className="w-4 h-4 mr-2" />
            {t('gdpr.manageCookiePreferences', 'Manage Cookie Preferences')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
