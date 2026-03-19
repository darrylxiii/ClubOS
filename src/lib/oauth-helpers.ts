import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth helper — LinkedIn only.
 * Google and Apple now use Lovable Cloud managed auth via lovable.auth.signInWithOAuth().
 */

const ALLOWED_OAUTH_HOSTS = [
  'www.linkedin.com',
  'linkedin.com',
];

const validateOAuthUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_OAUTH_HOSTS.some(host => parsed.hostname.includes(host)) ||
      parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

/**
 * Detects whether the app is running on a custom domain.
 */
export const isCustomDomain = (): boolean =>
  !window.location.hostname.includes('lovable.app') &&
  !window.location.hostname.includes('lovableproject.com') &&
  !window.location.hostname.includes('localhost');

interface LinkedInOAuthOptions {
  provider: 'linkedin_oidc';
  redirectTo: string;
  scopes?: string;
}

/**
 * Initiates LinkedIn OAuth with custom-domain awareness.
 * On custom domains, uses skipBrowserRedirect to bypass the auth-bridge.
 */
export const signInWithOAuthCustomDomain = async (options: LinkedInOAuthOptions) => {
  const { provider, redirectTo, scopes } = options;

  if (isCustomDomain()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes,
      },
    });

    if (error) throw error;

    if (data?.url) {
      if (!validateOAuthUrl(data.url)) {
        throw new Error('Invalid OAuth redirect URL');
      }
      window.location.href = data.url;
    } else {
      throw new Error('No OAuth URL returned');
    }
  } else {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes,
      },
    });

    if (error) throw error;
  }
};
