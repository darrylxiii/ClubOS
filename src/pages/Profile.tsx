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
import { User, Briefcase, DollarSign, Settings, Upload, Bell, Shield, Calendar, CheckCircle2, XCircle, FileText, Sparkles, X, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CompanySearch } from "@/components/CompanySearch";

const Profile = () => {
  const [profileData, setProfileData] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    phone: "+1 234 567 8900",
    location: "San Francisco, USA",
    currentTitle: "Senior Product Manager",
    linkedin: "https://linkedin.com/in/johndoe",
    noticePeriod: "2_weeks",
    preferences: "Remote-first companies, Tech industry, Leadership opportunities",
  });

  const [currentSalaryRange, setCurrentSalaryRange] = useState<[number, number]>([150000, 180000]);
  const [desiredSalaryRange, setDesiredSalaryRange] = useState<[number, number]>([200000, 250000]);
  const [blockedCompanies, setBlockedCompanies] = useState<string[]>([]);
  const [companySearchQuery, setCompanySearchQuery] = useState("");

  const [settings, setSettings] = useState({
    emailNotifications: true,
    applicationUpdates: true,
    weeklyDigest: false,
    profileVisibility: true,
    shareWithPartners: true,
  });

  const [resume, setResume] = useState<File | null>(null);
  
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [googleCalendarLoading, setGoogleCalendarLoading] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  const [microsoftCalendarConnected, setMicrosoftCalendarConnected] = useState(false);
  const [microsoftCalendarLoading, setMicrosoftCalendarLoading] = useState(false);
  const [microsoftAccessToken, setMicrosoftAccessToken] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNoticePeriodChange = (value: string) => {
    setProfileData({
      ...profileData,
      noticePeriod: value,
    });
  };

  const handleAddBlockedCompany = (company: { name: string; domain?: string }) => {
    if (company.name && !blockedCompanies.includes(company.name)) {
      setBlockedCompanies([...blockedCompanies, company.name]);
      setCompanySearchQuery("");
      toast.success("Company added to blocklist");
    }
  };

  const handleRemoveBlockedCompany = (company: string) => {
    setBlockedCompanies(blockedCompanies.filter(c => c !== company));
    toast.success("Company removed from blocklist");
  };

  const formatSalary = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
      localStorage.setItem('resume_uploaded', 'true');
      toast.success("Resume uploaded successfully");
    }
  };

  useEffect(() => {
    // Check if we have stored access tokens
    const googleToken = localStorage.getItem('google_calendar_token');
    if (googleToken) {
      setGoogleAccessToken(googleToken);
      setGoogleCalendarConnected(true);
    }

    const microsoftToken = localStorage.getItem('microsoft_calendar_token');
    if (microsoftToken) {
      setMicrosoftAccessToken(microsoftToken);
      setMicrosoftCalendarConnected(true);
    }
  }, []);

  const handleConnectGoogleCalendar = async () => {
    try {
      setGoogleCalendarLoading(true);
      
      const redirectUri = `${window.location.origin}/profile`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'getAuthUrl', redirectUri }
      });

      if (error) throw error;

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      toast.error('Failed to connect Google Calendar');
    } finally {
      setGoogleCalendarLoading(false);
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    localStorage.removeItem('google_calendar_token');
    setGoogleAccessToken(null);
    setGoogleCalendarConnected(false);
    toast.success('Google Calendar disconnected');
  };

  const handleConnectMicrosoftCalendar = async () => {
    try {
      setMicrosoftCalendarLoading(true);
      
      const redirectUri = `${window.location.origin}/profile`;
      
      const { data, error } = await supabase.functions.invoke('microsoft-calendar-auth', {
        body: { action: 'getAuthUrl', redirectUri }
      });

      if (error) throw error;

      // Redirect to Microsoft OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Microsoft Calendar connection error:', error);
      toast.error('Failed to connect Microsoft Calendar');
    } finally {
      setMicrosoftCalendarLoading(false);
    }
  };

  const handleDisconnectMicrosoftCalendar = () => {
    localStorage.removeItem('microsoft_calendar_token');
    setMicrosoftAccessToken(null);
    setMicrosoftCalendarConnected(false);
    toast.success('Microsoft Calendar disconnected');
  };

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state'); // Can be used to determine provider
    
    if (code && !googleAccessToken && !microsoftAccessToken) {
      (async () => {
        try {
          const redirectUri = `${window.location.origin}/profile`;
          
          // Try Google first (you might want to add state parameter to determine provider)
          try {
            const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
              body: { action: 'exchangeCode', code, redirectUri }
            });

            if (!error && data.tokens) {
              const token = data.tokens.access_token;
              localStorage.setItem('google_calendar_token', token);
              setGoogleAccessToken(token);
              setGoogleCalendarConnected(true);
              
              // Clean up URL
              window.history.replaceState({}, document.title, '/profile');
              
              toast.success('Google Calendar connected successfully!');
              return;
            }
          } catch (googleError) {
            console.log('Not a Google auth code, trying Microsoft...');
          }

          // Try Microsoft
          const { data, error } = await supabase.functions.invoke('microsoft-calendar-auth', {
            body: { action: 'exchangeCode', code, redirectUri }
          });

          if (error) throw error;

          const token = data.access_token;
          localStorage.setItem('microsoft_calendar_token', token);
          setMicrosoftAccessToken(token);
          setMicrosoftCalendarConnected(true);
          
          // Clean up URL
          window.history.replaceState({}, document.title, '/profile');
          
          toast.success('Microsoft Calendar connected successfully!');
        } catch (error) {
          console.error('Token exchange error:', error);
          toast.error('Failed to complete calendar connection');
          // Clean up URL even on error
          window.history.replaceState({}, document.title, '/profile');
        }
      })();
    }
  }, [googleAccessToken, microsoftAccessToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Track completion items
    if (currentSalaryRange || desiredSalaryRange) {
      localStorage.setItem('salary_set', 'true');
    }
    
    if (profileData.preferences) {
      localStorage.setItem('preferences_set', 'true');
    }
    
    // Here you would typically send data to backend
    console.log("Profile updated:", profileData);
    console.log("Current Salary Range:", currentSalaryRange);
    console.log("Desired Salary Range:", desiredSalaryRange);
    console.log("Blocked Companies:", blockedCompanies);
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
          <Card id="personal" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
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
          <Card id="preferences" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
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
          <Card id="resume" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
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

          {/* The Quantum Club Resume */}
          <Card id="tqc-resume" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                The Quantum Club Resume
              </CardTitle>
              <CardDescription>
                Create an AI-powered executive resume optimized for elite opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-6 border-2 border-accent/30 rounded-lg bg-accent/5">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <FileText className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2">Premium Resume Builder</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Our AI analyzes your experience and creates a tailored resume that highlights your executive presence and achievements for premium positions.
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                        <li>✓ Executive-level formatting and tone</li>
                        <li>✓ ATS-optimized for top-tier recruiters</li>
                        <li>✓ Highlights leadership and strategic impact</li>
                        <li>✓ Multiple versions for different roles</li>
                      </ul>
                      <Button 
                        type="button"
                        disabled
                        className="bg-gradient-accent text-background"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Coming Soon - Create TQC Resume
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        This feature will be available soon
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compensation Bands */}
          <Card id="salary" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent" />
                Compensation & Salary Bands
              </CardTitle>
              <CardDescription>Help us match you with appropriate opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label className="text-base font-semibold">Current Salary Range (Optional)</Label>
                    <span className="text-sm font-bold">
                      {formatSalary(currentSalaryRange[0])} - {formatSalary(currentSalaryRange[1])}
                    </span>
                  </div>
                  <Slider
                    value={currentSalaryRange}
                    onValueChange={(value) => setCurrentSalaryRange(value as [number, number])}
                    min={50000}
                    max={500000}
                    step={5000}
                    className="py-4"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Confidential - helps us better match opportunities
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <Label className="text-base font-semibold">Desired Salary Range</Label>
                    <span className="text-sm font-bold">
                      {formatSalary(desiredSalaryRange[0])} - {formatSalary(desiredSalaryRange[1])}
                    </span>
                  </div>
                  <Slider
                    value={desiredSalaryRange}
                    onValueChange={(value) => setDesiredSalaryRange(value as [number, number])}
                    min={50000}
                    max={500000}
                    step={5000}
                    className="py-4"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="noticePeriod">Notice Period</Label>
                <Select value={profileData.noticePeriod} onValueChange={handleNoticePeriodChange}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select notice period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Available Immediately</SelectItem>
                    <SelectItem value="2_weeks">2 Weeks</SelectItem>
                    <SelectItem value="1_month">1 Month</SelectItem>
                    <SelectItem value="2_months">2 Months</SelectItem>
                    <SelectItem value="3_months">3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Company Blocklist */}
          <Card id="blocklist" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-accent" />
                Company Blocklist
              </CardTitle>
              <CardDescription>
                Ensure complete discretion - these companies won't see your profile or opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CompanySearch
                value={companySearchQuery}
                onChange={setCompanySearchQuery}
                onSelect={handleAddBlockedCompany}
              />

              {blockedCompanies.length > 0 ? (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium mb-3">Blocked Companies:</p>
                  <div className="flex flex-wrap gap-2">
                    {blockedCompanies.map((company) => (
                      <div
                        key={company}
                        className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg group hover:bg-destructive/20 transition-colors"
                      >
                        <span className="text-sm font-medium">{company}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBlockedCompany(company)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <Ban className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No companies blocked yet. Add companies to maintain your privacy.
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Blocked companies will not be able to view your profile, contact you, 
                  or see that you've applied to their opportunities. Your information remains completely confidential.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Integration */}
          <Card id="calendar" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                Calendar Integration
              </CardTitle>
              <CardDescription>
                Connect your calendar to automatically schedule meetings and sync with client/recruiter agendas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google Calendar */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  {googleCalendarConnected ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Google Calendar Connected</p>
                        <p className="text-sm text-muted-foreground">
                          Your Google Calendar is synced and ready
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Google Calendar Not Connected</p>
                        <p className="text-sm text-muted-foreground">
                          Connect to enable automatic scheduling
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {googleCalendarConnected ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisconnectGoogleCalendar}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleConnectGoogleCalendar}
                    disabled={googleCalendarLoading}
                    className="bg-gradient-accent text-background"
                  >
                    {googleCalendarLoading ? 'Connecting...' : 'Connect Google'}
                  </Button>
                )}
              </div>

              {/* Microsoft Calendar */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  {microsoftCalendarConnected ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">Microsoft Calendar Connected</p>
                        <p className="text-sm text-muted-foreground">
                          Your Microsoft Calendar is synced and ready
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Microsoft Calendar Not Connected</p>
                        <p className="text-sm text-muted-foreground">
                          Connect to enable automatic scheduling
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {microsoftCalendarConnected ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisconnectMicrosoftCalendar}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleConnectMicrosoftCalendar}
                    disabled={microsoftCalendarLoading}
                    className="bg-gradient-accent text-background"
                  >
                    {microsoftCalendarLoading ? 'Connecting...' : 'Connect Microsoft'}
                  </Button>
                )}
              </div>

              {(googleCalendarConnected || microsoftCalendarConnected) && (
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
