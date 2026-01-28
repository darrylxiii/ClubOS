import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// Debounce map to prevent duplicate tracking within short time window
const viewTrackingDebounce = new Map<string, number>();
const DEBOUNCE_WINDOW_MS = 5000; // 5 seconds

interface TrackProfileViewOptions {
  profileId: string;
  viewerId: string;
  context?: {
    jobId?: string;
    source?: 'job_application' | 'search_results' | 'shortlist' | 'direct_link' | 'referral';
  };
}

/**
 * Track when a user views another user's profile
 * Implements debouncing to prevent duplicate tracking
 * Respects privacy settings and stealth mode
 */
export async function trackProfileView({
  profileId,
  viewerId,
  context = {}
}: TrackProfileViewOptions): Promise<void> {
  try {
    // Don't track if viewing own profile
    if (profileId === viewerId) {
      return;
    }

    // Debounce: Check if we've tracked this view recently
    const debounceKey = `${viewerId}-${profileId}`;
    const lastTracked = viewTrackingDebounce.get(debounceKey);
    const now = Date.now();

    if (lastTracked && now - lastTracked < DEBOUNCE_WINDOW_MS) {
      logger.debug('Profile view debounced - tracked recently', { componentName: 'ProfileViewTracking' });
      return;
    }

    // Get viewer's profile to check company
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', viewerId)
      .single();

    if (!viewerProfile) {
      logger.warn('Viewer profile not found', { componentName: 'ProfileViewTracking', viewerId });
      return;
    }

    // Get viewed profile to check privacy settings
    const { data: viewedProfile } = await supabase
      .from('profiles')
      .select('stealth_mode_enabled, company_id, blocked_companies')
      .eq('id', profileId)
      .single();

    // Respect stealth mode: don't track if viewer is from candidate's current company
    if (viewedProfile?.stealth_mode_enabled && 
        viewedProfile?.company_id && 
        viewerProfile.company_id === viewedProfile.company_id) {
      console.log('[Profile View] Blocked by stealth mode');
      return;
    }

    // Check if viewer's company is in blocked list
    const blockedCompanies = (viewedProfile?.blocked_companies as any[]) || [];
    if (viewerProfile.company_id && blockedCompanies.includes(viewerProfile.company_id)) {
      console.log('[Profile View] Blocked by blocked_companies list');
      return;
    }

    // Insert profile view record
    try {
      const { error: viewError } = await supabase
        .from('profile_views')
        .insert({
          viewed_user_id: profileId,
          viewer_user_id: viewerId,
          viewer_company_id: viewerProfile.company_id,
          is_anonymous: false,
          viewed_at: new Date().toISOString()
        });

      if (viewError) {
        // Log but don't throw - tracking should not break user experience
        logger.warn('Error inserting profile view', { 
          componentName: 'ProfileViewTracking', 
          error: viewError.message,
          profileId,
          viewerId 
        });
        return;
      }
    } catch (insertError) {
      logger.warn('Exception inserting profile view', { 
        componentName: 'ProfileViewTracking', 
        error: insertError 
      });
      return;
    }

    // Update debounce map
    viewTrackingDebounce.set(debounceKey, now);

    // Clean up old debounce entries (older than 1 minute)
    for (const [key, timestamp] of viewTrackingDebounce.entries()) {
      if (now - timestamp > 60000) {
        viewTrackingDebounce.delete(key);
      }
    }

    console.log('[Profile View] Successfully tracked view', {
      profileId,
      viewerId,
      context
    });
  } catch (error) {
    // Fail silently - don't break user experience if tracking fails
    console.error('[Profile View] Error in trackProfileView:', error);
  }
}

/**
 * Get profile viewers for a specific profile
 * Used in "Who's Viewing You" section
 */
export async function getProfileViewers(profileId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('profile_views')
      .select(`
        *,
        viewer:profiles!viewer_user_id(
          id,
          full_name,
          avatar_url,
          current_title,
          company_id
        ),
        company:companies!viewer_company_id(
          id,
          name,
          logo_url
        )
      `)
      .eq('viewed_user_id', profileId)
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Profile View] Error fetching viewers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[Profile View] Error in getProfileViewers:', error);
    return [];
  }
}
