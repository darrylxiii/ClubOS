import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PrivacyTabProps {
  privacySettings: {
    share_full_name: boolean;
    share_email: boolean;
    share_phone: boolean;
    share_location: boolean;
    share_current_title: boolean;
    share_linkedin_url: boolean;
    share_career_preferences: boolean;
    share_resume: boolean;
    share_salary_expectations: boolean;
    share_notice_period: boolean;
  };
  userId: string | null;
  isSaving: boolean;
  onPrivacyChange: (field: string, value: boolean) => void;
  onSave: () => void;
}

export function PrivacyTab({
  privacySettings,
  userId,
  isSaving,
  onPrivacyChange,
  onSave,
}: PrivacyTabProps) {
  const { t } = useTranslation('settings');
  const privacyItems = [
    { key: 'share_full_name', label: t('privacy.shareFullName', 'Full Name'), description: t('privacy.shareFullNameDesc', 'Share your full name with partners') },
    { key: 'share_email', label: t('privacy.shareEmail', 'Email Address'), description: t('privacy.shareEmailDesc', 'Share your email with partners') },
    { key: 'share_phone', label: t('privacy.sharePhone', 'Phone Number'), description: t('privacy.sharePhoneDesc', 'Share your phone number with partners') },
    { key: 'share_location', label: t('privacy.shareLocation', 'Location'), description: t('privacy.shareLocationDesc', 'Share your location with partners') },
    { key: 'share_current_title', label: t('privacy.shareCurrentTitle', 'Current Title'), description: t('privacy.shareCurrentTitleDesc', 'Share your job title') },
    { key: 'share_linkedin_url', label: t('privacy.shareLinkedIn', 'LinkedIn Profile'), description: t('privacy.shareLinkedInDesc', 'Share your LinkedIn URL') },
    { key: 'share_career_preferences', label: t('privacy.shareCareerPreferences', 'Career Preferences'), description: t('privacy.shareCareerPreferencesDesc', 'Share your career goals') },
    { key: 'share_resume', label: t('privacy.shareResume', 'Resume/CV'), description: t('privacy.shareResumeDesc', 'Share your resume document') },
    { key: 'share_salary_expectations', label: t('privacy.shareSalary', 'Salary Expectations'), description: t('privacy.shareSalaryDesc', 'Share your salary range') },
    { key: 'share_notice_period', label: t('privacy.shareNoticePeriod', 'Notice Period'), description: t('privacy.shareNoticePeriodDesc', 'Share your availability timeline') },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>{t("employer_shield", "Employer Shield")}</CardTitle>
          </div>
          <CardDescription>
            {t('privacy.employerShieldDesc', 'Prevent your current employer from seeing your profile')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {t('privacy.employerShieldAlert', 'When enabled, blocked companies cannot find you in search results, view your dossier, or receive your profile in shortlists. Add companies below to activate.')}
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">
            {t('privacy.employerShieldNote', 'Manage blocked companies in the "Blocked Companies" section below. Your profile will be completely hidden from recruiters at those organisations.')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("data_sharing_preferences", "Data Sharing Preferences")}</CardTitle>
          <CardDescription>
            {t('privacy.profileInfoSharingDesc', 'Control what information partners can see about you')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {privacyItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={item.key}>{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={item.key}
                checked={privacySettings[item.key as keyof typeof privacySettings]}
                onCheckedChange={(checked) => onPrivacyChange(item.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={isSaving}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('actions.save', 'Save Changes')}
      </Button>
    </div>
  );
}
