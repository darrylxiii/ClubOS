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
import { User, Briefcase, DollarSign, Settings, Upload, Bell, Shield, Calendar, CheckCircle2, XCircle, FileText, Sparkles, X, Ban, Loader2, MapPin, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CompanySearch } from "@/components/CompanySearch";
import { TaskSchedulingPreferences } from "@/components/TaskSchedulingPreferences";
import { StealthModeToggle } from "@/components/StealthModeToggle";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneVerification } from "@/components/PhoneVerification";

const Profile = () => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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

  const [privacySettings, setPrivacySettings] = useState({
    share_full_name: true,
    share_email: true,
    share_phone: true,
    share_location: true,
    share_current_title: true,
    share_linkedin_url: true,
    share_career_preferences: true,
    share_resume: true,
    share_salary_expectations: true,
    share_notice_period: true,
  });

  // Social media connections
  const [socialConnections, setSocialConnections] = useState({
    linkedin: false,
    instagram: false,
    twitter: false,
    github: false,
    instagramUsername: '',
    twitterUsername: '',
    githubUsername: '',
  });

  // Employment and compensation preferences
  const [employmentType, setEmploymentType] = useState<'fulltime' | 'freelance' | 'both'>('fulltime');
  const [freelanceHourlyRate, setFreelanceHourlyRate] = useState<[number, number]>([100, 200]);
  const [fulltimeHoursPerWeek, setFulltimeHoursPerWeek] = useState<[number, number]>([35, 45]);
  const [freelanceHoursPerWeek, setFreelanceHoursPerWeek] = useState<[number, number]>([15, 25]);

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
  
  // New state for phone verification and location
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [cities, setCities] = useState<Array<{ id: string; name: string; country: string }>>([]);
  const [preferredWorkLocations, setPreferredWorkLocations] = useState<string[]>([]);
  const [remoteWorkPreference, setRemoteWorkPreference] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');

  // Stealth mode state
  const [stealthModeEnabled, setStealthModeEnabled] = useState(false);
  const [stealthModeLevel, setStealthModeLevel] = useState(1);
  const [allowStealthColdOutreach, setAllowStealthColdOutreach] = useState(true);

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
          phone: phoneNumber,
          phone_verified: phoneVerified,
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
          privacy_settings: privacySettings,
          preferred_work_locations: preferredWorkLocations,
          remote_work_preference: remoteWorkPreference,
          employment_type_preference: employmentType,
          freelance_hourly_rate_min: freelanceHourlyRate[0],
          freelance_hourly_rate_max: freelanceHourlyRate[1],
          fulltime_hours_per_week_min: fulltimeHoursPerWeek[0],
          fulltime_hours_per_week_max: fulltimeHoursPerWeek[1],
          freelance_hours_per_week_min: freelanceHoursPerWeek[0],
          freelance_hours_per_week_max: freelanceHoursPerWeek[1],
          stealth_mode_enabled: stealthModeEnabled,
          stealth_mode_level: stealthModeLevel,
          allow_stealth_cold_outreach: allowStealthColdOutreach,
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
  }, [user, profileData, currentSalaryRange, desiredSalaryRange, blockedCompanies, privacySettings, phoneNumber, phoneVerified, preferredWorkLocations, remoteWorkPreference, employmentType, freelanceHourlyRate, fulltimeHoursPerWeek, freelanceHoursPerWeek, stealthModeEnabled, stealthModeLevel, allowStealthColdOutreach]);

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

  // Calculate global salary percentile based on income distribution
  const calculateSalaryPercentile = (salary: number): number => {
    // Based on global income distribution data (World Bank, OECD)
    // Simplified model for tech professionals
    if (salary <= 20000) return 25;
    if (salary <= 35000) return 50;
    if (salary <= 50000) return 65;
    if (salary <= 75000) return 75;
    if (salary <= 100000) return 82;
    if (salary <= 125000) return 87;
    if (salary <= 150000) return 91;
    if (salary <= 175000) return 93;
    if (salary <= 200000) return 95;
    if (salary <= 250000) return 97;
    if (salary <= 300000) return 98;
    if (salary <= 400000) return 99;
    return 99.5;
  };

  const getPercentileMessage = (percentile: number): string => {
    if (percentile >= 99) return `Top ${(100 - percentile).toFixed(1)}% worldwide 🌟`;
    if (percentile >= 95) return `Top ${100 - percentile}% worldwide 🚀`;
    if (percentile >= 90) return `Top ${100 - percentile}% worldwide ⭐`;
    if (percentile >= 75) return `Higher than ${percentile}% globally 📈`;
    return `${percentile}th percentile globally`;
  };

  const handleSettingChange = (setting: keyof typeof settings) => {
    setSettings({
      ...settings,
      [setting]: !settings[setting],
    });
  };

  const handlePrivacyToggle = (setting: keyof typeof privacySettings) => {
    setPrivacySettings({
      ...privacySettings,
      [setting]: !privacySettings[setting],
    });
    debouncedSave();
  };

  const countSharedFields = () => {
    return Object.values(privacySettings).filter(Boolean).length;
  };

  const handlePhoneChange = (value: string | undefined) => {
    setPhoneNumber(value || '');
    debouncedSave();
  };

  const handleVerificationComplete = () => {
    setPhoneVerified(true);
    debouncedSave();
  };

  const handleAddPreferredLocation = () => {
    if (selectedCity && !preferredWorkLocations.includes(selectedCity)) {
      const newLocations = [...preferredWorkLocations, selectedCity];
      setPreferredWorkLocations(newLocations);
      setSelectedCity('');
      toast.success('Location added to preferences');
      debouncedSave();
    }
  };

  const handleRemovePreferredLocation = (location: string) => {
    setPreferredWorkLocations(preferredWorkLocations.filter(loc => loc !== location));
    toast.success('Location removed from preferences');
    debouncedSave();
  };

  const handleRemoteToggle = () => {
    setRemoteWorkPreference(!remoteWorkPreference);
    debouncedSave();
  };

  const handleStealthModeChange = (enabled: boolean) => {
    setStealthModeEnabled(enabled);
    if (enabled) {
      toast.success('Stealth Mode enabled - Your profile is now anonymized');
    } else {
      toast.success('Stealth Mode disabled - Your profile is now visible');
    }
    debouncedSave();
  };

  const handleStealthLevelChange = (level: number) => {
    setStealthModeLevel(level);
    toast.success(`Anonymization level updated to Level ${level}`);
    debouncedSave();
  };

  const handleColdOutreachChange = (allowed: boolean) => {
    setAllowStealthColdOutreach(allowed);
    if (allowed) {
      toast.success('Cold outreach permission granted');
    } else {
      toast.success('Cold outreach permission revoked');
    }
    debouncedSave();
  };

  const handleConnectSocial = async (provider: 'linkedin_oidc' | 'twitter' | 'instagram' | 'github') => {
    try {
      const redirectTo = `${window.location.origin}/profile`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo,
          scopes: provider === 'linkedin_oidc' ? 'openid profile email' : 
                  provider === 'github' ? 'read:user user:email' : undefined,
        }
      });

      if (error) throw error;
      
      toast.success(`Redirecting to ${provider} login...`);
    } catch (error) {
      console.error(`${provider} connection error:`, error);
      toast.error(`Failed to connect ${provider}`);
    }
  };

  const handleDisconnectSocial = async (platform: 'linkedin' | 'instagram' | 'twitter' | 'github') => {
    try {
      const updates: any = {};
      
      if (platform === 'linkedin') {
        updates.linkedin_connected = false;
        updates.linkedin_profile_data = null;
      } else if (platform === 'instagram') {
        updates.instagram_connected = false;
        updates.instagram_username = null;
      } else if (platform === 'twitter') {
        updates.twitter_connected = false;
        updates.twitter_username = null;
      } else if (platform === 'github') {
        updates.github_connected = false;
        updates.github_username = null;
        updates.github_profile_data = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;

      setSocialConnections(prev => ({
        ...prev,
        [platform]: false,
        [`${platform}Username`]: '',
      }));

      toast.success(`${platform} disconnected`);
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
      toast.error(`Failed to disconnect ${platform}`);
    }
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

        setAvatarUrl(data.avatar_url || null);
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
            phone: phoneNumber,
            phone_verified: phoneVerified,
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
            privacy_settings: privacySettings,
            preferred_work_locations: preferredWorkLocations,
            remote_work_preference: remoteWorkPreference,
            employment_type_preference: employmentType,
            freelance_hourly_rate_min: freelanceHourlyRate[0],
            freelance_hourly_rate_max: freelanceHourlyRate[1],
            fulltime_hours_per_week_min: fulltimeHoursPerWeek[0],
            fulltime_hours_per_week_max: fulltimeHoursPerWeek[1],
            freelance_hours_per_week_min: freelanceHoursPerWeek[0],
            freelance_hours_per_week_max: freelanceHoursPerWeek[1],
            stealth_mode_enabled: stealthModeEnabled,
            stealth_mode_level: stealthModeLevel,
            allow_stealth_cold_outreach: allowStealthColdOutreach,
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
  }, [profileData, currentSalaryRange, desiredSalaryRange, blockedCompanies, privacySettings, phoneNumber, phoneVerified, preferredWorkLocations, remoteWorkPreference, employmentType, freelanceHourlyRate, fulltimeHoursPerWeek, freelanceHoursPerWeek, stealthModeEnabled, stealthModeLevel, allowStealthColdOutreach, user]);

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

          if (data.privacy_settings) {
            setPrivacySettings(data.privacy_settings as any);
          }

          // Load new fields
          if (data.phone) {
            setPhoneNumber(data.phone);
          }
          if (data.phone_verified) {
            setPhoneVerified(data.phone_verified);
          }
          if (data.preferred_work_locations) {
            setPreferredWorkLocations(data.preferred_work_locations as string[]);
          }
          if (data.remote_work_preference !== undefined) {
            setRemoteWorkPreference(data.remote_work_preference);
          }

          // Load social media connections
          if (data.linkedin_connected) {
            setSocialConnections(prev => ({ ...prev, linkedin: true }));
          }
          if (data.instagram_connected && data.instagram_username) {
            setSocialConnections(prev => ({ 
              ...prev, 
              instagram: true, 
              instagramUsername: data.instagram_username 
            }));
          }
          if (data.twitter_connected && data.twitter_username) {
            setSocialConnections(prev => ({ 
              ...prev, 
              twitter: true, 
              twitterUsername: data.twitter_username 
            }));
          }
          if (data.github_connected && data.github_username) {
            setSocialConnections(prev => ({ 
              ...prev, 
              github: true, 
              githubUsername: data.github_username 
            }));
          }

          // Load employment preferences
          if (data.employment_type_preference) {
            setEmploymentType(data.employment_type_preference as 'fulltime' | 'freelance' | 'both');
          }
          if (data.freelance_hourly_rate_min && data.freelance_hourly_rate_max) {
            setFreelanceHourlyRate([data.freelance_hourly_rate_min, data.freelance_hourly_rate_max]);
          }
          if (data.fulltime_hours_per_week_min && data.fulltime_hours_per_week_max) {
            setFulltimeHoursPerWeek([data.fulltime_hours_per_week_min, data.fulltime_hours_per_week_max]);
          }
          if (data.freelance_hours_per_week_min && data.freelance_hours_per_week_max) {
            setFreelanceHoursPerWeek([data.freelance_hours_per_week_min, data.freelance_hours_per_week_max]);
          }

          // Load stealth mode settings
          if (data.stealth_mode_enabled !== undefined) {
            setStealthModeEnabled(data.stealth_mode_enabled);
          }
          if (data.stealth_mode_level) {
            setStealthModeLevel(data.stealth_mode_level);
          }
          if (data.allow_stealth_cold_outreach !== undefined) {
            setAllowStealthColdOutreach(data.allow_stealth_cold_outreach);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load cities from database
    const loadCities = async () => {
      try {
        const { data, error } = await supabase
          .from('cities')
          .select('id, name, country')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        if (data) {
          setCities(data);
        }
      } catch (error) {
        console.error('Error loading cities:', error);
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
    loadCities();
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
          if (pendingConnection) {
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
          } else {
            // Check if it's a social media OAuth callback
            const { data: session } = await supabase.auth.getSession();
            if (session?.session?.user) {
              const provider = session.session.user.app_metadata.provider;
              
              if (provider === 'linkedin_oidc' || provider === 'linkedin') {
                const { error } = await supabase
                  .from('profiles')
                  .update({
                    linkedin_connected: true,
                    linkedin_profile_data: session.session.user.user_metadata,
                  })
                  .eq('id', session.session.user.id);

                if (!error) {
                  setSocialConnections(prev => ({ ...prev, linkedin: true }));
                  toast.success('LinkedIn connected successfully!');
                }
              } else if (provider === 'instagram') {
                const username = session.session.user.user_metadata.user_name || session.session.user.user_metadata.username;
                const { error } = await supabase
                  .from('profiles')
                  .update({
                    instagram_connected: true,
                    instagram_username: username,
                  })
                  .eq('id', session.session.user.id);

                if (!error) {
                  setSocialConnections(prev => ({ 
                    ...prev, 
                    instagram: true,
                    instagramUsername: username,
                  }));
                  toast.success('Instagram connected successfully!');
                }
              } else if (provider === 'twitter') {
                const username = session.session.user.user_metadata.user_name || session.session.user.user_metadata.preferred_username;
                const { error } = await supabase
                  .from('profiles')
                  .update({
                    twitter_connected: true,
                    twitter_username: username,
                  })
                  .eq('id', session.session.user.id);

                if (!error) {
                  setSocialConnections(prev => ({ 
                    ...prev, 
                    twitter: true,
                    twitterUsername: username,
                  }));
                  toast.success('Twitter connected successfully!');
                }
              } else if (provider === 'github') {
                const username = session.session.user.user_metadata.user_name || session.session.user.user_metadata.preferred_username;
                const { error } = await supabase
                  .from('profiles')
                  .update({
                    github_connected: true,
                    github_username: username,
                    github_profile_data: session.session.user.user_metadata,
                  })
                  .eq('id', session.session.user.id);

                if (!error) {
                  setSocialConnections(prev => ({ 
                    ...prev, 
                    github: true,
                    githubUsername: username,
                  }));
                  toast.success('GitHub connected successfully!');
                }
              }
              
              // Clean up URL
              window.history.replaceState({}, document.title, '/profile');
            }
          }
        } catch (error) {
          console.error('OAuth callback error:', error);
          toast.error('Failed to complete connection');
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
  }, [currentSalaryRange, desiredSalaryRange, freelanceHourlyRate, fulltimeHoursPerWeek, freelanceHoursPerWeek, debouncedSave]);

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
                  <PhoneVerification
                    phoneNumber={phoneNumber}
                    phoneVerified={phoneVerified}
                    onPhoneChange={handlePhoneChange}
                    onVerificationComplete={handleVerificationComplete}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Current Location</Label>
                <Select value={profileData.location} onValueChange={(value) => {
                  setProfileData({ ...profileData, location: value });
                  debouncedSave();
                }}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select your current location" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={`${city.name}, ${city.country}`}>
                        {city.name}, {city.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preferred Work Locations */}
          <Card id="work-locations" className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent" />
                Preferred Work Locations
              </CardTitle>
              <CardDescription>
                Specify where you'd like to work - add multiple cities or toggle remote
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Remote Toggle */}
              <div className="flex items-center justify-between p-4 border-2 border-accent/20 rounded-lg bg-accent/5">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-accent" />
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
                  onCheckedChange={handleRemoteToggle}
                />
              </div>

              {/* City Selection */}
              <div className="space-y-3">
                <Label>Add Preferred Cities</Label>
                <div className="flex gap-2">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="bg-background/50">
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
                    className="bg-accent text-background hover:bg-accent/90"
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
                        <MapPin className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium">{location}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePreferredLocation(location)}
                          className="text-accent hover:text-accent/80 transition-colors"
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

              <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Adding preferred locations helps us match you with opportunities in areas where you'd like to work. 
                  Enable remote work to see opportunities from anywhere.
                </p>
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

          {/* Social Media Connections */}
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm scroll-mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                Social Media Profiles
              </CardTitle>
              <CardDescription>
                Connect your professional social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* LinkedIn */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#0A66C2]/10 rounded-lg">
                    <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-sm text-muted-foreground">
                      {socialConnections.linkedin ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                {socialConnections.linkedin ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnectSocial('linkedin')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleConnectSocial('linkedin_oidc')}
                    className="bg-[#0A66C2] text-white hover:bg-[#004182]"
                  >
                    Connect
                  </Button>
                )}
              </div>

              {/* Instagram */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Instagram</p>
                    <p className="text-sm text-muted-foreground">
                      {socialConnections.instagram 
                        ? `@${socialConnections.instagramUsername}` 
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                {socialConnections.instagram ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnectSocial('instagram')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleConnectSocial('instagram')}
                    className="bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white"
                  >
                    Connect
                  </Button>
                )}
              </div>

              {/* Twitter */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">X (Twitter)</p>
                    <p className="text-sm text-muted-foreground">
                      {socialConnections.twitter 
                        ? `@${socialConnections.twitterUsername}` 
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                {socialConnections.twitter ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnectSocial('twitter')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleConnectSocial('twitter')}
                    className="bg-black text-white hover:bg-gray-900"
                  >
                    Connect
                  </Button>
                )}
              </div>

              {/* GitHub */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#24292e] rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">GitHub</p>
                    <p className="text-sm text-muted-foreground">
                      {socialConnections.github 
                        ? `@${socialConnections.githubUsername}` 
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                {socialConnections.github ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnectSocial('github')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleConnectSocial('github')}
                    className="bg-[#24292e] text-white hover:bg-[#1b1f23]"
                  >
                    Connect
                  </Button>
                )}
              </div>

              <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Professional Presence:</strong> Connecting your social media profiles helps verify your identity 
                  and allows employers to learn more about your professional background and achievements.
                </p>
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
              {/* Employment Type Preference */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Employment Type Preference</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={employmentType === 'fulltime' ? 'default' : 'outline'}
                    onClick={() => {
                      setEmploymentType('fulltime');
                      debouncedSave();
                    }}
                    className="w-full"
                  >
                    <Briefcase className="w-4 h-4 mr-2" />
                    Full-Time
                  </Button>
                  <Button
                    type="button"
                    variant={employmentType === 'freelance' ? 'default' : 'outline'}
                    onClick={() => {
                      setEmploymentType('freelance');
                      debouncedSave();
                    }}
                    className="w-full"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Freelance
                  </Button>
                  <Button
                    type="button"
                    variant={employmentType === 'both' ? 'default' : 'outline'}
                    onClick={() => {
                      setEmploymentType('both');
                      debouncedSave();
                    }}
                    className="w-full"
                  >
                    Both
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select your preferred employment type to see relevant opportunities
                </p>
              </div>

              <Separator />

              {/* Full-Time Compensation */}
              {(employmentType === 'fulltime' || employmentType === 'both') && (
                <div className="space-y-6">
                  <h4 className="text-base font-semibold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-accent" />
                    Full-Time Compensation
                  </h4>
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
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">
                        Confidential - helps us better match opportunities
                      </p>
                      <p className="text-xs font-medium text-accent">
                        {getPercentileMessage(calculateSalaryPercentile(currentSalaryRange[1]))}
                      </p>
                    </div>
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
                    <div className="flex justify-end mt-2">
                      <p className="text-xs font-medium text-accent">
                        Target: {getPercentileMessage(calculateSalaryPercentile(desiredSalaryRange[1]))}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-base font-semibold">Desired Hours Per Week</Label>
                      <span className="text-sm font-bold">
                        {fulltimeHoursPerWeek[0]} - {fulltimeHoursPerWeek[1]} hours/week
                      </span>
                    </div>
                    <Slider
                      value={fulltimeHoursPerWeek}
                      onValueChange={(value) => setFulltimeHoursPerWeek(value as [number, number])}
                      min={20}
                      max={60}
                      step={1}
                      className="py-4"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">
                        Standard full-time is typically 35-45 hours/week
                      </p>
                      <p className="text-xs font-medium text-accent">
                        {fulltimeHoursPerWeek[0] * 52} - {fulltimeHoursPerWeek[1] * 52} hours/year
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {employmentType === 'both' && <Separator />}

              {/* Freelance Hourly Rate */}
              {(employmentType === 'freelance' || employmentType === 'both') && (
                <div className="space-y-6">
                  <h4 className="text-base font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-accent" />
                    Freelance Hourly Rate
                  </h4>
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-base font-semibold">Hourly Rate Range</Label>
                      <span className="text-sm font-bold">
                        ${freelanceHourlyRate[0]}/hr - ${freelanceHourlyRate[1]}/hr
                      </span>
                    </div>
                    <Slider
                      value={freelanceHourlyRate}
                      onValueChange={(value) => setFreelanceHourlyRate(value as [number, number])}
                      min={50}
                      max={500}
                      step={5}
                      className="py-4"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">
                        Your hourly rate for freelance projects
                      </p>
                      <p className="text-xs font-medium text-accent">
                        Annual estimate: {formatSalary(freelanceHourlyRate[1] * freelanceHoursPerWeek[1] * 52)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on {freelanceHoursPerWeek[0]}-{freelanceHoursPerWeek[1]} hours/week × 52 weeks
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-base font-semibold">Desired Hours Per Week</Label>
                      <span className="text-sm font-bold">
                        {freelanceHoursPerWeek[0]} - {freelanceHoursPerWeek[1]} hours/week
                      </span>
                    </div>
                    <Slider
                      value={freelanceHoursPerWeek}
                      onValueChange={(value) => setFreelanceHoursPerWeek(value as [number, number])}
                      min={5}
                      max={60}
                      step={1}
                      className="py-4"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">
                        Adjust based on your availability for freelance work
                      </p>
                      <p className="text-xs font-medium text-accent">
                        {freelanceHoursPerWeek[0] * 52} - {freelanceHoursPerWeek[1] * 52} hours/year
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

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

          {/* AI Task Scheduling */}
          <TaskSchedulingPreferences />

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

          {/* Stealth Mode */}
          <StealthModeToggle
            stealthModeEnabled={stealthModeEnabled}
            stealthModeLevel={stealthModeLevel}
            allowStealthColdOutreach={allowStealthColdOutreach}
            onStealthModeChange={handleStealthModeChange}
            onStealthLevelChange={handleStealthLevelChange}
            onColdOutreachChange={handleColdOutreachChange}
          />

          {/* Profile Sharing Settings */}
          <Card className="border-0 shadow-glow bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                Profile Information Sharing
              </CardTitle>
              <CardDescription>
                Choose what information you'd like to share with potential employers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warning Banner */}
              <div className="p-4 border-2 border-amber-500/20 rounded-lg bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Shield className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-500 mb-1">Matching Impact</h4>
                    <p className="text-sm text-muted-foreground">
                      Sharing less information reduces the likelihood of finding the perfect match. 
                      Our AI uses your complete profile to find opportunities that align with your goals and expertise.
                      Currently sharing <strong>{countSharedFields()} of 10</strong> fields.
                    </p>
                  </div>
                </div>
              </div>

              {/* Privacy Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_full_name" className="font-normal cursor-pointer">
                      Full Name
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your name with employers
                    </p>
                  </div>
                  <Switch
                    id="share_full_name"
                    checked={privacySettings.share_full_name}
                    onCheckedChange={() => handlePrivacyToggle('share_full_name')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_email" className="font-normal cursor-pointer">
                      Email Address
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow employers to contact you via email
                    </p>
                  </div>
                  <Switch
                    id="share_email"
                    checked={privacySettings.share_email}
                    onCheckedChange={() => handlePrivacyToggle('share_email')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_phone" className="font-normal cursor-pointer">
                      Phone Number
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your contact number with employers
                    </p>
                  </div>
                  <Switch
                    id="share_phone"
                    checked={privacySettings.share_phone}
                    onCheckedChange={() => handlePrivacyToggle('share_phone')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_location" className="font-normal cursor-pointer">
                      Location
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your city/country for local opportunities
                    </p>
                  </div>
                  <Switch
                    id="share_location"
                    checked={privacySettings.share_location}
                    onCheckedChange={() => handlePrivacyToggle('share_location')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_current_title" className="font-normal cursor-pointer">
                      Current Job Title
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show your current position to employers
                    </p>
                  </div>
                  <Switch
                    id="share_current_title"
                    checked={privacySettings.share_current_title}
                    onCheckedChange={() => handlePrivacyToggle('share_current_title')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_linkedin_url" className="font-normal cursor-pointer">
                      LinkedIn Profile
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your LinkedIn for verification
                    </p>
                  </div>
                  <Switch
                    id="share_linkedin_url"
                    checked={privacySettings.share_linkedin_url}
                    onCheckedChange={() => handlePrivacyToggle('share_linkedin_url')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_career_preferences" className="font-normal cursor-pointer">
                      Career Preferences
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your work style and industry preferences
                    </p>
                  </div>
                  <Switch
                    id="share_career_preferences"
                    checked={privacySettings.share_career_preferences}
                    onCheckedChange={() => handlePrivacyToggle('share_career_preferences')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_resume" className="font-normal cursor-pointer">
                      Resume/CV
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow employers to view your resume
                    </p>
                  </div>
                  <Switch
                    id="share_resume"
                    checked={privacySettings.share_resume}
                    onCheckedChange={() => handlePrivacyToggle('share_resume')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_salary_expectations" className="font-normal cursor-pointer">
                      Salary Expectations
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your desired salary range for better matches
                    </p>
                  </div>
                  <Switch
                    id="share_salary_expectations"
                    checked={privacySettings.share_salary_expectations}
                    onCheckedChange={() => handlePrivacyToggle('share_salary_expectations')}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="share_notice_period" className="font-normal cursor-pointer">
                      Notice Period
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your availability timeline with employers
                    </p>
                  </div>
                  <Switch
                    id="share_notice_period"
                    checked={privacySettings.share_notice_period}
                    onCheckedChange={() => handlePrivacyToggle('share_notice_period')}
                  />
                </div>
              </div>

              {/* Additional Privacy Note */}
              <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Your Privacy Matters:</strong> You have complete control over your information. 
                  Disabled fields will not be visible to employers or recruiters. However, providing more 
                  information helps our AI find opportunities that truly match your skills and preferences.
                </p>
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
