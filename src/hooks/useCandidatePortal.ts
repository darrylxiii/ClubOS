import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CompanyBranding {
  company_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_light_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  font_heading: string;
  font_body: string;
}

interface PortalSettings {
  videoWelcomeUrl: string | null;
  cultureDescription: string;
  cultureHighlights: { icon: string; text: string }[];
  slaFeedbackHours: number;
  stageNotifications: Record<string, boolean>;
}

interface FeedbackSLAData {
  rate: number;
  weeklyTrend: number[];
  candidatesWaiting: number;
}

const DEFAULT_BRANDING: CompanyBranding = {
  company_id: '',
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  accent_color: '#ec4899',
  logo_light_url: null,
  logo_dark_url: null,
  favicon_url: null,
  font_heading: 'Inter',
  font_body: 'Inter',
};

const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  videoWelcomeUrl: null,
  cultureDescription: '',
  cultureHighlights: [],
  slaFeedbackHours: 24,
  stageNotifications: {
    applied: true,
    screening: true,
    interview: true,
    offer: true,
    hired: true,
  },
};

const DEFAULT_FEEDBACK_SLA: FeedbackSLAData = {
  rate: 0,
  weeklyTrend: [],
  candidatesWaiting: 0,
};

export function useCandidatePortal(companyId: string | null) {
  // Fetch company branding
  const {
    data: branding,
    isLoading: brandingLoading,
  } = useQuery({
    queryKey: ['candidate-portal-branding', companyId],
    queryFn: async () => {
      if (!companyId) return DEFAULT_BRANDING;
      try {
        const { data, error } = await supabase
          .from('company_branding')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        if (!data) return { ...DEFAULT_BRANDING, company_id: companyId };

        return {
          company_id: data.company_id,
          primary_color: data.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: data.secondary_color || DEFAULT_BRANDING.secondary_color,
          accent_color: data.accent_color || DEFAULT_BRANDING.accent_color,
          logo_light_url: data.logo_light_url || null,
          logo_dark_url: data.logo_dark_url || null,
          favicon_url: data.favicon_url || null,
          font_heading: data.font_heading || DEFAULT_BRANDING.font_heading,
          font_body: data.font_body || DEFAULT_BRANDING.font_body,
        } as CompanyBranding;
      } catch (err) {
        console.error('Error fetching portal branding:', err);
        return { ...DEFAULT_BRANDING, company_id: companyId };
      }
    },
    enabled: !!companyId,
  });

  // Fetch active portal settings (from partner_sla_config + company metadata)
  const {
    data: portalSettings,
    isLoading: portalLoading,
  } = useQuery({
    queryKey: ['candidate-portal-settings', companyId],
    queryFn: async () => {
      if (!companyId) return DEFAULT_PORTAL_SETTINGS;
      try {
        const { data: slaConfig } = await supabase
          .from('partner_sla_config')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();

        const { data: company } = await supabase
          .from('companies')
          .select('description, metadata')
          .eq('id', companyId)
          .maybeSingle();

        const metadata = (company?.metadata ?? {}) as Record<string, unknown>;
        const cultureHighlights = Array.isArray(metadata.culture_highlights)
          ? metadata.culture_highlights as { icon: string; text: string }[]
          : [];

        return {
          videoWelcomeUrl: (metadata.video_welcome_url as string) || null,
          cultureDescription: company?.description || '',
          cultureHighlights,
          slaFeedbackHours: slaConfig?.response_time_hours ?? 24,
          stageNotifications: (metadata.stage_notifications as Record<string, boolean>) || DEFAULT_PORTAL_SETTINGS.stageNotifications,
        } as PortalSettings;
      } catch (err) {
        console.error('Error fetching portal settings:', err);
        return DEFAULT_PORTAL_SETTINGS;
      }
    },
    enabled: !!companyId,
  });

  // Track feedback SLA compliance
  const {
    data: feedbackSLAData,
    isLoading: slaLoading,
  } = useQuery({
    queryKey: ['candidate-portal-feedback-sla', companyId],
    queryFn: async () => {
      if (!companyId) return DEFAULT_FEEDBACK_SLA;
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: slaMetrics } = await supabase
          .from('partner_sla_tracking')
          .select('*')
          .eq('company_id', companyId)
          .eq('metric_type', 'response_time')
          .gte('measured_at', thirtyDaysAgo)
          .order('measured_at', { ascending: true });

        const metrics = slaMetrics || [];
        const total = metrics.length;
        const met = metrics.filter((m: any) => m.is_met).length;
        const rate = total > 0 ? Math.round((met / total) * 100) : 0;

        // Build weekly trend (last 8 weeks)
        const weeklyTrend: number[] = [];
        for (let w = 7; w >= 0; w--) {
          const weekStart = new Date(Date.now() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(Date.now() - w * 7 * 24 * 60 * 60 * 1000);
          const weekMetrics = metrics.filter((m: any) => {
            const d = new Date(m.measured_at);
            return d >= weekStart && d < weekEnd;
          });
          const weekTotal = weekMetrics.length;
          const weekMet = weekMetrics.filter((m: any) => m.is_met).length;
          weeklyTrend.push(weekTotal > 0 ? Math.round((weekMet / weekTotal) * 100) : 0);
        }

        // Candidates waiting: applications without feedback beyond SLA window
        const slaHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'active')
          .lt('created_at', slaHoursAgo)
          .is('feedback_sent_at' as any, null);

        return {
          rate,
          weeklyTrend,
          candidatesWaiting: count ?? 0,
        } as FeedbackSLAData;
      } catch (err) {
        console.error('Error fetching feedback SLA data:', err);
        return DEFAULT_FEEDBACK_SLA;
      }
    },
    enabled: !!companyId,
  });

  return {
    branding: branding ?? DEFAULT_BRANDING,
    portalSettings: portalSettings ?? DEFAULT_PORTAL_SETTINGS,
    feedbackSLARate: feedbackSLAData?.rate ?? 0,
    feedbackSLAWeeklyTrend: feedbackSLAData?.weeklyTrend ?? [],
    candidatesWaiting: feedbackSLAData?.candidatesWaiting ?? 0,
    isLoading: brandingLoading || portalLoading || slaLoading,
  };
}
