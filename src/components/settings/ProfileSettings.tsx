import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, MapPin, Globe, Briefcase, X } from 'lucide-react';
import { AvatarUpload } from '@/components/AvatarUpload';
import { EmailVerification } from '@/components/EmailVerification';
import { PhoneVerification } from '@/components/PhoneVerification';
import { Switch } from '@/components/ui/switch';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';

interface ProfileSettingsProps {
  user: any;
  profile: any;
  fullName: string;
  setFullName: (value: string) => void;
  currentTitle: string;
  setCurrentTitle: (value: string) => void;
  bio: string;
  setBio: (value: string) => void;
  locationCity: string;
  setLocationCity: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  phoneVerified: boolean;
  setPhoneVerified: (value: boolean) => void;
  emailVerified: boolean;
  setEmailVerified: (value: boolean) => void;
  linkedinUrl: string;
  setLinkedinUrl: (value: string) => void;
  preferredWorkLocations: string[];
  setPreferredWorkLocations: (value: string[]) => void;
  remoteWorkPreference: boolean;
  setRemoteWorkPreference: (value: boolean) => void;
  cities: Array<{ id: string; name: string; country: string }>;
  onSave: () => void;
  onAvatarChange: (url: string) => void;
  saving: boolean;
}

export const ProfileSettings = ({
  user,
  profile,
  fullName,
  setFullName,
  currentTitle,
  setCurrentTitle,
  bio,
  setBio,
  locationCity,
  setLocationCity,
  phoneNumber,
  setPhoneNumber,
  phoneVerified,
  setPhoneVerified,
  emailVerified,
  setEmailVerified,
  linkedinUrl,
  setLinkedinUrl,
  preferredWorkLocations,
  setPreferredWorkLocations,
  remoteWorkPreference,
  setRemoteWorkPreference,
  cities,
  onSave,
  onAvatarChange,
  saving
}: ProfileSettingsProps) => {
  const { t } = useTranslation('settings');
  const [selectedCity, setSelectedCity] = useState('');

  const handleAddPreferredLocation = () => {
    if (selectedCity && !preferredWorkLocations.includes(selectedCity)) {
      setPreferredWorkLocations([...preferredWorkLocations, selectedCity]);
      setSelectedCity('');
    }
  };

  const handleRemovePreferredLocation = (location: string) => {
    setPreferredWorkLocations(preferredWorkLocations.filter(loc => loc !== location));
  };

  return (
    <div className="space-y-4">
      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('profile.profilePicture')}
          </CardTitle>
          <CardDescription>
            {t('profile.profilePictureDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user && (
            <AvatarUpload
              avatarUrl={profile?.avatar_url}
              onAvatarChange={onAvatarChange}
              userId={user.id}
              required={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('profile.personalInfo')}
          </CardTitle>
          <CardDescription>
            {t('profile.completeProfileDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullname">{t('profile.fullName')} *</Label>
            <Input 
              id="fullname" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('profile.fullNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('profile.currentLocation')}</Label>
            <LocationAutocomplete
              value={locationCity}
              onChange={setLocationCity}
              placeholder={t('profile.searchCitiesPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EmailVerification
              email={user?.email || ''}
              emailVerified={emailVerified}
              onEmailChange={() => {}}
              onVerificationComplete={() => setEmailVerified(true)}
            />
            <PhoneVerification
              phoneNumber={phoneNumber}
              phoneVerified={phoneVerified}
              onPhoneChange={setPhoneNumber}
              onVerificationComplete={() => setPhoneVerified(true)}
            />
          </div>

          <Button onClick={onSave} disabled={saving} className="w-full">
            {saving ? t('common:status.saving') : t('profile.savePersonalInfo')}
          </Button>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {t('profile.professionalDetails')}
          </CardTitle>
          <CardDescription>
            {t('profile.careerInfo')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('profile.currentTitle')}</Label>
            <Input
              id="title"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              placeholder={t('profile.currentTitlePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">{t('profile.linkedinProfile')}</Label>
            <Input
              id="linkedin"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t('profile.professionalBio')}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('profile.professionalBioPlaceholder')}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferred Work Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('preferences.preferredWorkLocations')}
          </CardTitle>
          <CardDescription>
            {t('preferences.preferredWorkLocationsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Remote Toggle */}
          <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg bg-accent/5">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <Label htmlFor="remoteWork" className="text-base font-semibold cursor-pointer">
                  {t('preferences.openToRemoteWork')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('preferences.remoteWorkDesc')}
                </p>
              </div>
            </div>
            <Switch
              id="remoteWork"
              checked={remoteWorkPreference}
              onCheckedChange={setRemoteWorkPreference}
            />
          </div>

          {/* City Selection */}
          <div className="space-y-3">
            <Label>{t('preferences.addPreferredCities')}</Label>
            <div className="flex gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder={t('preferences.selectCity')} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {cities
                    .filter(city => !preferredWorkLocations.includes(`${city.name}, ${city.country}`))
                    .map((city) => (
                      <SelectItem key={city.id} value={`${city.name}, ${city.country}`}>
                        {city.name}, {city.country}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAddPreferredLocation}
                disabled={!selectedCity}
              >
                {t('common:actions.add')}
              </Button>
            </div>
          </div>

          {/* Selected Locations */}
          {preferredWorkLocations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('preferences.selectedLocations')}</p>
              <div className="flex flex-wrap gap-2">
                {preferredWorkLocations.map((location) => (
                  <div
                    key={location}
                    className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg group hover:bg-accent/20 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{location}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePreferredLocation(location)}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('preferences.noLocationsYet')} {remoteWorkPreference ? t('preferences.remoteEnabled') : t('preferences.addCitiesOrRemote')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
