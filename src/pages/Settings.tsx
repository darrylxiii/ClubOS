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
          <SettingsIcon className="w-8 h-8 text-white" />
          <div>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-white">Settings</h1>
            <p className="text-white/70">Your club profile is your calling card – only visible to invite-only members</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="account" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Account</TabsTrigger>
            <TabsTrigger value="notifications" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Notifications</TabsTrigger>
            <TabsTrigger value="privacy" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Privacy</TabsTrigger>
            <TabsTrigger value="preferences" className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-semibold">
                  <User className="w-5 h-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription className="text-white/70">
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

            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-semibold">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription className="text-white/70">
                  Complete your profile to get the best matches
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname" className="text-white font-semibold">Full Name *</Label>
                  <Input 
                    id="fullname" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="bg-white/90 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title" className="text-white font-semibold">Current Title</Label>
                  <Input 
                    id="title" 
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className="bg-white/90 text-gray-900 placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-white font-semibold">Professional Bio</Label>
                  <Textarea 
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about your experience and what you're looking for..."
                    className="bg-white/90 text-gray-900 placeholder:text-gray-500 min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-white font-semibold">Location</Label>
                    <Input 
                      id="location" 
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                      placeholder="City, Country"
                      className="bg-white/90 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white font-semibold">Phone Number</Label>
                    <Input 
                      id="phone" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+31 6 12345678"
                      className="bg-white/90 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white font-semibold">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ""} 
                    disabled
                    className="bg-white/50 text-gray-900"
                  />
                  <p className="text-xs text-white/60">
                    Contact support to change your email address
                  </p>
                </div>

                <Button 
                  onClick={handleSaveAccount}
                  disabled={saving}
                  className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-semibold">
                  <Lock className="w-5 h-5" />
                  Security
                </CardTitle>
                <CardDescription className="text-white/70">
                  Manage your security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white font-semibold">Two-Factor Authentication</Label>
                    <p className="text-sm text-white/70">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">Enable</Button>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-2">
                  <Label className="text-white font-semibold">Change Password</Label>
                  <p className="text-sm text-white/70">
                    Update your password regularly to keep your account secure
                  </p>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-semibold">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-white/70">
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white font-semibold">Email Notifications</Label>
                    <p className="text-sm text-white/70">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch 
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator className="bg-white/20" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white font-semibold">Push Notifications</Label>
                    <p className="text-sm text-white/70">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch 
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <Separator className="bg-white/20" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white font-semibold">Job Alerts</Label>
                    <p className="text-sm text-white/70">
                      Get notified about new job matches
                    </p>
                  </div>
                  <Switch 
                    checked={jobAlerts}
                    onCheckedChange={setJobAlerts}
                  />
                </div>

                <Separator className="bg-white/20" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white font-semibold">Message Notifications</Label>
                    <p className="text-sm text-white/70">
                      Get notified about new messages
                    </p>
                  </div>
                  <Switch 
                    checked={messageNotifications}
                    onCheckedChange={setMessageNotifications}
                  />
                </div>

                <Button 
                  onClick={handleSaveNotifications}
                  className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold"
                >
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-semibold">
                  <Lock className="w-5 h-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription className="text-white/70">
                  Control who can see your information – settings are private to members only
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white font-semibold">Profile Visibility</Label>
                    <p className="text-sm text-white/70">
                      Make your profile visible to companies
                    </p>
                  </div>
                  <Switch 
                    checked={profileVisibility}
                    onCheckedChange={setProfileVisibility}
                  />
                </div>

                <Separator className="bg-white/20" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white font-semibold">Current Employer Shield</Label>
                    <p className="text-sm text-white/70">
                      Hide your profile from your current employer
                    </p>
                  </div>
                  <Switch 
                    checked={employerShield}
                    onCheckedChange={setEmployerShield}
                  />
                </div>

                <Separator className="bg-white/20" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white font-semibold">Show Contact Information</Label>
                    <p className="text-sm text-white/70">
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
                  className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Privacy Settings'}
                </Button>

                <Separator className="bg-white/20" />

                <div className="space-y-2">
                  <Label className="text-white font-semibold">Data Export (GDPR)</Label>
                  <p className="text-sm text-white/70">
                    Download all your data in a portable format
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={handleExportData}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Request Data Export
                  </Button>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-2">
                  <Label className="text-destructive font-semibold">Delete Account</Label>
                  <p className="text-sm text-white/70">
                    Permanently delete your account and all data
                  </p>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-semibold">
                  <Globe className="w-5 h-5" />
                  Display Preferences
                </CardTitle>
                <CardDescription className="text-white/70">
                  Customize how the platform looks for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white font-semibold">Language</Label>
                  <select className="w-full p-2 border border-white/20 rounded-md bg-white/10 text-white">
                    <option className="bg-gray-900">English</option>
                    <option className="bg-gray-900">Nederlands</option>
                  </select>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-2">
                  <Label className="text-white font-semibold">Timezone</Label>
                  <select className="w-full p-2 border border-white/20 rounded-md bg-white/10 text-white">
                    <option className="bg-gray-900">Europe/Amsterdam</option>
                    <option className="bg-gray-900">America/New_York</option>
                    <option className="bg-gray-900">Asia/Tokyo</option>
                  </select>
                </div>

                <Separator className="bg-white/20" />

                <div className="space-y-2">
                  <Label className="text-white font-semibold">Currency</Label>
                  <select className="w-full p-2 border border-white/20 rounded-md bg-white/10 text-white">
                    <option className="bg-gray-900">EUR (€)</option>
                    <option className="bg-gray-900">USD ($)</option>
                    <option className="bg-gray-900">GBP (£)</option>
                  </select>
                </div>

                <Button 
                  onClick={() => toast.success("Preferences saved")}
                  className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold"
                >
                  Save Preferences
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white font-semibold">
                  <Sparkles className="w-5 h-5" />
                  Career Preferences
                </CardTitle>
                <CardDescription className="text-white/70">
                  Set your salary expectations and career goals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white font-semibold">Expected Salary Range</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="Min (€)"
                      className="bg-white/90 text-gray-900 placeholder:text-gray-500"
                    />
                    <Input 
                      placeholder="Max (€)"
                      className="bg-white/90 text-gray-900 placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-semibold">Preferred Job Type</Label>
                  <select className="w-full p-2 border border-white/20 rounded-md bg-white/10 text-white">
                    <option className="bg-gray-900">Full-time</option>
                    <option className="bg-gray-900">Part-time</option>
                    <option className="bg-gray-900">Contract</option>
                    <option className="bg-gray-900">Freelance</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white font-semibold">Work Location Preference</Label>
                  <select className="w-full p-2 border border-white/20 rounded-md bg-white/10 text-white">
                    <option className="bg-gray-900">Remote</option>
                    <option className="bg-gray-900">Hybrid</option>
                    <option className="bg-gray-900">On-site</option>
                  </select>
                </div>

                <Button 
                  onClick={() => {
                    localStorage.setItem('salary_set', 'true');
                    localStorage.setItem('preferences_set', 'true');
                    toast.success("Career preferences saved");
                  }}
                  className="w-full bg-white text-gray-900 hover:bg-white/90 font-semibold"
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