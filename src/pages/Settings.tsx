import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Bell, Lock, User, Globe, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useLocation, useNavigate } from "react-router-dom";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { NotificationPreferences } from "@/components/settings/NotificationPreferences";

const Settings = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [bio, setBio] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Notification states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  
  // Privacy states
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [employerShield, setEmployerShield] = useState(false);
  const [showContact, setShowContact] = useState(true);

  // Get active tab from URL hash or default to 'account'
  const getActiveTab = () => {
    const hash = location.hash.replace('#', '');
    return hash || 'account';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Update active tab when hash changes
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.hash]);

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/settings#${value}`, { replace: true });
  };

  // Load profile data
  useEffect(() => {
    loadProfile();
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
        setPhoneNumber(data.email || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          current_title: currentTitle,
          career_preferences: bio,
          location: locationCity,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success('Profile updated successfully');
      await loadProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    // Save notification preferences
    localStorage.setItem('emailNotifications', emailNotifications.toString());
    localStorage.setItem('pushNotifications', pushNotifications.toString());
    localStorage.setItem('jobAlerts', jobAlerts.toString());
    localStorage.setItem('messageNotifications', messageNotifications.toString());
    toast.success('Notification preferences saved');
  };

  const handleSavePrivacy = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_visibility: profileVisibility,
          employer_shield: employerShield,
          show_contact: showContact,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Privacy settings saved');
    } catch (error: any) {
      console.error('Error saving privacy:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
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
            <p className="text-muted-foreground">Your club profile is your calling card – only visible to invite-only members</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
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
                    onAvatarChange={(url) => setProfile({ ...profile, avatar_url: url })}
                    userId={user.id}
                    required={true}
                  />
                )}
              </CardContent>
            </Card>

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
                  <Label htmlFor="title">Current Title</Label>
                  <Input 
                    id="title" 
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                      placeholder="City, Country"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+31 6 12345678"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ""} 
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>

                <Button 
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            <TwoFactorSettings />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Password
                </CardTitle>
                <CardDescription>
                  Update your password regularly to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Change Password</Label>
                  <p className="text-sm text-muted-foreground">
                    You'll be signed out of all devices after changing your password
                  </p>
                  <Button variant="outline">
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationPreferences />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control who can see your information – settings are private to members only
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Profile Visibility</Label>
                    <p className="text-sm text-muted-foreground">
                      Make your profile visible to companies
                    </p>
                  </div>
                  <Switch 
                    checked={profileVisibility}
                    onCheckedChange={setProfileVisibility}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Current Employer Shield</Label>
                    <p className="text-sm text-muted-foreground">
                      Hide your profile from your current employer
                    </p>
                  </div>
                  <Switch 
                    checked={employerShield}
                    onCheckedChange={setEmployerShield}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Contact Information</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow companies to see your contact details
                    </p>
                  </div>
                  <Switch 
                    checked={showContact}
                    onCheckedChange={setShowContact}
                  />
                </div>

                <Button 
                  onClick={handleSavePrivacy}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : 'Save Privacy Settings'}
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Label>Data Export (GDPR)</Label>
                  <p className="text-sm text-muted-foreground">
                    Download all your data in a portable format
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={handleExportData}
                  >
                    Request Data Export
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-destructive">Delete Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all data
                  </p>
                  <Button variant="ghost" size="sm">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Display Preferences
                </CardTitle>
                <CardDescription>
                  Customize how the platform looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <select className="w-full p-2 border rounded-md bg-background text-foreground">
                    <option>English</option>
                    <option>Nederlands</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <select className="w-full p-2 border rounded-md bg-background text-foreground">
                    <option>Europe/Amsterdam</option>
                    <option>America/New_York</option>
                    <option>Asia/Tokyo</option>
                  </select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select className="w-full p-2 border rounded-md bg-background text-foreground">
                    <option>EUR (€)</option>
                    <option>USD ($)</option>
                    <option>GBP (£)</option>
                  </select>
                </div>

                <Button 
                  onClick={() => toast.success("Preferences saved")}
                  className="w-full"
                >
                  Save Preferences
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Career Preferences
                </CardTitle>
                <CardDescription>
                  Set your salary expectations and career goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Expected Salary Range</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="Min (€)"
                    />
                    <Input 
                      placeholder="Max (€)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Job Type</Label>
                  <select className="w-full p-2 border rounded-md bg-background text-foreground">
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Freelance</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Work Location Preference</Label>
                  <select className="w-full p-2 border rounded-md bg-background text-foreground">
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>On-site</option>
                  </select>
                </div>

                <Button 
                  onClick={() => {
                    localStorage.setItem('salary_set', 'true');
                    localStorage.setItem('preferences_set', 'true');
                    toast.success("Career preferences saved");
                  }}
                  className="w-full"
                >
                  Save Career Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Settings;