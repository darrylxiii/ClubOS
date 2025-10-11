import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
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
import { EmailVerification } from "@/components/EmailVerification";
import { AdminRoleSwitcher } from "@/components/admin/AdminRoleSwitcher";
import { useUserRole } from "@/hooks/useUserRole";
import { SocialConnections } from "@/components/SocialConnections";

const Profile = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
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

  const [contractEndDate, setContractEndDate] = useState<Date | null>(null);
  const [hasIndefiniteContract, setHasIndefiniteContract] = useState(false);

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

  const [preferredCurrency, setPreferredCurrency] = useState<'EUR' | 'USD' | 'GBP' | 'AED'>('EUR');

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

  // Music connections
  const [musicConnections, setMusicConnections] = useState({
    spotifyConnected: false,
    appleMusicConnected: false,
    spotifyPlaylists: [] as any[],
    appleMusicPlaylists: [] as any[],
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
  const [emailVerified, setEmailVerified] = useState(false);
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
          email_verified: emailVerified,
          location: profileData.location,
          current_title: profileData.currentTitle,
          linkedin_url: profileData.linkedin,
          notice_period: profileData.noticePeriod,
          contract_end_date: contractEndDate?.toISOString(),
          has_indefinite_contract: hasIndefiniteContract,
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
        } as any)
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

  const handleCurrencyChange = async (currency: 'EUR' | 'USD' | 'GBP' | 'AED') => {
    setPreferredCurrency(currency);
    
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_currency: currency })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success(`Currency preference updated to ${currency}`);
    } catch (error) {
      console.error('Error updating currency:', error);
      toast.error('Failed to update currency preference');
    }
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

  const handleEmailVerificationComplete = () => {
    setEmailVerified(true);
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

        setContractEndDate((data as any).contract_end_date ? new Date((data as any).contract_end_date) : null);
        setHasIndefiniteContract((data as any).has_indefinite_contract || false);

        setCurrentSalaryRange([
          data.current_salary_min || 150000,
          data.current_salary_max || 180000
        ]);
        setDesiredSalaryRange([
          data.desired_salary_min || 200000,
          data.desired_salary_max || 250000
        ]);
        setBlockedCompanies((data.blocked_companies as string[]) || []);

        // Set privacy settings if they exist
        if (data.privacy_settings) {
          setPrivacySettings(data.privacy_settings as any);
        }
        
        // Set preferred currency
        if (data.preferred_currency) {
          setPreferredCurrency(data.preferred_currency as any);
        }
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
          
          // Load avatar URL
          setAvatarUrl(data.avatar_url || null);
          
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
          if (data.email_verified) {
            setEmailVerified(data.email_verified);
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

          // Load music connections
          setMusicConnections({
            spotifyConnected: (data as any).spotify_connected || false,
            appleMusicConnected: (data as any).apple_music_connected || false,
            spotifyPlaylists: (data as any).spotify_playlists || [],
            appleMusicPlaylists: (data as any).apple_music_playlists || [],
          });

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

  const handleConnectCalendar = async (provider: 'google' | 'microsoft' | 'apple') => {
    // Apple Calendar support coming soon
    if (provider === 'apple') {
      toast.info('Apple Calendar integration coming soon', {
        description: 'We\'re working on adding Apple Calendar support. Use Google or Microsoft Calendar for now.'
      });
      return;
    }
    
    const label = prompt(
      `Name this calendar connection (e.g., "Personal", "Work", "Company Name"):`
    );
    
    if (!label || !label.trim()) {
      toast.error('Calendar label is required');
      return;
    }

    try {
      setCalendarLoading(true);
      
      const redirectUri = `${window.location.origin}/settings`;
      console.log(`[Calendar] Connecting ${provider} with redirect URI:`, redirectUri);
      
      const functionName = provider === 'google' ? 'google-calendar-auth' : 'microsoft-calendar-auth';
      
      // Store the label and provider for after OAuth redirect
      localStorage.setItem('pending_calendar_connection', JSON.stringify({ 
        provider, 
        label: label.trim() 
      }));
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'getAuthUrl', redirectUri }
      });

      if (error) {
        console.error(`[Calendar] ${provider} auth error:`, error);
        throw error;
      }
      
      if (!data || !data.authUrl) {
        console.error(`[Calendar] No auth URL returned from ${provider}`);
        throw new Error('No authentication URL received');
      }

      console.log(`[Calendar] Redirecting to ${provider} OAuth...`);
      // Redirect to OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error(`[Calendar] ${provider} Calendar connection error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to connect ${provider === 'google' ? 'Google' : 'Microsoft'} Calendar: ${errorMessage}`);
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
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    // Handle OAuth errors
    if (error) {
      const pendingConnection = localStorage.getItem('pending_calendar_connection');
      if (pendingConnection) {
        const { provider } = JSON.parse(pendingConnection);
        const providerName = provider === 'google' ? 'Google' : 'Microsoft';
        
        let errorMessage = `${providerName} Calendar connection failed`;
        if (error === 'access_denied') {
          errorMessage = `You denied access to ${providerName} Calendar`;
        } else if (errorDescription) {
          errorMessage = `${providerName} Calendar: ${errorDescription}`;
        }
        
        toast.error(errorMessage);
        localStorage.removeItem('pending_calendar_connection');
        window.history.replaceState({}, document.title, '/settings');
      }
      return;
    }
    
    if (code) {
      (async () => {
        try {
          const pendingConnection = localStorage.getItem('pending_calendar_connection');
          if (pendingConnection) {
            const { provider, label } = JSON.parse(pendingConnection);
            const redirectUri = `${window.location.origin}/settings`;
            
            let token: string;
            let email: string = 'Calendar Account';

            if (provider === 'google') {
              const { data, error: invocationError } = await supabase.functions.invoke('google-calendar-auth', {
                body: { action: 'exchangeCode', code, redirectUri }
              });

              if (invocationError) {
                console.error('Google Calendar auth error:', invocationError);
                throw new Error(invocationError.message || 'Failed to authenticate with Google Calendar');
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
              
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
              const { data, error: invocationError } = await supabase.functions.invoke('microsoft-calendar-auth', {
                body: { action: 'exchangeCode', code, redirectUri }
              });

              if (invocationError) {
                console.error('Microsoft Calendar auth error:', invocationError);
                throw new Error(invocationError.message || 'Failed to authenticate with Microsoft Calendar');
              }
              
              if (data.error) {
                throw new Error(data.error);
              }
              
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
            window.history.replaceState({}, document.title, '/settings');
            
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
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Profile & Settings</h1>
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
          {/* Role Switcher (only shows if user has multiple roles) */}
          <AdminRoleSwitcher />
          
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

          {/* Social Connections */}
          <SocialConnections
            socialConnections={socialConnections}
            musicConnections={musicConnections}
            onUpdate={async () => {
              const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
              
              if (data) {
                setMusicConnections({
                  spotifyConnected: (data as any).spotify_connected || false,
                  appleMusicConnected: (data as any).apple_music_connected || false,
                  spotifyPlaylists: (data as any).spotify_playlists || [],
                  appleMusicPlaylists: (data as any).apple_music_playlists || [],
                });
                
                // Update social connections
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
              }
            }}
            onConnectSocial={handleConnectSocial}
            onDisconnectSocial={handleDisconnectSocial}
          />

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

              <div className="space-y-3">
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

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Current Contract End Date</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="indefinite-contract"
                      checked={hasIndefiniteContract}
                      onCheckedChange={(checked) => {
                        setHasIndefiniteContract(checked);
                        if (checked) setContractEndDate(null);
                        debouncedSave();
                      }}
                    />
                    <Label htmlFor="indefinite-contract" className="text-sm font-normal cursor-pointer">
                      Indefinite Contract
                    </Label>
                  </div>
                </div>

                {hasIndefiniteContract ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Indefinite Contract - No fixed end date
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="date"
                      value={contractEndDate ? contractEndDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        setContractEndDate(date);
                        debouncedSave();
                      }}
                      className="bg-background/50"
                      placeholder="Select contract end date"
                    />
                    {contractEndDate && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">Contract ends: </span>
                          <span className="font-medium text-foreground">
                            {contractEndDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  <Button
                    type="button"
                    onClick={() => handleConnectCalendar('apple')}
                    disabled={calendarLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {calendarLoading ? 'Connecting...' : 'Add Apple Calendar'}
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

              <Separator className="my-6" />

              {/* Currency Preference */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-accent" />
                  <h4 className="font-semibold">Currency Preference</h4>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">Display Currency</Label>
                  <Select
                    value={preferredCurrency}
                    onValueChange={handleCurrencyChange}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                      <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                      <SelectItem value="AED">AED (د.إ) - UAE Dirham</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Job salaries will be automatically converted to your preferred currency
                  </p>
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
    </AppLayout>
  );
};

export default Profile;
