import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
            Profile Picture
          </CardTitle>
          <CardDescription>
            Add a professional photo to complete your profile
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
            Personal Information
          </CardTitle>
          <CardDescription>
            Complete your profile to get the best matches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullname">Full Name *</Label>
            <Input 
              id="fullname" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Current Location</Label>
            <LocationAutocomplete
              value={locationCity}
              onChange={setLocationCity}
              placeholder="Type to search cities worldwide..."
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
            {saving ? 'Saving...' : 'Save Personal Information'}
          </Button>
        </CardContent>
      </Card>

      {/* Professional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Professional Details
          </CardTitle>
          <CardDescription>
            Your career information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Current Title</Label>
            <Input 
              id="title" 
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn Profile</Label>
            <Input
              id="linkedin"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea 
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your experience and what you're looking for..."
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
            Preferred Work Locations
          </CardTitle>
          <CardDescription>
            Specify where you'd like to work - add multiple cities or toggle remote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Remote Toggle */}
          <div className="flex items-center justify-between p-4 border-2 border-border rounded-lg bg-accent/5">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <div>
                <Label htmlFor="remoteWork" className="text-base font-semibold cursor-pointer">
                  Open to Remote Work
                </Label>
                <p className="text-sm text-muted-foreground">
                  Work from anywhere in the world
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
            <Label>Add Preferred Cities</Label>
            <div className="flex gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a city" />
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
                Add
              </Button>
            </div>
          </div>

          {/* Selected Locations */}
          {preferredWorkLocations.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Locations:</p>
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
                No preferred locations added yet. {remoteWorkPreference ? 'Remote work is enabled.' : 'Add cities or enable remote work.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
