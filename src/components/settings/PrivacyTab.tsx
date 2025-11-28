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
  const privacyItems = [
    { key: 'share_full_name', label: 'Full Name', description: 'Share your full name with partners' },
    { key: 'share_email', label: 'Email Address', description: 'Share your email with partners' },
    { key: 'share_phone', label: 'Phone Number', description: 'Share your phone number with partners' },
    { key: 'share_location', label: 'Location', description: 'Share your location with partners' },
    { key: 'share_current_title', label: 'Current Title', description: 'Share your job title' },
    { key: 'share_linkedin_url', label: 'LinkedIn Profile', description: 'Share your LinkedIn URL' },
    { key: 'share_career_preferences', label: 'Career Preferences', description: 'Share your career goals' },
    { key: 'share_resume', label: 'Resume/CV', description: 'Share your resume document' },
    { key: 'share_salary_expectations', label: 'Salary Expectations', description: 'Share your salary range' },
    { key: 'share_notice_period', label: 'Notice Period', description: 'Share your availability timeline' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Employer Shield</CardTitle>
          </div>
          <CardDescription>
            Prevent your current employer from seeing your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Block specific companies from viewing your profile in the Privacy settings below
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Sharing Preferences</CardTitle>
          <CardDescription>
            Control what information partners can see about you
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
        Save Changes
      </Button>
    </div>
  );
}
