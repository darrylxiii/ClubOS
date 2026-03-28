import { supabase } from "@/integrations/supabase/client";

/**
 * OAuth via supabase.auth.signInWithOAuth().
 * With skipBrowserRedirect we assign data.url — allow GoTrue host, IdPs, and VITE_SITE_URL alias.
 */

const IDP_HOSTS = new Set([
  'accounts.google.com',
  'appleid.apple.com',
  'www.linkedin.com',
  'linkedin.com',
]);

const validateOAuthUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.hostname.endsWith('.supabase.co')) return true;
    if (IDP_HOSTS.has(parsed.hostname)) return true;

    const base =
      import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SITE_URL;
    if (base) {
      const expectedHost = new URL(base).hostname;
      if (parsed.hostname === expectedHost) return true;
    }
    return false;
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
