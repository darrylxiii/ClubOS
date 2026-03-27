import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth helper — LinkedIn only.
 * Google and Apple use native Supabase Auth via supabase.auth.signInWithOAuth().
 */

const ALLOWED_OAUTH_HOSTS = [
  'www.linkedin.com',
  'linkedin.com',
];

const validateOAuthUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_OAUTH_HOSTS.includes(parsed.hostname) ||
      parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

/**
 * Detects whether the app is running on a custom domain.
 */
export const isCustomDomain = (): boolean =>
  !window.location.hostname.includes('localhost');

interface OAuthOptions {
  provider: 'linkedin_oidc' | 'google' | 'apple';
  redirectTo: string;
  scopes?: string;
  queryParams?: Record<string, string>;
}

/**
 * Initiates OAuth with custom-domain awareness.
 * On custom domains, uses skipBrowserRedirect to bypass the auth-bridge.
 */
export const signInWithOAuthCustomDomain = async (options: OAuthOptions) => {
  const { provider, redirectTo, scopes, queryParams } = options;

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
