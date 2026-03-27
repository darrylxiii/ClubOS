import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { User, Briefcase } from 'lucide-react';
import { AvatarUpload } from '@/components/AvatarUpload';
import { PhoneVerification } from '@/components/PhoneVerification';
import { EmailVerification } from '@/components/EmailVerification';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';

interface ProfileTabProps {
  user: any;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  profileData: {
    firstName: string;
    lastName: string;
    email: string;
    location: string;
    currentTitle: string;
    linkedin: string;
    preferences: string;
  };
  phoneNumber: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  cities: Array<{ id: string; name: string; country: string }>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePhoneChange: (value: string | undefined) => void;
  handleVerificationComplete: () => void;
  handleEmailVerificationComplete: () => void;
  setProfileData: (data: any) => void;
  debouncedSave: () => void;
}

export const ProfileTab = ({
  user,
  avatarUrl,
  setAvatarUrl,
  profileData,
  phoneNumber,
  phoneVerified,
  emailVerified,
  cities,
  handleInputChange,
  handlePhoneChange,
  handleVerificationComplete,
  handleEmailVerificationComplete,
  setProfileData,
  debouncedSave,
}: ProfileTabProps) => {
  const { t } = useTranslation('settings');
  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            {t('profile.personalInfo')}
          </CardTitle>
          <CardDescription>{t('profile.personalInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <AvatarUpload
              avatarUrl={avatarUrl}
              onAvatarChange={setAvatarUrl}
              userId={user.id}
              required={true}
            />
          )}
          
          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">{t('profile.firstName')}</Label>
              <Input
                id="firstName"
                name="firstName"
                value={profileData.firstName}
                onChange={handleInputChange}
                className="bg-background/50"
              />
            </div>
            <div>
              <Label htmlFor="lastName">{t('profile.lastName')}</Label>
              <Input
                id="lastName"
                name="lastName"
                value={profileData.lastName}
                onChange={handleInputChange}
                className="bg-background/50"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EmailVerification
              email={profileData.email}
              emailVerified={emailVerified}
              onEmailChange={handleInputChange}
              onVerificationComplete={handleEmailVerificationComplete}
            />
            <PhoneVerification
              phoneNumber={phoneNumber}
              phoneVerified={phoneVerified}
              onPhoneChange={handlePhoneChange}
              onVerificationComplete={handleVerificationComplete}
            />
          </div>

          <div>
            <Label htmlFor="location">{t('profile.currentLocation')}</Label>
            <LocationAutocomplete
              value={profileData.location}
              onChange={(value) => {
                setProfileData({ ...profileData, location: value });
                debouncedSave();
              }}
              placeholder={t('profile.searchCitiesPlaceholder')}
              className="bg-background/50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-accent" />
            {t('profile.professionalDetails')}
          </CardTitle>
          <CardDescription>{t('profile.careerInfo')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentTitle">{t('profile.currentTitle')}</Label>
            <Input
              id="currentTitle"
              name="currentTitle"
              value={profileData.currentTitle}
              onChange={handleInputChange}
              className="bg-background/50"
            />
          </div>

          <div>
            <Label htmlFor="linkedin">{t('profile.linkedinProfile')}</Label>
            <Input
              id="linkedin"
              name="linkedin"
              type="url"
              value={profileData.linkedin}
              onChange={handleInputChange}
              placeholder="https://linkedin.com/in/yourprofile"
              className="bg-background/50"
            />
          </div>

          <div>
            <Label htmlFor="preferences">{t('profile.careerPreferences')}</Label>
            <Textarea
              id="preferences"
              name="preferences"
              value={profileData.preferences}
              onChange={handleInputChange}
              placeholder={t('profile.careerPreferencesPlaceholder')}
              rows={4}
              className="bg-background/50 resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
