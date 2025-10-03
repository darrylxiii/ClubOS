import { useState, useEffect, useCallback, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Briefcase, DollarSign, Settings, Upload, Bell, Shield, Calendar, CheckCircle2, XCircle, FileText, Sparkles, X, Ban, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CompanySearch } from "@/components/CompanySearch";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    currentTitle: "",
    linkedin: "",
    noticePeriod: "2_weeks",
    preferences: "",
  });

  const [currentSalaryRange, setCurrentSalaryRange] = useState<[number, number]>([150000, 180000]);
  const [desiredSalaryRange, setDesiredSalaryRange] = useState<[number, number]>([200000, 250000]);
  const [blockedCompanies, setBlockedCompanies] = useState<string[]>([]);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const [settings, setSettings] = useState({
    emailNotifications: true,
    applicationUpdates: true,
    weeklyDigest: false,
    profileVisibility: true,
    shareWithPartners: true,
  });

  const [resume, setResume] = useState<File | null>(null);
  
  interface CalendarConnection {
    id: string;
    provider: 'google' | 'microsoft';
    email: string;
    label: string;
    token: string;
    connectedAt: string;
  }
  
  const [connectedCalendars, setConnectedCalendars] = useState<CalendarConnection[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [pendingCalendarLabel, setPendingCalendarLabel] = useState('');

  // Auto-save function
  const saveProfile = useCallback(async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: profileData.phone,
          location: profileData.location,
          current_title: profileData.currentTitle,
          linkedin_url: profileData.linkedin,
          notice_period: profileData.noticePeriod,
          career_preferences: profileData.preferences,
          current_salary_min: currentSalaryRange[0],
          current_salary_max: currentSalaryRange[1],
          desired_salary_min: desiredSalaryRange[0],
          desired_salary_max: desiredSalaryRange[1],
          blocked_companies: blockedCompanies,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update localStorage for completion tracking
      if (currentSalaryRange[0] || desiredSalaryRange[0]) {
        localStorage.setItem('salary_set', 'true');
      }
      if (profileData.preferences) {
        localStorage.setItem('preferences_set', 'true');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [user, profileData, currentSalaryRange, desiredSalaryRange, blockedCompanies]);

  // Debounced auto-save
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveProfile();
    }, 1000); // Save 1 second after user stops typing
  }, [saveProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
    debouncedSave();
  };

  const handleNoticePeriodChange = (value: string) => {
    setProfileData({
      ...profileData,
      noticePeriod: value,
    });
    debouncedSave();
  };

  const handleAddBlockedCompany = (company: { name: string; domain?: string }) => {
    if (company.name && !blockedCompanies.includes(company.name)) {
      const newCompanies = [...blockedCompanies, company.name];
      setBlockedCompanies(newCompanies);
      setCompanySearchQuery("");
      toast.success("Company added to blocklist");
      debouncedSave();
    }
  };

  const handleRemoveBlockedCompany = (company: string) => {
    setBlockedCompanies(blockedCompanies.filter(c => c !== company));
    toast.success("Company removed from blocklist");
    debouncedSave();
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
      toast.success("Resume uploaded - will be saved with profile");
    }
  };

  // Load profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        // Split full_name into firstName and lastName
        const nameParts = (data.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setProfileData({
          firstName,
          lastName,
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          currentTitle: data.current_title || '',
          linkedin: data.linkedin_url || '',
          noticePeriod: data.notice_period || '2_weeks',
          preferences: data.career_preferences || '',
        });

        setCurrentSalaryRange([
          data.current_salary_min || 150000,
          data.current_salary_max || 180000
        ]);
        setDesiredSalaryRange([
          data.desired_salary_min || 200000,
          data.desired_salary_max || 250000
        ]);
        setBlockedCompanies((data.blocked_companies as string[]) || []);
      }
    };

    loadProfile();
  }, [user]);

  // Auto-save profile data with debouncing
  useEffect(() => {
    const saveProfile = async () => {
      if (!user) return;

      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: `${profileData.firstName} ${profileData.lastName}`.trim(),
            phone: profileData.phone,
            location: profileData.location,
            current_title: profileData.currentTitle,
            linkedin_url: profileData.linkedin,
            notice_period: profileData.noticePeriod,
            career_preferences: profileData.preferences,
            current_salary_min: currentSalaryRange[0],
            current_salary_max: currentSalaryRange[1],
            desired_salary_min: desiredSalaryRange[0],
            desired_salary_max: desiredSalaryRange[1],
            blocked_companies: blockedCompanies,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;

        setLastSaved(new Date());
        
        // Update completion tracking
        if (currentSalaryRange || desiredSalaryRange) {
          localStorage.setItem('salary_set', 'true');
        }
        if (profileData.preferences) {
          localStorage.setItem('preferences_set', 'true');
        }
      } catch (error) {
        console.error('Error saving profile:', error);
        toast.error('Failed to save profile changes');
      } finally {
        setIsSaving(false);
      }
    };

    const debounceTimer = setTimeout(saveProfile, 1000);
    return () => clearTimeout(debounceTimer);
  }, [profileData, currentSalaryRange, desiredSalaryRange, blockedCompanies, user]);

  // Load profile data from database
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          // Parse full name into first and last name
          const [firstName, ...lastNameParts] = (data.full_name || '').split(' ');
          
          setProfileData({
            firstName: firstName || '',
            lastName: lastNameParts.join(' ') || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
            currentTitle: data.current_title || '',
            linkedin: data.linkedin_url || '',
            noticePeriod: data.notice_period || '2_weeks',
            preferences: data.career_preferences || '',
          });

          if (data.current_salary_min && data.current_salary_max) {
            setCurrentSalaryRange([data.current_salary_min, data.current_salary_max]);
          }
          
          if (data.desired_salary_min && data.desired_salary_max) {
            setDesiredSalaryRange([data.desired_salary_min, data.desired_salary_max]);
          }

          if (data.blocked_companies) {
            const companies = data.blocked_companies as any;
            setBlockedCompanies(Array.isArray(companies) ? companies.filter((c): c is string => typeof c === 'string') : []);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load connected calendars from localStorage
    const savedCalendars = localStorage.getItem('connected_calendars');
    if (savedCalendars) {
      try {
        const calendars = JSON.parse(savedCalendars) as CalendarConnection[];
        setConnectedCalendars(calendars);
      } catch (error) {
        console.error('Error parsing saved calendars:', error);
      }
    }

    loadProfile();
  }, [user]);

  const handleConnectCalendar = async (provider: 'google' | 'microsoft') => {
    const label = prompt(
      `Name this calendar connection (e.g., "Personal", "Work", "Company Name"):`
    );
    
    if (!label || !label.trim()) {
      toast.error('Calendar label is required');
      return;
    }

    try {
      setCalendarLoading(true);
      
      const redirectUri = `${window.location.origin}/profile`;
      const functionName = provider === 'google' ? 'google-calendar-auth' : 'microsoft-calendar-auth';
      
      // Store the label and provider for after OAuth redirect
      localStorage.setItem('pending_calendar_connection', JSON.stringify({ 
        provider, 
        label: label.trim() 
      }));
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'getAuthUrl', redirectUri }
      });

      if (error) throw error;

      // Redirect to OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error(`${provider} Calendar connection error:`, error);
      toast.error(`Failed to connect ${provider === 'google' ? 'Google' : 'Microsoft'} Calendar`);
      localStorage.removeItem('pending_calendar_connection');
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = (calendarId: string) => {
    const updatedCalendars = connectedCalendars.filter(cal => cal.id !== calendarId);
    setConnectedCalendars(updatedCalendars);
    localStorage.setItem('connected_calendars', JSON.stringify(updatedCalendars));
    toast.success('Calendar disconnected');
  };

  useEffect(() => {
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      (async () => {
        try {
          const pendingConnection = localStorage.getItem('pending_calendar_connection');
          if (!pendingConnection) {
            throw new Error('No pending calendar connection found');
          }

          const { provider, label } = JSON.parse(pendingConnection);
          const redirectUri = `${window.location.origin}/profile`;
          
          let token: string;
          let email: string = 'Calendar Account';

          if (provider === 'google') {
            const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
              body: { action: 'exchangeCode', code, redirectUri }
            });

            if (error) throw error;
            token = data.tokens.access_token;
            
            // Try to get user email from Google
            try {
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
              });
              const userInfo = await userInfoResponse.json();
              email = userInfo.email || email;
            } catch (e) {
              console.log('Could not fetch user email');
            }
          } else {
            const { data, error } = await supabase.functions.invoke('microsoft-calendar-auth', {
              body: { action: 'exchangeCode', code, redirectUri }
            });

            if (error) throw error;
            token = data.access_token;
            
            // Try to get user email from Microsoft
            try {
              const userInfoResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${token}` }
              });
              const userInfo = await userInfoResponse.json();
              email = userInfo.mail || userInfo.userPrincipalName || email;
            } catch (e) {
              console.log('Could not fetch user email');
            }
          }

          // Create new calendar connection
          const newConnection: CalendarConnection = {
            id: `${provider}-${Date.now()}`,
            provider,
            email,
            label,
            token,
            connectedAt: new Date().toISOString(),
          };

          const updatedCalendars = [...connectedCalendars, newConnection];
          setConnectedCalendars(updatedCalendars);
          localStorage.setItem('connected_calendars', JSON.stringify(updatedCalendars));
          localStorage.removeItem('pending_calendar_connection');
          
          // Clean up URL
          window.history.replaceState({}, document.title, '/profile');
          
          toast.success(`${provider === 'google' ? 'Google' : 'Microsoft'} Calendar "${label}" connected successfully!`);
        } catch (error) {
          console.error('Token exchange error:', error);
          toast.error('Failed to complete calendar connection');
          localStorage.removeItem('pending_calendar_connection');
          // Clean up URL even on error
          window.history.replaceState({}, document.title, '/profile');
        }
      })();
    }
  }, []);

  useEffect(() => {
    // Auto-save on slider changes
    debouncedSave();
  }, [currentSalaryRange, desiredSalaryRange, debouncedSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-save handles everything, no manual save needed
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Profile & Settings</h1>
            <p className="text-muted-foreground">
              Manage your personal information and preferences
            </p>
          </div>
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving changes...
            </div>
          )}
          {!isSaving && lastSaved && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              All changes saved
            </div>
          )}
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
                Connect Your Calendars
              </CardTitle>
              <CardDescription>
                Link multiple calendars (personal + work accounts) to sync your availability and prevent scheduling conflicts. 
                We'll automatically coordinate with recruiters and clients across all your calendars.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connected Calendars List */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm mb-3">Currently Connected Calendars</h4>
                {connectedCalendars.length > 0 ? (
                  <div className="space-y-2">
                    {connectedCalendars.map((calendar) => (
                      <div
                        key={calendar.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50"
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium">
                              {calendar.provider === 'google' ? 'Google' : 'Microsoft'} - {calendar.label}
                            </p>
                            <p className="text-sm text-muted-foreground">{calendar.email}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDisconnectCalendar(calendar.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">No calendars connected yet</p>
                    <p className="text-xs text-muted-foreground">
                      Connect your calendars to enable automatic scheduling and prevent conflicts
                    </p>
                  </div>
                )}
              </div>

              {/* Add Calendar Buttons */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm mb-3">
                  {connectedCalendars.length > 0 ? 'Add Another Calendar' : 'Connect a Calendar'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    onClick={() => handleConnectCalendar('google')}
                    disabled={calendarLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {calendarLoading ? 'Connecting...' : 'Add Google Calendar'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleConnectCalendar('microsoft')}
                    disabled={calendarLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {calendarLoading ? 'Connecting...' : 'Add Microsoft Calendar'}
                  </Button>
                </div>
              </div>

              {connectedCalendars.length > 0 && (
                <div className="space-y-2 p-4 border border-accent/20 rounded-lg bg-accent/5">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Calendar Features Active
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                    <li>✓ Sync availability across all {connectedCalendars.length} calendar{connectedCalendars.length > 1 ? 's' : ''}</li>
                    <li>✓ Automatic meeting creation for interviews</li>
                    <li>✓ Find open time slots with recruiters and clients</li>
                    <li>✓ Prevent double-booking conflicts</li>
                    <li>✓ Smart scheduling respecting all work and personal commitments</li>
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
          
          <div className="text-center pb-6">
            <p className="text-sm text-muted-foreground">
              ✨ All changes are automatically saved
            </p>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Profile;
