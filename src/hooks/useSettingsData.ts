import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

export interface PrivacySettings {
  share_full_name: boolean;
  share_email: boolean;
  share_phone: boolean;
  share_location: boolean;
  share_current_title: boolean;
  share_linkedin_url: boolean;
  share_career_preferences: boolean;
  share_resume: boolean;
  share_salary_expectations: boolean;
  share_notice_period: boolean;
}

export interface SocialConnections {
  linkedin: boolean;
  instagram: boolean;
  twitter: boolean;
  github: boolean;
  instagramUsername: string;
  twitterUsername: string;
  githubUsername: string;
}

export interface MusicConnections {
  spotifyConnected: boolean;
  appleMusicConnected: boolean;
  spotifyPlaylists: unknown[];
  appleMusicPlaylists: unknown[];
}

export interface SettingsProfile {
  id: string;
  full_name?: string | null;
  current_title?: string | null;
  career_preferences?: string | null;
  current_salary_min?: number | null;
  avatar_url?: string | null;
  [key: string]: unknown;
}

export interface SettingsState {
  // Profile
  profile: SettingsProfile | null;
  fullName: string;
  currentTitle: string;
  bio: string;
  locationCity: string;
  phoneNumber: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  linkedinUrl: string;
  preferredWorkLocations: string[];
  remoteWorkPreference: boolean;
  cities: Array<{ id: string; name: string; country: string }>;

  // Compensation
  employmentType: 'fulltime' | 'freelance' | 'both';
  currentSalaryRange: [number, number];
  desiredSalaryRange: [number, number];
  freelanceHourlyRate: [number, number];
  fulltimeHoursPerWeek: [number, number];
  freelanceHoursPerWeek: [number, number];
  noticePeriod: string;
  contractEndDate: Date | null;
  hasIndefiniteContract: boolean;

  // Privacy
  blockedCompanies: string[];
  companySearchQuery: string;
  stealthModeEnabled: boolean;
  stealthModeLevel: number;
  allowStealthColdOutreach: boolean;
  privacySettings: PrivacySettings;

  // Social & Music
  socialConnections: SocialConnections;
  musicConnections: MusicConnections;

  // Preferences
  preferredCurrency: 'EUR' | 'USD' | 'GBP' | 'AED' | 'BTC' | 'ETH';
  preferredLanguage: string;
  jobAlertFrequency: string;
  companySizePreference: string;
  industryPreference: string;
  workTimezone: string;
  availableHoursPerWeek: number;

  // Meta
  loading: boolean;
  saving: boolean;
}

const DEFAULT_PRIVACY: PrivacySettings = {
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
};

export function useSettingsData(user: User | null, i18n: { language: string; changeLanguage: (lang: string) => Promise<void> }) {
  const [state, setState] = useState<SettingsState>({
    profile: null,
    fullName: "",
    currentTitle: "",
    bio: "",
    locationCity: "",
    phoneNumber: "",
    phoneVerified: false,
    emailVerified: false,
    linkedinUrl: "",
    preferredWorkLocations: [],
    remoteWorkPreference: false,
    cities: [],
    employmentType: 'fulltime',
    currentSalaryRange: [150000, 180000],
    desiredSalaryRange: [200000, 250000],
    freelanceHourlyRate: [100, 200],
    fulltimeHoursPerWeek: [35, 45],
    freelanceHoursPerWeek: [15, 25],
    noticePeriod: "2_weeks",
    contractEndDate: null,
    hasIndefiniteContract: false,
    blockedCompanies: [],
    companySearchQuery: "",
    stealthModeEnabled: false,
    stealthModeLevel: 1,
    allowStealthColdOutreach: true,
    privacySettings: DEFAULT_PRIVACY,
    socialConnections: {
      linkedin: false, instagram: false, twitter: false, github: false,
      instagramUsername: '', twitterUsername: '', githubUsername: '',
    },
    musicConnections: {
      spotifyConnected: false, appleMusicConnected: false,
      spotifyPlaylists: [], appleMusicPlaylists: [],
    },
    preferredCurrency: 'EUR',
    preferredLanguage: 'en',
    jobAlertFrequency: 'daily',
    companySizePreference: 'any',
    industryPreference: 'any',
    workTimezone: 'Europe/Amsterdam',
    availableHoursPerWeek: 40,
    loading: true,
    saving: false,
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Helper to update specific fields
  const updateField = useCallback(<K extends keyof SettingsState>(field: K, value: SettingsState[K]) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateFields = useCallback((updates: Partial<SettingsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const profileData = data as Record<string, unknown>;
        const userLanguage = (profileData.preferred_language as string) || 'en';
        if (i18n.language !== userLanguage) {
          i18n.changeLanguage(userLanguage);
        }

        setState(prev => ({
          ...prev,
          profile: data as unknown as SettingsProfile,
          fullName: data.full_name || '',
          currentTitle: data.current_title || '',
          bio: data.career_preferences || '',
          locationCity: data.location || '',
          phoneNumber: data.phone || '',
          phoneVerified: data.phone_verified || false,
          emailVerified: data.email_verified || false,
          linkedinUrl: data.linkedin_url || '',
          preferredWorkLocations: (data.preferred_work_locations as string[]) || [],
          remoteWorkPreference: data.remote_work_preference || false,
          employmentType: (data.employment_type_preference as 'fulltime' | 'freelance' | 'both') || 'fulltime',
          currentSalaryRange: [data.current_salary_min || 150000, data.current_salary_max || 180000],
          desiredSalaryRange: [data.desired_salary_min || 200000, data.desired_salary_max || 250000],
          freelanceHourlyRate: [data.freelance_hourly_rate_min || 100, data.freelance_hourly_rate_max || 200],
          fulltimeHoursPerWeek: [data.fulltime_hours_per_week_min || 35, data.fulltime_hours_per_week_max || 45],
          freelanceHoursPerWeek: [data.freelance_hours_per_week_min || 15, data.freelance_hours_per_week_max || 25],
          noticePeriod: data.notice_period || '2_weeks',
          contractEndDate: (profileData.contract_end_date as string) ? new Date(profileData.contract_end_date as string) : null,
          hasIndefiniteContract: (profileData.has_indefinite_contract as boolean) || false,
          blockedCompanies: (data.blocked_companies as string[]) || [],
          stealthModeEnabled: data.stealth_mode_enabled || false,
          stealthModeLevel: data.stealth_mode_level || 1,
          allowStealthColdOutreach: data.allow_stealth_cold_outreach !== false,
          privacySettings: (data.privacy_settings as unknown as PrivacySettings) || DEFAULT_PRIVACY,
          preferredCurrency: (data.preferred_currency as SettingsState['preferredCurrency']) || 'EUR',
          preferredLanguage: userLanguage,
          jobAlertFrequency: data.job_alert_frequency || 'daily',
          companySizePreference: data.company_size_preference || 'any',
          industryPreference: data.industry_preference || 'any',
          workTimezone: data.work_timezone || 'Europe/Amsterdam',
          availableHoursPerWeek: data.available_hours_per_week || 40,
          socialConnections: {
            linkedin: data.linkedin_connected || false,
            instagram: data.instagram_connected || false,
            instagramUsername: data.instagram_username || '',
            twitter: data.twitter_connected || false,
            twitterUsername: data.twitter_username || '',
            github: data.github_connected || false,
            githubUsername: data.github_username || '',
          },
          musicConnections: {
            spotifyConnected: (profileData.spotify_connected as boolean) || false,
            appleMusicConnected: (profileData.apple_music_connected as boolean) || false,
            spotifyPlaylists: (profileData.spotify_playlists as unknown[]) || [],
            appleMusicPlaylists: (profileData.apple_music_playlists as unknown[]) || [],
          },
        }));
      }
    } catch (error: unknown) {
      logger.error('Error loading profile:', { error });
      toast.error('Failed to load profile');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user, i18n]);

  const loadCities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, country')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      if (data) {
        setState(prev => ({ ...prev, cities: data }));
      }
    } catch (error) {
      logger.error('Error loading cities:', { error });
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadCities();
  }, [loadProfile, loadCities]);

  const saveProfile = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, saving: true }));
    try {
      const updatePayload: Record<string, unknown> = {
        full_name: state.fullName,
        current_title: state.currentTitle,
        career_preferences: state.bio,
        location: state.locationCity,
        phone: state.phoneNumber,
        phone_verified: state.phoneVerified,
        email_verified: state.emailVerified,
        linkedin_url: state.linkedinUrl,
        preferred_work_locations: state.preferredWorkLocations,
        remote_work_preference: state.remoteWorkPreference,
        employment_type_preference: state.employmentType,
        current_salary_min: state.currentSalaryRange[0],
        current_salary_max: state.currentSalaryRange[1],
        desired_salary_min: state.desiredSalaryRange[0],
        desired_salary_max: state.desiredSalaryRange[1],
        freelance_hourly_rate_min: state.freelanceHourlyRate[0],
        freelance_hourly_rate_max: state.freelanceHourlyRate[1],
        fulltime_hours_per_week_min: state.fulltimeHoursPerWeek[0],
        fulltime_hours_per_week_max: state.fulltimeHoursPerWeek[1],
        freelance_hours_per_week_min: state.freelanceHoursPerWeek[0],
        freelance_hours_per_week_max: state.freelanceHoursPerWeek[1],
        notice_period: state.noticePeriod,
        contract_end_date: state.contractEndDate?.toISOString(),
        has_indefinite_contract: state.hasIndefiniteContract,
        blocked_companies: state.blockedCompanies,
        stealth_mode_enabled: state.stealthModeEnabled,
        stealth_mode_level: state.stealthModeLevel,
        allow_stealth_cold_outreach: state.allowStealthColdOutreach,
        privacy_settings: state.privacySettings,
        preferred_currency: state.preferredCurrency,
        preferred_language: state.preferredLanguage,
        job_alert_frequency: state.jobAlertFrequency,
        company_size_preference: state.companySizePreference,
        industry_preference: state.industryPreference,
        work_timezone: state.workTimezone,
        available_hours_per_week: state.availableHoursPerWeek,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload as Record<string, unknown>)
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (error: unknown) {
      logger.error('Error saving profile:', { error });
      toast.error('Failed to save settings');
    } finally {
      setState(prev => ({ ...prev, saving: false }));
    }
  }, [user, state]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveProfile();
    }, 1000);
  }, [saveProfile]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handlePrivacyToggle = useCallback((setting: string) => {
    setState(prev => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        [setting]: !(prev.privacySettings as unknown as Record<string, boolean>)[setting],
      },
    }));
    debouncedSave();
  }, [debouncedSave]);

  const handleExportData = useCallback(async () => {
    if (!user) return;
    toast.success('Preparing your data export...');
    try {
      const { error } = await supabase
        .from('profile_data_exports')
        .insert({ user_id: user.id, export_status: 'pending' });
      if (error) throw error;
      toast.success("Data export requested. You'll receive an email when ready.");
    } catch (error: unknown) {
      logger.error('Error requesting export:', { error });
      toast.error('Failed to request data export');
    }
  }, [user]);

  const handleCurrencyChange = useCallback(async (currency: SettingsState['preferredCurrency']) => {
    updateField('preferredCurrency', currency);
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_currency: currency })
        .eq('id', user.id);
      if (error) throw error;
      toast.success(`Currency preference updated to ${currency}`);
    } catch (error) {
      logger.error('Error updating currency:', { error });
      toast.error('Failed to update currency preference');
    }
  }, [user, updateField]);

  const handleDisconnectSocial = useCallback(async (platform: 'linkedin' | 'instagram' | 'twitter' | 'github') => {
    const updates: Record<string, unknown> = {};
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

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);
      if (error) throw error;
      setState(prev => ({
        ...prev,
        socialConnections: {
          ...prev.socialConnections,
          [platform]: false,
          [`${platform}Username`]: '',
        },
      }));
      toast.success(`${platform} disconnected`);
    } catch (error) {
      logger.error(`Error disconnecting ${platform}:`, { error });
      toast.error(`Failed to disconnect ${platform}`);
    }
  }, [user]);

  return {
    state,
    updateField,
    updateFields,
    saveProfile,
    debouncedSave,
    loadProfile,
    handlePrivacyToggle,
    handleExportData,
    handleCurrencyChange,
    handleDisconnectSocial,
  };
}
