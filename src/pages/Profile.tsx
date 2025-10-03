import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Briefcase, DollarSign, Settings, Upload, Bell, Shield, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const [profileData, setProfileData] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 234 567 8900",
    location: "San Francisco, USA",
    currentTitle: "Senior Product Manager",
    linkedin: "https://linkedin.com/in/johndoe",
    currentSalary: "$150,000 - $180,000",
    desiredSalary: "$200,000 - $250,000",
    noticePeriod: "2 weeks",
    preferences: "Remote-first companies, Tech industry, Leadership opportunities",
  });

  const [settings, setSettings] = useState({
    emailNotifications: true,
    applicationUpdates: true,
    weeklyDigest: false,
    profileVisibility: true,
    shareWithPartners: true,
  });

  const [resume, setResume] = useState<File | null>(null);
  
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSettingChange = (setting: keyof typeof settings) => {
    setSettings({
      ...settings,
      [setting]: !settings[setting],
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
      toast.success("Resume uploaded successfully");
    }
  };

  useEffect(() => {
    // Check if we have a stored access token
    const storedToken = localStorage.getItem('google_calendar_token');
    if (storedToken) {
      setAccessToken(storedToken);
      setCalendarConnected(true);
    }
  }, []);

  const handleConnectCalendar = async () => {
    try {
      setCalendarLoading(true);
      
      const redirectUri = `${window.location.origin}/profile`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'getAuthUrl', redirectUri }
      });

      if (error) throw error;

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Calendar connection error:', error);
      toast.error('Failed to connect Google Calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = () => {
    localStorage.removeItem('google_calendar_token');
    setAccessToken(null);
    setCalendarConnected(false);
    toast.success('Google Calendar disconnected');
  };

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code && !accessToken) {
      (async () => {
        try {
          const redirectUri = `${window.location.origin}/profile`;
          
          const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
            body: { action: 'exchangeCode', code, redirectUri }
          });

          if (error) throw error;

          const token = data.tokens.access_token;
          localStorage.setItem('google_calendar_token', token);
          setAccessToken(token);
          setCalendarConnected(true);
          
          // Clean up URL
          window.history.replaceState({}, document.title, '/profile');
          
          toast.success('Google Calendar connected successfully!');
        } catch (error) {
          console.error('Token exchange error:', error);
          toast.error('Failed to complete calendar connection');
        }
      })();
    }
  }, [accessToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Here you would typically send data to backend
    console.log("Profile updated:", profileData);
    console.log("Settings updated:", settings);
    
    toast.success("Profile updated successfully!");
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Profile & Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleInputChange}
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
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
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleInputChange}
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={profileData.location}
                  onChange={handleInputChange}
                  placeholder="City, Country"
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
                Professional Details
              </CardTitle>
              <CardDescription>Your career information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentTitle">Current Title</Label>
                <Input
                  id="currentTitle"
                  name="currentTitle"
                  value={profileData.currentTitle}
                  onChange={handleInputChange}
                  className="bg-background/50"
                />
              </div>

              <div>
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
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
                <Label htmlFor="preferences">Career Preferences</Label>
                <Textarea
                  id="preferences"
                  name="preferences"
                  value={profileData.preferences}
                  onChange={handleInputChange}
                  placeholder="e.g., Remote work, specific industries, company size..."
                  rows={4}
                  className="bg-background/50 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Resume/CV */}
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-accent" />
                Resume/CV
              </CardTitle>
              <CardDescription>Update your resume for the latest opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-accent/30 rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
                <input
                  type="file"
                  id="resume"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="resume" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-accent" />
                  <p className="text-sm font-medium mb-1">
                    {resume ? resume.name : "Click to upload new resume"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, or DOCX (Max 10MB)
                  </p>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Compensation Bands */}
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent" />
                Compensation & Salary Bands
              </CardTitle>
              <CardDescription>Help us match you with appropriate opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currentSalary">Current Salary Range (Optional)</Label>
                  <Input
                    id="currentSalary"
                    name="currentSalary"
                    value={profileData.currentSalary}
                    onChange={handleInputChange}
                    placeholder="e.g., $150,000 - $200,000"
                    className="bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Confidential - helps us better match opportunities
                  </p>
                </div>
                <div>
                  <Label htmlFor="desiredSalary">Desired Salary Range</Label>
                  <Input
                    id="desiredSalary"
                    name="desiredSalary"
                    value={profileData.desiredSalary}
                    onChange={handleInputChange}
                    placeholder="e.g., $180,000 - $250,000"
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="noticePeriod">Notice Period</Label>
                <Input
                  id="noticePeriod"
                  name="noticePeriod"
                  value={profileData.noticePeriod}
                  onChange={handleInputChange}
                  placeholder="e.g., 2 weeks, 1 month, Immediate"
                  className="bg-background/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Google Calendar Integration */}
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                Google Calendar Integration
              </CardTitle>
              <CardDescription>
                Connect your Google Calendar to automatically schedule meetings and sync with client/recruiter agendas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  {calendarConnected ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Calendar Connected</p>
                        <p className="text-sm text-muted-foreground">
                          Your Google Calendar is synced and ready
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Calendar Not Connected</p>
                        <p className="text-sm text-muted-foreground">
                          Connect to enable automatic scheduling
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {calendarConnected ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisconnectCalendar}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleConnectCalendar}
                    disabled={calendarLoading}
                    className="bg-gradient-accent text-background"
                  >
                    {calendarLoading ? 'Connecting...' : 'Connect Calendar'}
                  </Button>
                )}
              </div>

              {calendarConnected && (
                <div className="space-y-2 p-4 border border-border rounded-lg bg-background/30">
                  <h4 className="font-medium text-sm">Features Enabled:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Automatic meeting creation for interviews</li>
                    <li>✓ Find open time slots with recruiters and clients</li>
                    <li>✓ Sync your availability across all calendars</li>
                    <li>✓ Prevent double-booking conflicts</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notifications & Privacy Settings */}
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-accent" />
                Notifications & Privacy
              </CardTitle>
              <CardDescription>Manage how you receive updates and who can see your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-accent" />
                  <h4 className="font-semibold">Notifications</h4>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications" className="font-normal cursor-pointer">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email updates about your applications
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={() => handleSettingChange('emailNotifications')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="applicationUpdates" className="font-normal cursor-pointer">
                      Application Updates
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when your application status changes
                    </p>
                  </div>
                  <Switch
                    id="applicationUpdates"
                    checked={settings.applicationUpdates}
                    onCheckedChange={() => handleSettingChange('applicationUpdates')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="weeklyDigest" className="font-normal cursor-pointer">
                      Weekly Digest
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of new opportunities
                    </p>
                  </div>
                  <Switch
                    id="weeklyDigest"
                    checked={settings.weeklyDigest}
                    onCheckedChange={() => handleSettingChange('weeklyDigest')}
                  />
                </div>
              </div>

              <Separator className="my-6" />

              {/* Privacy */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-accent" />
                  <h4 className="font-semibold">Privacy</h4>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="profileVisibility" className="font-normal cursor-pointer">
                      Profile Visibility
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Make your profile visible to partner companies
                    </p>
                  </div>
                  <Switch
                    id="profileVisibility"
                    checked={settings.profileVisibility}
                    onCheckedChange={() => handleSettingChange('profileVisibility')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="shareWithPartners" className="font-normal cursor-pointer">
                      Share with Elite Partners
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow us to share your profile with our elite network
                    </p>
                  </div>
                  <Switch
                    id="shareWithPartners"
                    checked={settings.shareWithPartners}
                    onCheckedChange={() => handleSettingChange('shareWithPartners')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-accent text-background font-semibold px-8 shadow-glow hover:opacity-90 transition-opacity"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Profile;
