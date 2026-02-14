import { supabase } from "@/integrations/supabase/client";

/**
 * Detects whether the app is running on a custom domain
 * (not lovable.app, lovableproject.com, or localhost).
 */
export const isCustomDomain = (): boolean =>
  !window.location.hostname.includes('lovable.app') &&
  !window.location.hostname.includes('lovableproject.com') &&
  !window.location.hostname.includes('localhost');

const ALLOWED_OAUTH_HOSTS = [
  'accounts.google.com',
  'appleid.apple.com',
  'www.linkedin.com',
  'linkedin.com',
];

/**
 * Validates that the OAuth URL points to a known provider.
 */
const validateOAuthUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_OAUTH_HOSTS.some(host => parsed.hostname.includes(host)) ||
      parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

type OAuthProvider = 'google' | 'apple' | 'linkedin_oidc';

interface CustomDomainOAuthOptions {
  provider: OAuthProvider;
  redirectTo: string;
  scopes?: string;
  queryParams?: Record<string, string>;
}

/**
 * Initiates OAuth with custom-domain awareness.
 * On custom domains, uses skipBrowserRedirect to bypass the auth-bridge
 * and manually redirects. On Lovable domains, uses the default flow.
 */
export const signInWithOAuthCustomDomain = async (options: CustomDomainOAuthOptions) => {
  const { provider, redirectTo, scopes, queryParams } = options;

  if (isCustomDomain()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes,
        queryParams,
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
    // Default flow — auth-bridge handles it on lovable.app
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes,
        queryParams,
      },
    });

    if (error) throw error;
  }
};
